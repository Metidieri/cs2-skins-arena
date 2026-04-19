const prisma = require('../config/db');

async function getAllSkins(req, res) {
  try {
    const skins = await prisma.skin.findMany({ orderBy: { price: 'desc' } });
    res.json(skins);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener skins' });
  }
}

async function getUserSkins(req, res) {
  try {
    const userSkins = await prisma.userSkin.findMany({
      where: { userId: req.userId },
      include: { skin: true },
    });
    res.json(userSkins.map((us) => us.skin));
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener inventario' });
  }
}

module.exports = { getAllSkins, getUserSkins };
