const express = require('express');
const prisma = require('../config/db');

const router = express.Router();

router.get('/history', async (req, res) => {
  try {
    const messages = await prisma.chatMessage.findMany({
      orderBy: { createdAt: 'asc' },
      take: 50,
      include: {
        user: { select: { id: true, username: true, level: true } },
      },
    });
    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener historial del chat' });
  }
});

module.exports = router;
