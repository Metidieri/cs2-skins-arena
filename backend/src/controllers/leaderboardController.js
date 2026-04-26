const prisma = require('../config/db');

const VALID_TYPES = new Set(['winrate', 'earnings', 'games']);

async function getLeaderboard(req, res) {
  try {
    const type = VALID_TYPES.has(req.query.type) ? req.query.type : 'earnings';

    // Cargamos todos los usuarios + sus transacciones (escala pequeña; OK para SQLite local)
    const users = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        avatar: true,
        transactions: { select: { type: true, amount: true } },
      },
    });

    const computed = users.map((u) => {
      const wins = u.transactions.filter((t) => t.type === 'WIN');
      const losses = u.transactions.filter((t) => t.type === 'LOSS');
      const totalEarnings = wins.reduce((s, t) => s + t.amount, 0);
      const totalGames = wins.length + losses.length;
      const winRate = totalGames > 0 ? Number(((wins.length / totalGames) * 100).toFixed(2)) : 0;
      return {
        user: { id: u.id, username: u.username, avatar: u.avatar },
        wins: wins.length,
        losses: losses.length,
        gamesPlayed: totalGames,
        winRate,
        totalEarnings: Number(totalEarnings.toFixed(2)),
      };
    });

    let filtered;
    if (type === 'winrate') {
      filtered = computed
        .filter((c) => c.gamesPlayed >= 5)
        .sort((a, b) => b.winRate - a.winRate);
    } else if (type === 'games') {
      filtered = computed.sort((a, b) => b.gamesPlayed - a.gamesPlayed);
    } else {
      filtered = computed.sort((a, b) => b.totalEarnings - a.totalEarnings);
    }

    const top = filtered.slice(0, 10).map((c, i) => {
      let stat;
      if (type === 'winrate') stat = c.winRate;
      else if (type === 'games') stat = c.gamesPlayed;
      else stat = c.totalEarnings;
      return {
        rank: i + 1,
        user: c.user,
        stat,
        gamesPlayed: c.gamesPlayed,
        winRate: c.winRate,
      };
    });

    res.json({ type, results: top });
  } catch (err) {
    console.error('[getLeaderboard]', err);
    res.status(500).json({ error: 'Error al obtener leaderboard' });
  }
}

async function getPublicProfile(req, res) {
  try {
    const username = req.params.username;
    const user = await prisma.user.findUnique({
      where: { username },
      select: {
        id: true,
        username: true,
        avatar: true,
        createdAt: true,
        transactions: { select: { type: true, amount: true } },
        inventory: {
          include: {
            skin: { select: { id: true, name: true, weapon: true, rarity: true, price: true, imageUrl: true } },
          },
        },
      },
    });
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

    const wins = user.transactions.filter((t) => t.type === 'WIN');
    const losses = user.transactions.filter((t) => t.type === 'LOSS');
    const totalEarnings = wins.reduce((s, t) => s + t.amount, 0);
    const totalGames = wins.length + losses.length;
    const winRate = totalGames > 0 ? Number(((wins.length / totalGames) * 100).toFixed(2)) : 0;
    const inventoryValue = user.inventory.reduce((s, us) => s + us.skin.price, 0);

    const recentBattles = await prisma.battle.findMany({
      where: {
        OR: [{ playerAId: user.id }, { playerBId: user.id }],
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: {
        playerA: { select: { id: true, username: true, avatar: true } },
        playerB: { select: { id: true, username: true, avatar: true } },
      },
    });

    res.json({
      user: {
        id: user.id,
        username: user.username,
        avatar: user.avatar,
        createdAt: user.createdAt,
      },
      stats: {
        wins: wins.length,
        losses: losses.length,
        winRate,
        totalEarnings: Number(totalEarnings.toFixed(2)),
        inventoryValue: Number(inventoryValue.toFixed(2)),
        inventoryCount: user.inventory.length,
      },
      inventory: user.inventory.map((us) => us.skin),
      recentBattles,
    });
  } catch (err) {
    console.error('[getPublicProfile]', err);
    res.status(500).json({ error: 'Error al obtener perfil' });
  }
}

module.exports = { getLeaderboard, getPublicProfile };
