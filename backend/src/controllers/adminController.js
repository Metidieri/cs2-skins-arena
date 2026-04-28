const prisma = require('../config/db');

const today = () => new Date(new Date().setHours(0, 0, 0, 0));
const weekAgo = () => new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

async function getDashboardStats(req, res) {
  try {
    const houseUser = await prisma.user.findUnique({ where: { email: 'house@arena.internal' }, select: { id: true, balance: true } });
    const houseId = houseUser?.id;

    const [
      totalCoinsAgg,
      wageredAgg,
      wonAgg,
      houseWonAgg,
      mpVolumeAgg,
      totalUsers,
      newToday,
      newThisWeek,
      withInventory,
      topByBalance,
      coinflipsTotal,
      coinflipsToday,
      jackpotsTotal,
      jackpotsToday,
      rouletteTotal,
      caseOpeningsTotal,
      caseOpeningsToday,
      totalInCirculation,
      totalValue,
    ] = await Promise.all([
      prisma.user.aggregate({ where: { isBot: false }, _sum: { balance: true } }),
      prisma.transaction.aggregate({ where: { type: 'LOSS' }, _sum: { amount: true } }),
      prisma.transaction.aggregate({ where: { type: 'WIN' }, _sum: { amount: true } }),
      houseId ? prisma.transaction.aggregate({ where: { userId: houseId, type: 'WIN' }, _sum: { amount: true } }) : Promise.resolve({ _sum: { amount: 0 } }),
      prisma.listing.aggregate({ where: { status: 'sold' }, _sum: { price: true } }),
      prisma.user.count({ where: { isBot: false } }),
      prisma.user.count({ where: { isBot: false, createdAt: { gte: today() } } }),
      prisma.user.count({ where: { isBot: false, createdAt: { gte: weekAgo() } } }),
      prisma.user.count({ where: { isBot: false, inventory: { some: {} } } }),
      prisma.user.findMany({
        where: { isBot: false },
        orderBy: { balance: 'desc' },
        take: 5,
        select: { id: true, username: true, balance: true },
      }),
      prisma.battle.count({ where: { status: 'completed' } }),
      prisma.battle.count({ where: { status: 'completed', resolvedAt: { gte: today() } } }),
      prisma.jackpot.count({ where: { status: 'completed' } }),
      prisma.jackpot.count({ where: { status: 'completed', resolvedAt: { gte: today() } } }),
      prisma.rouletteRound.count({ where: { status: 'completed' } }),
      prisma.dailyBox.count(),
      prisma.dailyBox.count({ where: { openedAt: { gte: today() } } }),
      prisma.userSkin.count(),
      prisma.skin.aggregate({ _sum: { price: true } }),
    ]);

    res.json({
      economy: {
        totalCoinsInCirculation: Number((totalCoinsAgg._sum.balance || 0).toFixed(2)),
        totalCoinsWagered: Math.abs(Number((wageredAgg._sum.amount || 0).toFixed(2))),
        totalCoinsWon: Number((wonAgg._sum.amount || 0).toFixed(2)),
        houseBalance: houseUser?.balance || 0,
        houseEdgeCollected: Number((houseWonAgg._sum.amount || 0).toFixed(2)),
        marketplaceVolume: Number((mpVolumeAgg._sum.price || 0).toFixed(2)),
      },
      users: {
        total: totalUsers,
        newToday,
        newThisWeek,
        withInventory,
        topByBalance,
      },
      games: {
        coinflipsTotal,
        coinflipsToday,
        jackpotsTotal,
        jackpotsToday,
        rouletteRoundsTotal: rouletteTotal,
        caseOpeningsTotal,
        caseOpeningsToday,
      },
      skins: {
        totalInCirculation,
        totalValue: Number((totalValue._sum.price || 0).toFixed(2)),
      },
    });
  } catch (err) {
    console.error('[getDashboardStats]', err);
    res.status(500).json({ error: 'Error al obtener estadísticas' });
  }
}

async function getUsers(req, res) {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, parseInt(req.query.limit) || 20);
    const search = req.query.search || '';

    const where = {
      isBot: false,
      ...(search ? {
        OR: [
          { username: { contains: search } },
          { email: { contains: search } },
        ],
      } : {}),
    };

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true, username: true, email: true, balance: true,
          level: true, createdAt: true, isBot: true, role: true,
          _count: { select: { inventory: true, betsA: true, rouletteBets: true } },
        },
      }),
      prisma.user.count({ where }),
    ]);

    res.json({ users, total, page, limit, totalPages: Math.max(1, Math.ceil(total / limit)) });
  } catch (err) {
    console.error('[getUsers]', err);
    res.status(500).json({ error: 'Error al obtener usuarios' });
  }
}

async function banUser(req, res) {
  try {
    const userId = parseInt(req.params.id);
    const updated = await prisma.user.update({
      where: { id: userId },
      data: { role: 'BANNED' },
      select: { id: true, username: true, role: true },
    });
    res.json(updated);
  } catch (err) {
    console.error('[banUser]', err);
    res.status(500).json({ error: 'Error al banear usuario' });
  }
}

async function giveCoins(req, res) {
  try {
    const userId = parseInt(req.params.id);
    const amount = parseFloat(req.body.amount);
    const reason = req.body.reason || 'Admin gift';

    if (!amount || isNaN(amount) || amount <= 0) {
      return res.status(400).json({ error: 'Cantidad inválida' });
    }

    const updated = await prisma.$transaction(async (tx) => {
      const user = await tx.user.update({
        where: { id: userId },
        data: { balance: { increment: amount } },
        select: { id: true, username: true, balance: true },
      });
      await tx.transaction.create({
        data: { userId, type: 'DEPOSIT', amount, description: reason },
      });
      return user;
    });

    res.json(updated);
  } catch (err) {
    console.error('[giveCoins]', err);
    res.status(500).json({ error: 'Error al dar coins' });
  }
}

async function getSkinsList(req, res) {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = 20;

    const [skins, total] = await Promise.all([
      prisma.skin.findMany({
        orderBy: { price: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: { _count: { select: { owners: true } } },
      }),
      prisma.skin.count(),
    ]);

    res.json({ skins, total, page, limit, totalPages: Math.max(1, Math.ceil(total / limit)) });
  } catch (err) {
    console.error('[getSkinsList]', err);
    res.status(500).json({ error: 'Error al obtener skins' });
  }
}

module.exports = { getDashboardStats, getUsers, banUser, giveCoins, getSkinsList };
