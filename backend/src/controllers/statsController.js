const prisma = require('../config/db');

let cache = { at: 0, payload: null };
const CACHE_MS = 5000;

async function getGlobalStats(req, res) {
  try {
    const now = Date.now();
    if (cache.payload && now - cache.at < CACHE_MS) {
      return res.json(cache.payload);
    }

    const [
      totalUsers,
      totalSkins,
      totalBattles,
      completedBattles,
      jackpotsCompleted,
      listingsActive,
      listingsSold,
      totalWonAgg,
      totalLostAgg,
      totalDepositedAgg,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.skin.count(),
      prisma.battle.count(),
      prisma.battle.count({ where: { status: 'completed' } }),
      prisma.jackpot.count({ where: { status: 'completed' } }),
      prisma.listing.count({ where: { status: 'active' } }),
      prisma.listing.count({ where: { status: 'sold' } }),
      prisma.transaction.aggregate({ where: { type: 'WIN' }, _sum: { amount: true } }),
      prisma.transaction.aggregate({ where: { type: 'LOSS' }, _sum: { amount: true } }),
      prisma.transaction.aggregate({ where: { type: 'DEPOSIT' }, _sum: { amount: true } }),
    ]);

    const totalWon = Number(totalWonAgg._sum.amount || 0);
    const totalLost = Math.abs(Number(totalLostAgg._sum.amount || 0));
    const totalDeposited = Number(totalDepositedAgg._sum.amount || 0);
    const totalCoinsWagered = totalWon + totalLost;
    const totalGames = completedBattles + jackpotsCompleted;

    const payload = {
      totalUsers,
      totalSkins,
      totalGames,
      coinflipsPlayed: completedBattles,
      jackpotsResolved: jackpotsCompleted,
      battlesWaiting: totalBattles - completedBattles,
      marketActive: listingsActive,
      marketSold: listingsSold,
      totalCoinsWagered: Number(totalCoinsWagered.toFixed(2)),
      totalCoinsWon: Number(totalWon.toFixed(2)),
      totalCoinsDeposited: Number(totalDeposited.toFixed(2)),
    };

    cache = { at: now, payload };
    res.json(payload);
  } catch (err) {
    console.error('[getGlobalStats]', err);
    res.status(500).json({ error: 'Error al obtener estadísticas globales' });
  }
}

module.exports = { getGlobalStats };
