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

    const [user, transactions, inventory] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, username: true, balance: true, createdAt: true },
      }),
      prisma.transaction.findMany({ where: { userId } }),
      prisma.userSkin.findMany({ where: { userId }, include: { skin: true } }),
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
      },
    });
  } catch (err) {
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

module.exports = { getProfile, getStats, getTransactions };
