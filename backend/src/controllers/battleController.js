const crypto = require('crypto');
const prisma = require('../config/db');
const { addExperience } = require('../services/levelService');
const { getBotWithSkin } = require('../services/botService');
const { createNotification } = require('../services/notificationService');

let io = null;
function setIo(instance) {
  io = instance;
}

async function fetchSkinSummary(id) {
  if (!id) return null;
  return prisma.skin.findUnique({
    where: { id },
    select: { id: true, name: true, weapon: true, imageUrl: true, price: true, rarity: true },
  });
}

async function createBattle(req, res) {
  try {
    const userId = req.userId;
    const skinId = parseInt(req.body.skinId);
    const betType = req.body.betType || 'skin';

    if (!skinId) return res.status(400).json({ error: 'skinId requerido' });

    const userSkin = await prisma.userSkin.findUnique({
      where: { userId_skinId: { userId, skinId } },
    });
    if (!userSkin) return res.status(400).json({ error: 'No posees esta skin' });

    const seed = crypto.randomUUID();

    const battle = await prisma.battle.create({
      data: {
        playerAId: userId,
        skinAId: skinId,
        status: 'waiting',
        seed,
        betType,
      },
      include: {
        playerA: { select: { id: true, username: true } },
      },
    });

    const skinA = await fetchSkinSummary(battle.skinAId);
    const payload = { ...battle, skinA };

    if (io) io.to('lobby').emit('battle:created', payload);

    res.status(201).json(payload);
  } catch (err) {
    console.error('[createBattle]', err);
    res.status(500).json({ error: 'Error al crear batalla' });
  }
}

async function joinBattleInternal(battleId, userId, skinId) {
  const userSkin = await prisma.userSkin.findUnique({
    where: { userId_skinId: { userId, skinId } },
  });
  if (!userSkin) throw new Error('El jugador no posee esta skin');

  const updated = await prisma.battle.update({
    where: { id: battleId },
    data: { playerBId: userId, skinBId: skinId, status: 'in_progress' },
  });

  return resolveBattle(updated);
}

async function joinBattle(req, res) {
  try {
    const userId = req.userId;
    const battleId = parseInt(req.params.id);
    const skinId = parseInt(req.body.skinId);

    if (!skinId) return res.status(400).json({ error: 'skinId requerido' });

    const battle = await prisma.battle.findUnique({ where: { id: battleId } });
    if (!battle) return res.status(404).json({ error: 'Batalla no encontrada' });
    if (battle.status !== 'waiting') {
      return res.status(400).json({ error: 'Batalla no disponible' });
    }
    if (battle.playerAId === userId) {
      return res.status(400).json({ error: 'No puedes unirte a tu propia batalla' });
    }

    const userSkin = await prisma.userSkin.findUnique({
      where: { userId_skinId: { userId, skinId } },
    });
    if (!userSkin) return res.status(400).json({ error: 'No posees esta skin' });

    const updated = await prisma.battle.update({
      where: { id: battleId },
      data: { playerBId: userId, skinBId: skinId, status: 'in_progress' },
    });

    const joiner = await prisma.user.findUnique({ where: { id: userId }, select: { username: true, isBot: true } });
    if (joiner && !joiner.isBot) {
      createNotification(
        battle.playerAId,
        'battle_joined',
        'Rival encontrado',
        `${joiner.username} se unió a tu batalla`,
        { battleId },
        io,
      ).catch(() => {});
    }

    const resolved = await resolveBattle(updated);
    res.json(resolved);
  } catch (err) {
    console.error('[joinBattle]', err);
    res.status(500).json({ error: 'Error al unirse a batalla' });
  }
}

async function callBot(req, res) {
  try {
    const userId = req.userId;
    const battleId = parseInt(req.params.id);

    const battle = await prisma.battle.findUnique({ where: { id: battleId } });
    if (!battle) return res.status(404).json({ error: 'Batalla no encontrada' });
    if (battle.status !== 'waiting') return res.status(400).json({ error: 'Batalla no disponible' });
    if (battle.playerAId !== userId) return res.status(403).json({ error: 'No eres el creador de esta batalla' });

    const botData = await getBotWithSkin(prisma);
    if (!botData) return res.status(503).json({ error: 'No hay bots disponibles en este momento' });

    const { bot, skin } = botData;
    const resolved = await joinBattleInternal(battleId, bot.id, skin.id);

    res.json({ ...resolved, joinedByBot: true });
  } catch (err) {
    console.error('[callBot]', err);
    res.status(500).json({ error: 'Error al llamar bot' });
  }
}

async function resolveBattle(battle) {
  const result =
    parseInt(battle.seed.substring(0, 8), 16) % 2 === 0 ? 'heads' : 'tails';
  const winnerId = result === 'heads' ? battle.playerAId : battle.playerBId;
  const loserId = winnerId === battle.playerAId ? battle.playerBId : battle.playerAId;

  const skinIds = [battle.skinAId, battle.skinBId];

  await prisma.userSkin.deleteMany({
    where: { userId: loserId, skinId: { in: skinIds } },
  });
  await prisma.userSkin.deleteMany({
    where: { userId: winnerId, skinId: { in: skinIds } },
  });
  for (const sid of skinIds) {
    await prisma.userSkin.create({
      data: { userId: winnerId, skinId: sid },
    });
  }

  const [winnerUser, loserUser, skinA, skinB] = await Promise.all([
    prisma.user.findUnique({
      where: { id: winnerId },
      select: { id: true, username: true },
    }),
    prisma.user.findUnique({
      where: { id: loserId },
      select: { id: true, username: true },
    }),
    fetchSkinSummary(battle.skinAId),
    fetchSkinSummary(battle.skinBId),
  ]);

  const winnerLostSkinValue =
    winnerId === battle.playerAId ? skinB?.price || 0 : skinA?.price || 0;
  const loserOwnSkinValue =
    loserId === battle.playerAId ? skinA?.price || 0 : skinB?.price || 0;

  await prisma.transaction.create({
    data: {
      userId: winnerId,
      type: 'WIN',
      amount: winnerLostSkinValue,
      description: `Coinflip ganado vs ${loserUser.username}`,
    },
  });
  await prisma.transaction.create({
    data: {
      userId: loserId,
      type: 'LOSS',
      amount: -loserOwnSkinValue,
      description: `Coinflip perdido vs ${winnerUser.username}`,
    },
  });

  const finalBattle = await prisma.battle.update({
    where: { id: battle.id },
    data: {
      winnerId,
      result,
      status: 'completed',
      resolvedAt: new Date(),
    },
  });

  // XP por la skin perdida
  const levelUpdate = await addExperience(loserId, loserOwnSkinValue);
  if (io && levelUpdate?.leveledUp) {
    io.to(`user-${loserId}`).emit('user:leveled-up', {
      level: levelUpdate.level,
      xpGained: levelUpdate.xpGained,
      currentXp: levelUpdate.currentXp,
      xpNeeded: levelUpdate.xpNeeded,
    });
  }

  // Notificaciones
  const [winnerIsBot, loserIsBot] = await Promise.all([
    prisma.user.findUnique({ where: { id: winnerId }, select: { isBot: true } }),
    prisma.user.findUnique({ where: { id: loserId }, select: { isBot: true } }),
  ]);
  if (!winnerIsBot?.isBot) {
    createNotification(winnerId, 'battle_won', '¡Victoria!',
      `Ganaste ${skinA?.name} y ${skinB?.name}`,
      { battleId: battle.id }, io).catch(() => {});
  }
  if (!loserIsBot?.isBot) {
    const loserSkin = loserId === battle.playerAId ? skinA : skinB;
    createNotification(loserId, 'battle_lost', 'Derrota',
      `Perdiste ${loserSkin?.name}`,
      { battleId: battle.id }, io).catch(() => {});
  }

  const [playerA, playerB] = await Promise.all([
    prisma.user.findUnique({
      where: { id: battle.playerAId },
      select: { id: true, username: true },
    }),
    prisma.user.findUnique({
      where: { id: battle.playerBId },
      select: { id: true, username: true },
    }),
  ]);

  const payload = {
    battleId: battle.id,
    winnerId,
    winnerUsername: winnerUser.username,
    result,
    seed: battle.seed,
    skinA,
    skinB,
    playerA,
    playerB,
  };

  if (io) {
    io.to(`battle-${battle.id}`).emit('battle:resolved', payload);
    io.to('lobby').emit('battle:updated', { ...finalBattle, skinA, skinB, playerA, playerB });
  }

  return { battle: finalBattle, ...payload };
}

async function getBattles(req, res) {
  try {
    const battles = await prisma.battle.findMany({
      where: { status: 'waiting' },
      include: {
        playerA: { select: { id: true, username: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    const skinIds = battles.map((b) => b.skinAId);
    const skins = await prisma.skin.findMany({
      where: { id: { in: skinIds } },
      select: { id: true, name: true, imageUrl: true, price: true, rarity: true },
    });
    const skinMap = new Map(skins.map((s) => [s.id, s]));

    res.json(battles.map((b) => ({ ...b, skinA: skinMap.get(b.skinAId) || null })));
  } catch (err) {
    console.error('[getBattles]', err);
    res.status(500).json({ error: 'Error al obtener batallas' });
  }
}

async function getBattleById(req, res) {
  try {
    const id = parseInt(req.params.id);
    const battle = await prisma.battle.findUnique({
      where: { id },
      include: {
        playerA: { select: { id: true, username: true } },
        playerB: { select: { id: true, username: true } },
      },
    });
    if (!battle) return res.status(404).json({ error: 'Batalla no encontrada' });

    const [skinA, skinB] = await Promise.all([
      fetchSkinSummary(battle.skinAId),
      fetchSkinSummary(battle.skinBId),
    ]);

    res.json({ ...battle, skinA, skinB });
  } catch (err) {
    console.error('[getBattleById]', err);
    res.status(500).json({ error: 'Error al obtener batalla' });
  }
}

module.exports = {
  createBattle,
  joinBattle,
  callBot,
  resolveBattle,
  getBattles,
  getBattleById,
  setIo,
};
