const prisma = require('../config/db');

async function getProfile(req, res) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: {
        id: true,
        email: true,
        username: true,
        balance: true,
        avatar: true,
        createdAt: true,
      },
    });
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

    const inventoryCount = await prisma.userSkin.count({ where: { userId: user.id } });
    res.json({ ...user, inventoryCount });
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener perfil' });
  }
}

async function getStats(req, res) {
  try {
    const userId = req.userId;

    const [user, transactions, inventory, coinflips, jackpotEntries, jackpotsWonCount, mpSales, mpPurchases] =
      await Promise.all([
        prisma.user.findUnique({
          where: { id: userId },
          select: { id: true, username: true, balance: true, createdAt: true },
        }),
        prisma.transaction.findMany({ where: { userId } }),
        prisma.userSkin.findMany({ where: { userId }, include: { skin: true } }),
        prisma.battle.findMany({
          where: {
            status: 'completed',
            OR: [{ playerAId: userId }, { playerBId: userId }],
          },
          select: { id: true, winnerId: true, playerAId: true, playerBId: true },
        }),
        prisma.jackpotEntry.findMany({ where: { userId }, select: { jackpotId: true } }),
        prisma.jackpot.count({ where: { winnerId: userId, status: 'completed' } }),
        prisma.listing.count({ where: { sellerId: userId, status: 'sold' } }),
        prisma.listing.count({ where: { buyerId: userId, status: 'sold' } }),
      ]);

    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

    const wins = transactions.filter((t) => t.type === 'WIN');
    const losses = transactions.filter((t) => t.type === 'LOSS');
    const deposits = transactions.filter((t) => t.type === 'DEPOSIT');

    const totalBets = wins.length + losses.length;
    const winRate = totalBets > 0 ? Number(((wins.length / totalBets) * 100).toFixed(2)) : 0;
    const totalWon = wins.reduce((sum, t) => sum + t.amount, 0);
    const totalLost = losses.reduce((sum, t) => sum + Math.abs(t.amount), 0);
    const totalDeposited = deposits.reduce((sum, t) => sum + t.amount, 0);
    const netProfit = Number((totalWon - totalLost).toFixed(2));

    const inventoryValue = inventory.reduce((sum, us) => sum + us.skin.price, 0);

    // Coinflips
    const coinflipsPlayed = coinflips.length;
    const coinflipsWon = coinflips.filter((b) => b.winnerId === userId).length;
    const coinflipsLost = coinflipsPlayed - coinflipsWon;

    // Jackpots: jugados = nº de jackpots distintos en los que entró
    const jackpotsPlayed = new Set(jackpotEntries.map((e) => e.jackpotId)).size;
    const jackpotsWon = jackpotsWonCount;

    // Earnings y mejor victoria
    const totalEarnings = Number(totalWon.toFixed(2));
    const biggestWin = wins.reduce(
      (best, t) => (t.amount > (best?.amount ?? -Infinity) ? t : best),
      null,
    );

    // Arma favorita (más repetida en inventario)
    const weaponCount = new Map();
    for (const us of inventory) {
      const w = us.skin.weapon;
      weaponCount.set(w, (weaponCount.get(w) || 0) + 1);
    }
    let favoriteWeapon = null;
    for (const [weapon, count] of weaponCount.entries()) {
      if (!favoriteWeapon || count > favoriteWeapon.count) {
        favoriteWeapon = { weapon, count };
      }
    }

    res.json({
      user,
      stats: {
        wins: wins.length,
        losses: losses.length,
        totalBets,
        winRate,
        totalWon: Number(totalWon.toFixed(2)),
        totalLost: Number(totalLost.toFixed(2)),
        totalDeposited: Number(totalDeposited.toFixed(2)),
        netProfit,
        inventoryCount: inventory.length,
        inventoryValue: Number(inventoryValue.toFixed(2)),
        coinflipsPlayed,
        coinflipsWon,
        coinflipsLost,
        jackpotsPlayed,
        jackpotsWon,
        marketplaceSales: mpSales,
        marketplacePurchases: mpPurchases,
        totalEarnings,
        biggestWin: biggestWin
          ? {
              amount: Number(biggestWin.amount.toFixed(2)),
              description: biggestWin.description,
              createdAt: biggestWin.createdAt,
            }
          : null,
        favoriteWeapon,
      },
    });
  } catch (err) {
    console.error('[getStats]', err);
    res.status(500).json({ error: 'Error al obtener estadísticas' });
  }
}

async function getTransactions(req, res) {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 50, 200);
    const transactions = await prisma.transaction.findMany({
      where: { userId: req.userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
    res.json(transactions);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener historial' });
  }
}

async function deposit(req, res) {
  try {
    const userId = req.userId;
    const amount = Number(req.body.amount);
    if (!amount || isNaN(amount)) {
      return res.status(400).json({ error: 'Cantidad requerida' });
    }
    if (amount < 100 || amount > 10000) {
      return res.status(400).json({ error: 'Depósito entre 100 y 10000 coins' });
    }

    const updated = await prisma.$transaction(async (tx) => {
      const user = await tx.user.update({
        where: { id: userId },
        data: { balance: { increment: amount } },
        select: { id: true, balance: true, username: true, email: true, avatar: true },
      });
      await tx.transaction.create({
        data: {
          userId,
          type: 'DEPOSIT',
          amount,
          description: 'Depósito simulado',
        },
      });
      return user;
    });

    res.json({ balance: updated.balance, user: updated });
  } catch (err) {
    console.error('[deposit]', err);
    res.status(500).json({ error: 'Error al depositar' });
  }
}

module.exports = { getProfile, getStats, getTransactions, deposit };
