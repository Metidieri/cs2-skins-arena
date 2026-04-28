const prisma = require('../config/db');
const { getHouseUserId } = require('../utils/houseService');
const { createNotification } = require('../services/notificationService');

let io = null;
function setIo(instance) {
  io = instance;
}

const SORTS = {
  price_asc: { price: 'asc' },
  price_desc: { price: 'desc' },
  newest: { createdAt: 'desc' },
};

async function getListings(req, res) {
  try {
    const { rarity, weapon, minPrice, maxPrice, sortBy } = req.query;
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));

    const where = { status: 'active' };
    if (minPrice || maxPrice) {
      where.price = {};
      if (minPrice) where.price.gte = parseFloat(minPrice);
      if (maxPrice) where.price.lte = parseFloat(maxPrice);
    }
    if (rarity || weapon) {
      where.skin = {};
      if (rarity) where.skin.rarity = rarity;
      if (weapon) where.skin.weapon = weapon;
    }

    const orderBy = SORTS[sortBy] || SORTS.newest;

    const [items, total] = await Promise.all([
      prisma.listing.findMany({
        where,
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
        include: {
          seller: { select: { id: true, username: true, avatar: true } },
          skin: true,
        },
      }),
      prisma.listing.count({ where }),
    ]);

    res.json({
      items,
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    });
  } catch (err) {
    console.error('[getListings]', err);
    res.status(500).json({ error: 'Error al obtener listings' });
  }
}

async function createListing(req, res) {
  try {
    const sellerId = req.userId;
    const skinId = parseInt(req.body.skinId);
    const price = parseFloat(req.body.price);

    if (!skinId) return res.status(400).json({ error: 'skinId requerido' });
    if (!price || price < 1) {
      return res.status(400).json({ error: 'El precio mínimo es 1 coin' });
    }

    const userSkin = await prisma.userSkin.findUnique({
      where: { userId_skinId: { userId: sellerId, skinId } },
    });
    if (!userSkin) return res.status(400).json({ error: 'No posees esta skin' });

    const existing = await prisma.listing.findFirst({
      where: { sellerId, skinId, status: 'active' },
    });
    if (existing) {
      return res.status(400).json({ error: 'Ya tienes esta skin listada' });
    }

    const listing = await prisma.listing.create({
      data: { sellerId, skinId, price, status: 'active' },
      include: {
        seller: { select: { id: true, username: true, avatar: true } },
        skin: true,
      },
    });

    if (io) io.to('marketplace').emit('market:listed', listing);

    res.status(201).json(listing);
  } catch (err) {
    console.error('[createListing]', err);
    res.status(500).json({ error: 'Error al crear listing' });
  }
}

async function buyListing(req, res) {
  try {
    const buyerId = req.userId;
    const listingId = req.params.id;

    const listing = await prisma.listing.findUnique({
      where: { id: listingId },
      include: { skin: true },
    });
    if (!listing) return res.status(404).json({ error: 'Listing no encontrado' });
    if (listing.status !== 'active') {
      return res.status(400).json({ error: 'Listing no disponible' });
    }
    if (listing.sellerId === buyerId) {
      return res.status(400).json({ error: 'No puedes comprar tu propia skin' });
    }

    const buyer = await prisma.user.findUnique({ where: { id: buyerId } });
    if (!buyer) return res.status(404).json({ error: 'Usuario no encontrado' });
    if (buyer.balance < listing.price) {
      return res.status(400).json({ error: 'Saldo insuficiente' });
    }

    const updated = await prisma.$transaction(async (tx) => {
      // Re-check status inside transaction to avoid race
      const fresh = await tx.listing.findUnique({ where: { id: listingId } });
      if (!fresh || fresh.status !== 'active') {
        throw new Error('LISTING_UNAVAILABLE');
      }

      await tx.user.update({
        where: { id: buyerId },
        data: { balance: { decrement: listing.price } },
      });
      await tx.user.update({
        where: { id: listing.sellerId },
        data: { balance: { increment: listing.price } },
      });

      await tx.userSkin.deleteMany({
        where: { userId: listing.sellerId, skinId: listing.skinId },
      });
      // Buyer might already own it (edge case) — upsert via deleteMany + create
      await tx.userSkin.deleteMany({
        where: { userId: buyerId, skinId: listing.skinId },
      });
      await tx.userSkin.create({
        data: { userId: buyerId, skinId: listing.skinId },
      });

      const sold = await tx.listing.update({
        where: { id: listingId },
        data: { status: 'sold', buyerId, soldAt: new Date() },
        include: {
          seller: { select: { id: true, username: true, avatar: true } },
          buyer: { select: { id: true, username: true, avatar: true } },
          skin: true,
        },
      });

      await tx.transaction.create({
        data: {
          userId: buyerId,
          type: 'LOSS',
          amount: -listing.price,
          description: `Compra en marketplace: ${listing.skin.name}`,
        },
      });
      await tx.transaction.create({
        data: {
          userId: listing.sellerId,
          type: 'WIN',
          amount: listing.price,
          description: `Venta en marketplace: ${listing.skin.name}`,
        },
      });

      return sold;
    });

    if (io) io.to('marketplace').emit('market:sold', updated);

    // Notificación al vendedor
    const sellerIsBot = await prisma.user.findUnique({ where: { id: listing.sellerId }, select: { isBot: true } });
    if (!sellerIsBot?.isBot) {
      createNotification(
        listing.sellerId,
        'marketplace_sold',
        'Skin vendida',
        `${buyer.username} compró tu ${listing.skin.name} por ${listing.price} coins`,
        { listingId: listing.id, price: listing.price },
        io,
      ).catch(() => {});
    }

    res.json(updated);
  } catch (err) {
    if (err.message === 'LISTING_UNAVAILABLE') {
      return res.status(400).json({ error: 'Listing ya no está disponible' });
    }
    console.error('[buyListing]', err);
    res.status(500).json({ error: 'Error al comprar listing' });
  }
}

async function cancelListing(req, res) {
  try {
    const userId = req.userId;
    const listingId = req.params.id;

    const listing = await prisma.listing.findUnique({ where: { id: listingId } });
    if (!listing) return res.status(404).json({ error: 'Listing no encontrado' });
    if (listing.sellerId !== userId) {
      return res.status(403).json({ error: 'No puedes cancelar este listing' });
    }
    if (listing.status !== 'active') {
      return res.status(400).json({ error: 'Listing no está activo' });
    }

    const updated = await prisma.listing.update({
      where: { id: listingId },
      data: { status: 'cancelled' },
      include: {
        seller: { select: { id: true, username: true, avatar: true } },
        skin: true,
      },
    });

    if (io) io.to('marketplace').emit('market:cancelled', updated);

    res.json(updated);
  } catch (err) {
    console.error('[cancelListing]', err);
    res.status(500).json({ error: 'Error al cancelar listing' });
  }
}

async function getMyListings(req, res) {
  try {
    const userId = req.userId;
    const listings = await prisma.listing.findMany({
      where: { sellerId: userId },
      orderBy: { createdAt: 'desc' },
      include: {
        skin: true,
        buyer: { select: { id: true, username: true, avatar: true } },
      },
    });
    res.json(listings);
  } catch (err) {
    console.error('[getMyListings]', err);
    res.status(500).json({ error: 'Error al obtener mis listings' });
  }
}

async function getHouseListings(req, res) {
  try {
    const houseId = await getHouseUserId();
    if (!houseId) return res.json({ items: [], total: 0 });

    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20));

    const where = { sellerId: houseId, status: 'active' };
    const [items, total] = await Promise.all([
      prisma.listing.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          seller: { select: { id: true, username: true, avatar: true } },
          skin: true,
        },
      }),
      prisma.listing.count({ where }),
    ]);

    res.json({ items, total, page, limit, totalPages: Math.max(1, Math.ceil(total / limit)) });
  } catch (err) {
    console.error('[getHouseListings]', err);
    res.status(500).json({ error: 'Error al obtener listings de la casa' });
  }
}

module.exports = {
  setIo,
  getListings,
  createListing,
  buyListing,
  cancelListing,
  getMyListings,
  getHouseListings,
};
