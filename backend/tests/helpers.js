const bcrypt = require('bcryptjs');
const prisma = require('../src/config/db');

let counter = 0;

function uniqueSuffix() {
  counter += 1;
  return `${Date.now()}_${counter}`;
}

async function createUser(opts = {}) {
  const suffix = opts.suffix || uniqueSuffix();
  const password = opts.password || 'password123';
  const hashed = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: {
      email: opts.email || `test_${suffix}@cs2.test`,
      username: opts.username || `tu_${suffix}`,
      password: hashed,
      balance: opts.balance != null ? opts.balance : 5000,
    },
  });
  return { user, plainPassword: password };
}

async function ensureSkin(opts = {}) {
  return prisma.skin.create({
    data: {
      name: opts.name || `TestSkin_${uniqueSuffix()}`,
      weapon: opts.weapon || 'AK-47',
      rarity: opts.rarity || 'Classified',
      price: opts.price != null ? opts.price : 100,
      imageUrl: opts.imageUrl || 'https://example.test/img.png',
    },
  });
}

async function giveSkin(userId, skinId) {
  return prisma.userSkin.create({ data: { userId, skinId } });
}

async function cleanupUser(userId) {
  await prisma.transaction.deleteMany({ where: { userId } });
  await prisma.userSkin.deleteMany({ where: { userId } });
  await prisma.battle.deleteMany({
    where: { OR: [{ playerAId: userId }, { playerBId: userId }] },
  });
  await prisma.user.delete({ where: { id: userId } }).catch(() => {});
}

module.exports = { createUser, ensureSkin, giveSkin, cleanupUser, uniqueSuffix };
