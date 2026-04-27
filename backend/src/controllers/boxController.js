const prisma = require('../config/db');
const { getBoxReward, selectSkinByValueRange } = require('../utils/boxSystem');
const { calculateLevel } = require('../utils/levelSystem');

let io = null;
function setIo(instance) {
  io = instance;
}

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function startOfTomorrow() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 1);
  return d;
}

async function getBoxStatus(req, res) {
  try {
    const userId = req.userId;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { level: true, experience: true },
    });
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

    const openingsToday = await prisma.dailyBox.count({
      where: { userId, openedAt: { gte: startOfToday() } },
    });

    const canOpen = openingsToday === 0;
    const timeUntilNext = canOpen ? 0 : startOfTomorrow().getTime() - Date.now();
    const reward = getBoxReward(user.level, openingsToday);
    const levelData = calculateLevel(user.experience || 0);

    res.json({
      canOpen,
      timeUntilNext,
      userLevel: user.level,
      levelData,
      estimatedReward: reward
        ? { min: reward.minValue, max: reward.maxValue, avg: reward.avgValue }
        : null,
    });
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener estado de la caja' });
  }
}

async function openBox(req, res) {
  try {
    const userId = req.userId;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { level: true, experience: true },
    });
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

    const openingsToday = await prisma.dailyBox.count({
      where: { userId, openedAt: { gte: startOfToday() } },
    });

    if (openingsToday > 0) {
      return res.status(400).json({ error: 'Ya abriste tu caja hoy' });
    }

    const reward = getBoxReward(user.level, 0);
    const allSkins = await prisma.skin.findMany();
    const selectedSkin = selectSkinByValueRange(allSkins, reward.minValue, reward.maxValue);

    const previousBoxes = await prisma.dailyBox.count({ where: { userId } });

    const [dailyBox] = await prisma.$transaction([
      prisma.dailyBox.create({
        data: {
          userId,
          level: user.level,
          skinWonId: selectedSkin.id,
          coinsValue: selectedSkin.price,
        },
      }),
      prisma.userSkin.upsert({
        where: { userId_skinId: { userId, skinId: selectedSkin.id } },
        create: { userId, skinId: selectedSkin.id },
        update: {},
      }),
      prisma.transaction.create({
        data: {
          userId,
          type: 'DEPOSIT',
          amount: selectedSkin.price,
          description: `Caja diaria nivel ${user.level}`,
        },
      }),
    ]);

    const isNewRecord =
      previousBoxes === 0 ||
      (await prisma.dailyBox
        .findMany({ where: { userId }, orderBy: { coinsValue: 'desc' }, take: 1 })
        .then((top) => top[0]?.id === dailyBox.id));

    if (io) {
      io.to(`user-${userId}`).emit('box:opened', {
        skin: selectedSkin,
        coinsValue: selectedSkin.price,
        isNewRecord,
      });
    }

    res.json({ skin: selectedSkin, coinsValue: selectedSkin.price, isNewRecord });
  } catch (err) {
    res.status(500).json({ error: 'Error al abrir la caja' });
  }
}

async function getHistory(req, res) {
  try {
    const userId = req.userId;
    const boxes = await prisma.dailyBox.findMany({
      where: { userId },
      orderBy: { openedAt: 'desc' },
      take: 5,
      include: { skin: true },
    });
    res.json(boxes);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener historial de cajas' });
  }
}

module.exports = { setIo, getBoxStatus, openBox, getHistory };
