const prisma = require('../config/db');

async function adminOnly(req, res, next) {
  if (!req.userId) return res.status(401).json({ error: 'No autenticado' });
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { role: true },
    });
    if (!user || user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Acceso denegado' });
    }
    next();
  } catch (err) {
    res.status(500).json({ error: 'Error de autenticación' });
  }
}

module.exports = adminOnly;
