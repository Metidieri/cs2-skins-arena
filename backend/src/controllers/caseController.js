const crypto = require('crypto');
const prisma = require('../config/db');
const { CASES, openCase } = require('../utils/caseSystem');
const { addExperience } = require('../services/levelService');
const { collectHouseEdge } = require('../utils/houseService');

// Maps case rarity keys to DB rarity strings (case-insensitive match)
function matchDbRarity(caseRarity) {
  const r = caseRarity.toLowerCase();
  if (r.includes('consumer'))   return 'Consumer';
  if (r.includes('industrial')) return 'Industrial';
  if (r.includes('mil') || r.includes('spec')) return 'Mil-Spec';
  if (r.includes('restricted')) return 'Restricted';
  if (r.includes('classified')) return 'Classified';
  if (r.includes('covert'))     return 'Covert';
  if (r.includes('contraband')) return 'Contraband';
  return caseRarity;
}

async function openCaseHandler(req, res) {
  try {
    const userId = req.userId;
    const { caseType } = req.body;

    const caseData = CASES[caseType];
    if (!caseData) return res.status(400).json({ error: 'Tipo de caja inválido' });

    const user = await prisma.user.findUnique({ where: { id: userId }, select: { balance: true } });
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
    if (user.balance < caseData.price) return res.status(400).json({ error: 'Saldo insuficiente' });

    const seed = crypto.randomUUID();
    const rollResult = openCase(caseType, seed);
    const dbRarity = matchDbRarity(rollResult.rarity);
    const [minVal, maxVal] = rollResult.priceRange;
    const midVal = (minVal + maxVal) / 2;

    const allSkins = await prisma.skin.findMany();

    // Try to find a skin matching rarity and price range
    const byRarityAndRange = allSkins.filter(
      (s) =>
        s.rarity.toLowerCase().includes(dbRarity.toLowerCase()) &&
        s.price >= minVal && s.price <= maxVal,
    );

    let selectedSkin;
    if (byRarityAndRange.length > 0) {
      selectedSkin = byRarityAndRange[Math.floor(Math.random() * byRarityAndRange.length)];
    } else {
      // Fallback: closest by price from same rarity, then any rarity
      const byRarity = allSkins.filter((s) =>
        s.rarity.toLowerCase().includes(dbRarity.toLowerCase()),
      );
      const pool = byRarity.length > 0 ? byRarity : allSkins;
      selectedSkin = pool.sort((a, b) => Math.abs(a.price - midVal) - Math.abs(b.price - midVal))[0];
    }

    const profit = selectedSkin.price - caseData.price;

    const houseEdge = caseData.houseEdge || 0;
    const edgeAmount = houseEdge * caseData.price;

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: { balance: { decrement: caseData.price } },
      });
      await tx.userSkin.upsert({
        where: { userId_skinId: { userId, skinId: selectedSkin.id } },
        create: { userId, skinId: selectedSkin.id },
        update: {},
      });
      await tx.transaction.create({
        data: {
          userId,
          type: 'LOSS',
          amount: -caseData.price,
          description: `Apertura de caja: ${caseData.name}`,
        },
      });
      await tx.transaction.create({
        data: {
          userId,
          type: 'WIN',
          amount: selectedSkin.price,
          description: `Caja ganada: ${selectedSkin.name}`,
        },
      });
    });

    if (edgeAmount > 0) {
      await collectHouseEdge(edgeAmount, null);
    }

    await addExperience(userId, caseData.price);

    res.json({
      skin: selectedSkin,
      seed,
      roll: rollResult.roll,
      caseType,
      profit,
      caseName: caseData.name,
      casePrice: caseData.price,
    });
  } catch (err) {
    console.error('[openCase]', err);
    res.status(500).json({ error: 'Error al abrir caja' });
  }
}

async function getCases(req, res) {
  res.json(
    Object.entries(CASES).map(([key, data]) => ({
      key,
      name: data.name,
      price: data.price,
      houseEdge: data.houseEdge,
      items: data.items,
    })),
  );
}

module.exports = { openCaseHandler, getCases };
