function getBoxReward(userLevel, openingsToday) {
  if (openingsToday > 0) return null;

  const baseValue = Math.min(userLevel * 50, 2000);
  return {
    minValue: Math.floor(baseValue * 0.2),
    maxValue: Math.floor(baseValue * 1.8),
    avgValue: baseValue,
  };
}

function selectSkinByValueRange(skins, minVal, maxVal) {
  const eligible = skins.filter((s) => s.price >= minVal && s.price <= maxVal);
  if (eligible.length === 0) {
    return skins.slice().sort((a, b) => a.price - b.price)[0];
  }
  return eligible[Math.floor(Math.random() * eligible.length)];
}

module.exports = { getBoxReward, selectSkinByValueRange };
