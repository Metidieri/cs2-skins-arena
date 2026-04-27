const XP_PER_COIN_LOST = 0.1;

function getXpForLevel(level) {
  return Math.floor(100 * Math.pow(1.5, level - 1));
}

function calculateLevel(totalXp) {
  let level = 1;
  let xpUsed = 0;
  // Cap defensivo para evitar bucles raros con XP enormes.
  while (level < 1000) {
    const needed = getXpForLevel(level);
    if (xpUsed + needed > totalXp) break;
    xpUsed += needed;
    level++;
  }
  const xpNeeded = getXpForLevel(level);
  const currentXp = totalXp - xpUsed;
  return {
    level,
    currentXp,
    xpNeeded,
    progress: xpNeeded > 0 ? Math.round((currentXp / xpNeeded) * 100) : 0,
  };
}

function getXpGained(coinsLost) {
  return Math.floor(Math.max(0, coinsLost) * XP_PER_COIN_LOST);
}

module.exports = { calculateLevel, getXpGained, getXpForLevel, XP_PER_COIN_LOST };
