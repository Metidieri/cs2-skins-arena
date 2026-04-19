const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  // Create users
  const password = await bcrypt.hash('password123', 10);

  const user1 = await prisma.user.upsert({
    where: { email: 'admin@cs2arena.com' },
    update: {},
    create: {
      email: 'admin@cs2arena.com',
      username: 'Admin',
      password,
      balance: 5000,
    },
  });

  const user2 = await prisma.user.upsert({
    where: { email: 'player@cs2arena.com' },
    update: {},
    create: {
      email: 'player@cs2arena.com',
      username: 'Player1',
      password,
      balance: 2500,
    },
  });

  // Create skins
  const skins = await Promise.all([
    prisma.skin.create({
      data: { name: 'Dragon Lore', weapon: 'AWP', rarity: 'Covert', price: 1500, imageUrl: '/images/awp-dragon-lore.png' },
    }),
    prisma.skin.create({
      data: { name: 'Asiimov', weapon: 'AK-47', rarity: 'Classified', price: 350, imageUrl: '/images/ak47-asiimov.png' },
    }),
    prisma.skin.create({
      data: { name: 'Hyper Beast', weapon: 'M4A1-S', rarity: 'Classified', price: 280, imageUrl: '/images/m4a1s-hyper-beast.png' },
    }),
    prisma.skin.create({
      data: { name: 'Fade', weapon: 'Karambit', rarity: 'Covert', price: 2200, imageUrl: '/images/karambit-fade.png' },
    }),
    prisma.skin.create({
      data: { name: 'Fire Serpent', weapon: 'AK-47', rarity: 'Covert', price: 900, imageUrl: '/images/ak47-fire-serpent.png' },
    }),
    prisma.skin.create({
      data: { name: 'Crimson Web', weapon: 'M9 Bayonet', rarity: 'Covert', price: 1800, imageUrl: '/images/m9-crimson-web.png' },
    }),
  ]);

  // Assign skins to users
  await prisma.userSkin.createMany({
    data: [
      { userId: user1.id, skinId: skins[0].id },
      { userId: user1.id, skinId: skins[3].id },
      { userId: user1.id, skinId: skins[5].id },
      { userId: user2.id, skinId: skins[1].id },
      { userId: user2.id, skinId: skins[2].id },
      { userId: user2.id, skinId: skins[4].id },
    ],
  });

  console.log('Seed completed successfully');
  console.log('Users created:', user1.username, user2.username);
  console.log('Skins created:', skins.length);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
