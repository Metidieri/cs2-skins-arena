const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const { getSkinImage } = require('../src/services/steamSkins');

const prisma = new PrismaClient();

const SKIN_DEFINITIONS = [
  { name: 'Dragon Lore', weapon: 'AWP', rarity: 'Covert', price: 1500, marketName: 'AWP | Dragon Lore (Factory New)' },
  { name: 'Asiimov', weapon: 'AK-47', rarity: 'Classified', price: 350, marketName: 'AK-47 | Asiimov (Field-Tested)' },
  { name: 'Hyper Beast', weapon: 'M4A1-S', rarity: 'Classified', price: 280, marketName: 'M4A1-S | Hyper Beast (Field-Tested)' },
  { name: 'Fade', weapon: 'Karambit', rarity: 'Covert', price: 2200, marketName: '★ Karambit | Fade (Factory New)' },
  { name: 'Fire Serpent', weapon: 'AK-47', rarity: 'Covert', price: 900, marketName: 'AK-47 | Fire Serpent (Factory New)' },
  { name: 'Crimson Web', weapon: 'M9 Bayonet', rarity: 'Covert', price: 1800, marketName: '★ M9 Bayonet | Crimson Web (Field-Tested)' },
  { name: 'Redline', weapon: 'AK-47', rarity: 'Classified', price: 45, marketName: 'AK-47 | Redline (Field-Tested)' },
  { name: 'Howl', weapon: 'M4A4', rarity: 'Contraband', price: 3500, marketName: 'M4A4 | Howl (Field-Tested)' },
  { name: 'Blaze', weapon: 'Desert Eagle', rarity: 'Restricted', price: 600, marketName: 'Desert Eagle | Blaze (Factory New)' },
  { name: 'Fade', weapon: 'Glock-18', rarity: 'Restricted', price: 480, marketName: 'Glock-18 | Fade (Factory New)' },
  { name: 'Kill Confirmed', weapon: 'USP-S', rarity: 'Covert', price: 220, marketName: 'USP-S | Kill Confirmed (Factory New)' },
];

const TX_DESCRIPTIONS = {
  WIN: ['Victoria en 1v1 Arena', 'Premio jackpot', 'Apuesta ganada vs rival', 'Torneo semanal'],
  LOSS: ['Derrota en 1v1 Arena', 'Apuesta perdida', 'Eliminado en torneo', 'Jackpot sin suerte'],
  DEPOSIT: ['Recarga con tarjeta', 'Bono de bienvenida', 'Depósito Steam Wallet', 'Promo de fin de semana'],
};

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomAmount(type) {
  if (type === 'DEPOSIT') return Math.round((50 + Math.random() * 450) * 100) / 100;
  if (type === 'WIN') return Math.round((20 + Math.random() * 380) * 100) / 100;
  return -Math.round((20 + Math.random() * 280) * 100) / 100;
}

async function buildTransactionsForUser(userId) {
  const types = ['WIN', 'WIN', 'WIN', 'LOSS', 'LOSS', 'LOSS', 'LOSS', 'DEPOSIT', 'DEPOSIT', 'DEPOSIT'];
  const now = Date.now();
  return types.map((type, i) => {
    const amount = randomAmount(type);
    return {
      userId,
      type,
      amount,
      description: pick(TX_DESCRIPTIONS[type]),
      createdAt: new Date(now - (i + 1) * 1000 * 60 * 60 * (6 + Math.random() * 18)),
    };
  });
}

async function main() {
  console.log('[seed] limpiando datos previos...');
  await prisma.transaction.deleteMany();
  await prisma.userSkin.deleteMany();
  await prisma.skin.deleteMany();

  const password = await bcrypt.hash('password123', 10);

  const user1 = await prisma.user.upsert({
    where: { email: 'admin@cs2arena.com' },
    update: { balance: 5000 },
    create: { email: 'admin@cs2arena.com', username: 'Admin', password, balance: 5000 },
  });
  const user2 = await prisma.user.upsert({
    where: { email: 'player@cs2arena.com' },
    update: { balance: 2500 },
    create: { email: 'player@cs2arena.com', username: 'Player1', password, balance: 2500 },
  });

  console.log('[seed] usuarios listos:', user1.username, user2.username);

  console.log('[seed] resolviendo imágenes de Steam...');
  const skins = [];
  let steamHits = 0;
  let placeholderHits = 0;

  for (let i = 0; i < SKIN_DEFINITIONS.length; i++) {
    const def = SKIN_DEFINITIONS[i];
    const result = await getSkinImage(def.marketName, i);
    if (result.source === 'placeholder') placeholderHits++;
    else steamHits++;
    const skin = await prisma.skin.create({
      data: {
        name: def.name,
        weapon: def.weapon,
        rarity: def.rarity,
        price: def.price,
        imageUrl: result.url,
      },
    });
    skins.push(skin);
    // gentle pacing so Steam doesn't rate-limit us
    await new Promise((r) => setTimeout(r, 350));
  }

  console.log(`[seed] skins creados: ${skins.length} (Steam: ${steamHits}, placeholder: ${placeholderHits})`);

  await prisma.userSkin.createMany({
    data: [
      { userId: user1.id, skinId: skins[0].id },
      { userId: user1.id, skinId: skins[3].id },
      { userId: user1.id, skinId: skins[5].id },
      { userId: user1.id, skinId: skins[7].id },
      { userId: user2.id, skinId: skins[1].id },
      { userId: user2.id, skinId: skins[2].id },
      { userId: user2.id, skinId: skins[4].id },
      { userId: user2.id, skinId: skins[10].id },
    ],
  });

  const txs = [
    ...(await buildTransactionsForUser(user1.id)),
    ...(await buildTransactionsForUser(user2.id)),
  ];
  await prisma.transaction.createMany({ data: txs });

  console.log(`[seed] transacciones creadas: ${txs.length} (10 por usuario)`);
  console.log('[seed] completado');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
