const crypto = require('crypto');
const prisma = require('../config/db');
const { addExperience } = require('../services/levelService');
const { createNotification } = require('../services/notificationService');

const RESOLVE_DELAY_MS = 30 * 1000;

let io = null;
function setIo(instance) {
  io = instance;
}

// Estado del temporizador de la ronda actual
const timerState = {
  jackpotId: null,
  firstEntryAt: null,
  intervalId: null,
};

function clearTimerState() {
  if (timerState.intervalId) {
    clearInterval(timerState.intervalId);
  }
  timerState.jackpotId = null;
  timerState.firstEntryAt = null;
  timerState.intervalId = null;
}

function emitTimerTick() {
  if (!io || !timerState.firstEntryAt) return;
  const elapsed = Date.now() - timerState.firstEntryAt;
  const remaining = Math.max(0, Math.ceil((RESOLVE_DELAY_MS - elapsed) / 1000));
  io.to('jackpot').emit('jackpot:timer', {
    jackpotId: timerState.jackpotId,
    seconds: remaining,
  });
  if (remaining <= 0) {
    clearInterval(timerState.intervalId);
    timerState.intervalId = null;
    autoResolveIfReady().catch((err) => console.error('[autoResolve]', err));
  }
}

async function autoResolveIfReady() {
  if (!timerState.jackpotId) return;
  const jp = await loadJackpotFull(timerState.jackpotId);
  if (!jp || jp.status !== 'open') return;
  const distinct = new Set(jp.entries.map((e) => e.userId));
  if (distinct.size >= 2) {
    await resolveJackpot(jp);
  }
}

function startTimer(jackpotId) {
  clearTimerState();
  timerState.jackpotId = jackpotId;
  timerState.firstEntryAt = Date.now();
  emitTimerTick();
  timerState.intervalId = setInterval(emitTimerTick, 1000);
}

async function ensureOpenJackpot() {
  let jp = await prisma.jackpot.findFirst({ where: { status: 'open' } });
  if (!jp) {
    jp = await prisma.jackpot.create({ data: { status: 'open' } });
  }
  return jp;
}

async function loadJackpotFull(jackpotId) {
  const jackpot = await prisma.jackpot.findUnique({
    where: { id: jackpotId },
    include: {
      winner: { select: { id: true, username: true, avatar: true } },
      entries: {
        include: {
          user: { select: { id: true, username: true, avatar: true } },
          skin: { select: { id: true, name: true, weapon: true, imageUrl: true, price: true, rarity: true } },
        },
        orderBy: { createdAt: 'asc' },
      },
    },
  });
  if (!jackpot) return null;

  const totals = new Map();
  for (const e of jackpot.entries) {
    totals.set(e.userId, (totals.get(e.userId) || 0) + e.value);
  }
  const total = jackpot.totalValue || 0;
  const playerStats = [...totals.entries()].map(([userId, value]) => ({
    userId,
    value: Number(value.toFixed(2)),
    percentage: total > 0 ? Number(((value / total) * 100).toFixed(2)) : 0,
  }));

  return { ...jackpot, playerStats };
}

async function getCurrentJackpot(req, res) {
  try {
    const open = await ensureOpenJackpot();
    const full = await loadJackpotFull(open.id);
    res.json(full);
  } catch (err) {
    console.error('[getCurrentJackpot]', err);
    res.status(500).json({ error: 'Error al obtener jackpot actual' });
  }
}

async function addEntry(req, res) {
  try {
    const userId = req.userId;
    const skinId = parseInt(req.body.skinId);
    if (!skinId) return res.status(400).json({ error: 'skinId requerido' });

    const userSkin = await prisma.userSkin.findUnique({
      where: { userId_skinId: { userId, skinId } },
    });
    if (!userSkin) return res.status(400).json({ error: 'No posees esta skin' });

    let jackpot = await ensureOpenJackpot();
    if (jackpot.status !== 'open') {
      return res.status(400).json({ error: 'No hay jackpot abierto' });
    }

    const existing = await prisma.jackpotEntry.findFirst({
      where: { jackpotId: jackpot.id, userId, skinId },
    });
    if (existing) {
      return res.status(400).json({ error: 'Ya apostaste esta skin en este jackpot' });
    }

    const skin = await prisma.skin.findUnique({ where: { id: skinId } });
    if (!skin) return res.status(404).json({ error: 'Skin no encontrada' });

    const entry = await prisma.$transaction(async (tx) => {
      const created = await tx.jackpotEntry.create({
        data: {
          jackpotId: jackpot.id,
          userId,
          skinId,
          value: skin.price,
        },
        include: {
          user: { select: { id: true, username: true, avatar: true } },
          skin: { select: { id: true, name: true, weapon: true, imageUrl: true, price: true, rarity: true } },
        },
      });
      await tx.userSkin.delete({
        where: { userId_skinId: { userId, skinId } },
      });
      await tx.jackpot.update({
        where: { id: jackpot.id },
        data: { totalValue: { increment: skin.price } },
      });
      return created;
    });

    const refreshedJackpot = await loadJackpotFull(jackpot.id);

    if (io) io.to('jackpot').emit('jackpot:entry', { jackpotId: jackpot.id, entry, jackpot: refreshedJackpot });

    if (timerState.jackpotId !== jackpot.id || !timerState.firstEntryAt) {
      startTimer(jackpot.id);
    }

    const distinctPlayers = new Set(refreshedJackpot.entries.map((e) => e.userId));
    const elapsed = Date.now() - timerState.firstEntryAt;
    if (distinctPlayers.size >= 2 && elapsed >= RESOLVE_DELAY_MS) {
      await resolveJackpot(refreshedJackpot);
    }

    res.status(201).json(entry);
  } catch (err) {
    console.error('[addEntry]', err);
    res.status(500).json({ error: 'Error al añadir entry' });
  }
}

async function resolveJackpot(jackpot) {
  if (jackpot.status !== 'open') return jackpot;
  if (!jackpot.entries || jackpot.entries.length === 0) return jackpot;

  const seed = crypto.randomUUID();

  // Tickets ponderados por valor
  const tickets = [];
  for (const e of jackpot.entries) {
    const count = Math.max(1, Math.floor(e.value));
    for (let i = 0; i < count; i++) tickets.push(e.userId);
  }
  if (tickets.length === 0) return jackpot;

  const idx = parseInt(seed.substring(0, 8), 16) % tickets.length;
  const winnerId = tickets[idx];

  const winnerTickets = tickets.filter((u) => u === winnerId).length;
  const winnerChance = Number(((winnerTickets / tickets.length) * 100).toFixed(2));

  const skinIds = jackpot.entries.map((e) => e.skinId);

  await prisma.$transaction(async (tx) => {
    for (const sid of skinIds) {
      await tx.userSkin.deleteMany({ where: { userId: winnerId, skinId: sid } });
      await tx.userSkin.create({ data: { userId: winnerId, skinId: sid } });
    }
    await tx.jackpot.update({
      where: { id: jackpot.id },
      data: {
        status: 'completed',
        winnerId,
        seed,
        resolvedAt: new Date(),
      },
    });
  });

  const winnerUser = await prisma.user.findUnique({
    where: { id: winnerId },
    select: { id: true, username: true, avatar: true },
  });

  const skinCount = jackpot.entries.length;
  await prisma.transaction.create({
    data: {
      userId: winnerId,
      type: 'WIN',
      amount: jackpot.totalValue,
      description: `Jackpot ganado (${skinCount} skins)`,
    },
  });

  // Pérdidas por jugador (distinto al ganador)
  const losses = new Map();
  for (const e of jackpot.entries) {
    if (e.userId === winnerId) continue;
    losses.set(e.userId, (losses.get(e.userId) || 0) + e.value);
  }
  for (const [userId, lost] of losses.entries()) {
    await prisma.transaction.create({
      data: {
        userId,
        type: 'LOSS',
        amount: -Number(lost.toFixed(2)),
        description: `Jackpot perdido vs ${winnerUser.username}`,
      },
    });
    const levelUpdate = await addExperience(userId, lost);
    if (io && levelUpdate?.leveledUp) {
      io.to(`user-${userId}`).emit('user:leveled-up', {
        level: levelUpdate.level,
        xpGained: levelUpdate.xpGained,
        currentXp: levelUpdate.currentXp,
        xpNeeded: levelUpdate.xpNeeded,
      });
    }
  }

  const finalJackpot = await loadJackpotFull(jackpot.id);

  if (io) {
    io.to('jackpot').emit('jackpot:resolved', {
      jackpotId: jackpot.id,
      winnerId,
      winnerUsername: winnerUser.username,
      seed,
      totalValue: jackpot.totalValue,
      entries: finalJackpot.entries,
      winnerChance,
    });
  }

  // Notificación al ganador
  const winnerIsBot = await prisma.user.findUnique({ where: { id: winnerId }, select: { isBot: true } });
  if (!winnerIsBot?.isBot) {
    createNotification(winnerId, 'jackpot_won', '¡Jackpot!',
      `Ganaste el pot de ${jackpot.totalValue.toFixed(0)} coins`,
      { jackpotId: jackpot.id, totalValue: jackpot.totalValue }, io).catch(() => {});
  }

  clearTimerState();

  const newJackpot = await prisma.jackpot.create({ data: { status: 'open' } });
  const newJackpotFull = await loadJackpotFull(newJackpot.id);
  if (io) io.to('jackpot').emit('jackpot:new', newJackpotFull);

  return finalJackpot;
}

async function getJackpotHistory(req, res) {
  try {
    const history = await prisma.jackpot.findMany({
      where: { status: 'completed' },
      include: {
        winner: { select: { id: true, username: true, avatar: true } },
        entries: {
          include: {
            user: { select: { id: true, username: true, avatar: true } },
            skin: { select: { id: true, name: true, weapon: true, imageUrl: true, price: true, rarity: true } },
          },
        },
      },
      orderBy: { resolvedAt: 'desc' },
      take: 10,
    });
    res.json(history);
  } catch (err) {
    console.error('[getJackpotHistory]', err);
    res.status(500).json({ error: 'Error al obtener historial' });
  }
}

module.exports = {
  setIo,
  getCurrentJackpot,
  addEntry,
  resolveJackpot,
  getJackpotHistory,
};
