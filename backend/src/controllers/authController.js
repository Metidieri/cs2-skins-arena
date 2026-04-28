const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../config/db');
const { calculateLevel } = require('../utils/levelSystem');

function publicUserShape(user) {
  return {
    id: user.id,
    email: user.email,
    username: user.username,
    balance: user.balance,
    avatar: user.avatar,
    level: user.level,
    experience: user.experience,
    levelData: calculateLevel(user.experience || 0),
  };
}

async function register(req, res) {
  try {
    const { email, username, password, referralCode: inputRefCode } = req.body;

    const existing = await prisma.user.findFirst({
      where: { OR: [{ email }, { username }] },
    });
    if (existing) {
      return res.status(400).json({ error: 'Email o username ya registrado' });
    }

    const hashed = await bcrypt.hash(password, 10);
    const myCode = (username.toUpperCase().slice(0, 4) + Math.random().toString(36).substring(2, 6).toUpperCase());

    let referredById = null;
    let referrer = null;
    if (inputRefCode) {
      referrer = await prisma.user.findUnique({ where: { referralCode: inputRefCode } });
      if (referrer) referredById = referrer.id;
    }

    const bonusCoins = referredById ? 1500 : 1000;

    const user = await prisma.user.create({
      data: {
        email,
        username,
        password: hashed,
        balance: bonusCoins,
        referralCode: myCode,
        referredBy: referredById,
      },
    });

    if (referrer) {
      await prisma.$transaction([
        prisma.user.update({ where: { id: referrer.id }, data: { balance: { increment: 500 } } }),
        prisma.transaction.create({ data: { userId: referrer.id, type: 'DEPOSIT', amount: 500, description: 'Bonus de referido' } }),
        prisma.transaction.create({ data: { userId: user.id, type: 'DEPOSIT', amount: 500, description: 'Bonus de referido - bienvenida' } }),
      ]);
    }

    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({ token, user: publicUserShape(user) });
  } catch (err) {
    console.error('[register]', err);
    res.status(500).json({ error: 'Error al registrar usuario' });
  }
}

async function login(req, res) {
  try {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '7d' });

    res.json({ token, user: publicUserShape(user) });
  } catch (err) {
    res.status(500).json({ error: 'Error al iniciar sesión' });
  }
}

async function me(req, res) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: {
        id: true, email: true, username: true, balance: true, avatar: true,
        createdAt: true, level: true, experience: true,
      },
    });
    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    res.json({ ...user, levelData: calculateLevel(user.experience || 0) });
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener usuario' });
  }
}

module.exports = { register, login, me };
