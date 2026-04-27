const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const { getSkinImage } = require('../src/services/steamSkins');
const { ensureBotsExist, BOT_USERNAMES } = require('../src/services/botService');

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
  await prisma.battle.deleteMany();
  await prisma.jackpotEntry.deleteMany();
  await prisma.jackpot.deleteMany();
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

  // Cada usuario recibe al menos 3 skins distintas (aquí 5 para variedad)
  const inventoryAssignments = [
    { user: user1, skinIndexes: [0, 3, 5, 7, 8] },
    { user: user2, skinIndexes: [1, 2, 4, 9, 10] },
  ];

  for (const { user, skinIndexes } of inventoryAssignments) {
    await prisma.userSkin.createMany({
      data: skinIndexes.map((i) => ({ userId: user.id, skinId: skins[i].id })),
    });
    console.log(`[seed] inventario asignado a ${user.username}: ${skinIndexes.length} skins`);
  }

  const txs = [
    ...(await buildTransactionsForUser(user1.id)),
    ...(await buildTransactionsForUser(user2.id)),
  ];
  await prisma.transaction.createMany({ data: txs });

  console.log(`[seed] transacciones creadas: ${txs.length} (10 por usuario)`);

  // Jackpot histórico de ejemplo (completado, 3 entries)
  // Usamos skins distintas a las del inventario actual para no perturbar el estado
  const jackpotSkinIdxs = [2, 6, 9]; // Hyper Beast, Redline, Glock-18 Fade
  const jackpotEntriesData = [
    { user: user1, skinIdx: jackpotSkinIdxs[0] },
    { user: user2, skinIdx: jackpotSkinIdxs[1] },
    { user: user1, skinIdx: jackpotSkinIdxs[2] },
  ];
  const totalValue = jackpotEntriesData.reduce(
    (sum, e) => sum + skins[e.skinIdx].price,
    0,
  );
  const winner = user2; // gana Player1
  const resolvedAt = new Date(Date.now() - 1000 * 60 * 60 * 6);

  const historicalJackpot = await prisma.jackpot.create({
    data: {
      status: 'completed',
      seed: '7f3e9b21-a1c4-4a9b-9c80-22d7e6f81234',
      winnerId: winner.id,
      totalValue,
      resolvedAt,
      createdAt: new Date(resolvedAt.getTime() - 1000 * 60 * 2),
    },
  });
  for (const e of jackpotEntriesData) {
    await prisma.jackpotEntry.create({
      data: {
        jackpotId: historicalJackpot.id,
        userId: e.user.id,
        skinId: skins[e.skinIdx].id,
        value: skins[e.skinIdx].price,
        createdAt: new Date(historicalJackpot.createdAt.getTime() + Math.random() * 60_000),
      },
    });
  }

  // Jackpot abierto inicial vacío para la UI
  await prisma.jackpot.create({ data: { status: 'open' } });

  console.log(`[seed] jackpot histórico creado (${jackpotEntriesData.length} entries, ganador ${winner.username}) + 1 jackpot abierto vacío`);
  // Bots: create if missing and assign 3 skins each
  await ensureBotsExist(prisma);
  const bots = await prisma.user.findMany({ where: { isBot: true } });
  const botSkinPool = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]; // all skin indexes
  for (const bot of bots) {
    // Pick 3 random skins from the pool
    const shuffled = [...botSkinPool].sort(() => Math.random() - 0.5);
    const chosen = shuffled.slice(0, 3);
    for (const idx of chosen) {
      await prisma.userSkin.upsert({
        where: { userId_skinId: { userId: bot.id, skinId: skins[idx].id } },
        create: { userId: bot.id, skinId: skins[idx].id },
        update: {},
      });
    }
  }
  console.log(`[seed] bots configurados: ${bots.length} bots con 3 skins cada uno`);

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
