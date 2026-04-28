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

async function getOnlineCount(req, res) {
  try {
    const count = req.app.locals.getOnlineCount ? req.app.locals.getOnlineCount() : 0;
    res.json({ count });
  } catch (err) {
    res.json({ count: 0 });
  }
}

async function getRecentDrops(req, res) {
  try {
    const [boxes, battles, jackpots] = await Promise.all([
      prisma.dailyBox.findMany({
        orderBy: { openedAt: 'desc' },
        take: 10,
        include: {
          user: { select: { id: true, username: true } },
          skin: { select: { name: true, imageUrl: true, price: true, rarity: true, weapon: true } },
        },
      }),
      prisma.battle.findMany({
        where: { status: 'completed', winnerId: { not: null } },
        orderBy: { resolvedAt: 'desc' },
        take: 5,
        include: {
          playerA: { select: { id: true, username: true } },
          playerB: { select: { id: true, username: true } },
        },
      }),
      prisma.jackpot.findMany({
        where: { status: 'completed', winnerId: { not: null } },
        orderBy: { resolvedAt: 'desc' },
        take: 5,
        include: {
          winner: { select: { id: true, username: true } },
        },
      }),
    ]);

    const drops = [];

    for (const b of boxes) {
      drops.push({
        type: 'case_opening',
        username: b.user.username,
        skin: b.skin,
        createdAt: b.openedAt,
      });
    }

    for (const battle of battles) {
      const winner = battle.winnerId === battle.playerAId ? battle.playerA : battle.playerB;
      if (winner) {
        drops.push({
          type: 'battle',
          username: winner.username,
          skin: null,
          createdAt: battle.resolvedAt,
        });
      }
    }

    for (const jp of jackpots) {
      if (jp.winner) {
        drops.push({
          type: 'jackpot',
          username: jp.winner.username,
          skin: null,
          amount: jp.totalValue,
          createdAt: jp.resolvedAt,
        });
      }
    }

    drops.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    res.json(drops.slice(0, 20));
  } catch (err) {
    console.error('[getRecentDrops]', err);
    res.status(500).json({ error: 'Error al obtener drops recientes' });
  }
}

async function getHomeFeed(req, res) {
  try {
    const [recentActivity, activeBattles, openJackpot, topWinToday, biggestJackpot] = await Promise.all([
      // Recent activity
      prisma.dailyBox.findMany({
        orderBy: { openedAt: 'desc' },
        take: 15,
        include: {
          user: { select: { username: true } },
          skin: { select: { name: true, imageUrl: true, price: true, rarity: true } },
        },
      }),
      // Active battles
      prisma.battle.findMany({
        where: { status: 'waiting' },
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: {
          playerA: { select: { id: true, username: true } },
        },
      }),
      // Current jackpot
      prisma.jackpot.findFirst({
        where: { status: 'open' },
        include: {
          entries: {
            include: {
              user: { select: { id: true, username: true } },
              skin: { select: { price: true } },
            },
          },
        },
      }),
      // Top win today
      prisma.transaction.findFirst({
        where: {
          type: 'WIN',
          createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
        },
        orderBy: { amount: 'desc' },
        include: { user: { select: { username: true } } },
      }),
      // Biggest jackpot ever
      prisma.jackpot.findFirst({
        where: { status: 'completed' },
        orderBy: { totalValue: 'desc' },
        include: { winner: { select: { username: true } } },
      }),
    ]);

    const liveActivity = recentActivity.map((b) => ({
      type: 'case_open',
      user: b.user.username,
      skin: b.skin,
      amount: b.skin.price,
      createdAt: b.openedAt,
    }));

    // Fetch battle skins separately for active battles
    const battleSkinIds = activeBattles.map((b) => b.skinAId).filter(Boolean);
    const battleSkins = battleSkinIds.length > 0
      ? await prisma.skin.findMany({
          where: { id: { in: battleSkinIds } },
          select: { id: true, name: true, imageUrl: true, price: true, rarity: true },
        })
      : [];
    const skinMap = new Map(battleSkins.map((s) => [s.id, s]));
    const battlesWithSkins = activeBattles.map((b) => ({ ...b, skinA: skinMap.get(b.skinAId) || null }));

    const onlineCount = req.app.locals.getOnlineCount ? req.app.locals.getOnlineCount() : 0;

    res.json({
      liveActivity,
      activeBattles: battlesWithSkins,
      currentJackpot: openJackpot,
      topWinToday: topWinToday ? { username: topWinToday.user.username, amount: topWinToday.amount, description: topWinToday.description } : null,
      biggestPot: biggestJackpot ? { totalValue: biggestJackpot.totalValue, winner: biggestJackpot.winner?.username, resolvedAt: biggestJackpot.resolvedAt } : null,
      onlineCount,
    });
  } catch (err) {
    console.error('[getHomeFeed]', err);
    res.status(500).json({ error: 'Error al obtener feed' });
  }
}

module.exports = { getGlobalStats, getOnlineCount, getRecentDrops, getHomeFeed };
