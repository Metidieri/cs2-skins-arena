const prisma = require('../config/db');

async function getHouseUserId() {
  const house = await prisma.user.findUnique({
    where: { email: 'house@arena.internal' },
    select: { id: true },
  });
  return house?.id ?? null;
}

async function addToHouseInventory(skinId, source, tx) {
  const db = tx || prisma;
  const houseId = await getHouseUserId();
  if (!houseId) return;

  await db.userSkin.upsert({
    where: { userId_skinId: { userId: houseId, skinId } },
    update: {},
    create: { userId: houseId, skinId },
  });

  const skin = await db.skin.findUnique({ where: { id: skinId } });
  if (!skin) return;

  const existingListing = await db.listing.findFirst({
    where: { sellerId: houseId, skinId, status: 'active' },
  });
  if (existingListing) return;

  await db.listing.create({
    data: { sellerId: houseId, skinId, price: skin.price, status: 'active' },
  });
}

async function collectHouseEdge(amount, tx) {
  const db = tx || prisma;
  const houseId = await getHouseUserId();
  if (!houseId || amount <= 0) return;
  await db.user.update({
    where: { id: houseId },
    data: { balance: { increment: amount } },
  });
}

module.exports = { getHouseUserId, addToHouseInventory, collectHouseEdge };
