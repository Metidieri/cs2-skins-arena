const prismaSingleton = require('../config/db');
const { calculateLevel, getXpGained } = require('../utils/levelSystem');

/**
 * Suma XP por coins perdidas. Acepta un cliente prisma opcional para usar
 * dentro de transacciones (`prisma.$transaction(tx => ...)`); si no se pasa,
 * cae al singleton.
 *
 * Devuelve { xpGained, leveledUp, ...levelData } o null si no hay XP que sumar.
 */
async function addExperience(userId, coinsLost, prisma = prismaSingleton) {
  const xpGained = getXpGained(coinsLost);
  if (xpGained <= 0) return null;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { experience: true, level: true },
  });
  if (!user) return null;

  const newTotalXp = user.experience + xpGained;
  const levelData = calculateLevel(newTotalXp);
  const leveledUp = levelData.level > user.level;

  await prisma.user.update({
    where: { id: userId },
    data: {
      experience: newTotalXp,
      level: levelData.level,
      totalLost: { increment: Math.max(0, coinsLost) },
    },
  });

  return { xpGained, leveledUp, ...levelData };
}

module.exports = { addExperience };
