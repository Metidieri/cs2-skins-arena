const crypto = require('crypto');
const prisma = require('../config/db');
const { calculateResult, calculatePayout } = require('../utils/rouletteSystem');
const { addExperience } = require('../services/levelService');

const BETTING_DURATION_MS = 20_000;
const RESULT_DISPLAY_MS = 5_000;

let io = null;
let currentRound = null;
let consecutiveGreens = 0;
let accumulatedJackpot = 0;
let roundTimer = null;

function setIo(instance) {
  io = instance;
}

function init(ioInstance) {
  io = ioInstance;
  initRoulette().catch((err) => console.error('[roulette:init]', err));
}

async function initRoulette() {
  const bettingEndsAt = new Date(Date.now() + BETTING_DURATION_MS);
  const round = await prisma.rouletteRound.create({
    data: { status: 'betting', bettingEndsAt, consecutiveGreens },
  });

  currentRound = { ...round, bets: [] };

  if (io) {
    io.to('roulette').emit('roulette:new_round', {
      ...currentRound,
      consecutiveGreens,
      accumulatedJackpot,
    });
  }

  let secondsLeft = Math.ceil(BETTING_DURATION_MS / 1000);
  if (roundTimer) clearInterval(roundTimer);
  roundTimer = setInterval(() => {
    secondsLeft--;
    if (io) io.to('roulette').emit('roulette:timer', secondsLeft);
    if (secondsLeft <= 0) {
      clearInterval(roundTimer);
      roundTimer = null;
      resolveRound().catch((err) => console.error('[roulette:resolve]', err));
    }
  }, 1000);
}

async function resolveRound() {
  if (!currentRound) return;

  const seed = crypto.randomUUID();
  const result = calculateResult(seed);

  if (result.color === 'green') {
    consecutiveGreens++;
  } else {
    consecutiveGreens = 0;
  }

  const hasJackpot = consecutiveGreens >= 3;
  const jackpotToDistribute = hasJackpot ? accumulatedJackpot : 0;

  const bets = await prisma.rouletteBet.findMany({
    where: { roundId: currentRound.id },
    include: { user: { select: { id: true, username: true } } },
  });

  const totalGreenBets = bets
    .filter((b) => b.color === 'green')
    .reduce((sum, b) => sum + b.amount, 0);

  const payoutMap = [];

  await prisma.$transaction(async (tx) => {
    for (const bet of bets) {
      const payout = calculatePayout(bet, result, jackpotToDistribute, totalGreenBets);
      const won = payout > 0;

      await tx.rouletteBet.update({
        where: { id: bet.id },
        data: { won, payout },
      });

      if (won) {
        await tx.user.update({
          where: { id: bet.userId },
          data: { balance: { increment: payout } },
        });
        await tx.transaction.create({
          data: {
            userId: bet.userId,
            type: 'WIN',
            amount: payout,
            description: `Ruleta ganada (${result.color} ${result.n})`,
          },
        });
      }

      payoutMap.push({ userId: bet.userId, username: bet.user.username, won, payout, amount: bet.amount, color: bet.color });
    }

    await tx.rouletteRound.update({
      where: { id: currentRound.id },
      data: {
        status: 'completed',
        result: result.n,
        color: result.color,
        seed,
        resolvedAt: new Date(),
        consecutiveGreens,
      },
    });
  });

  // XP for losers
  for (const entry of payoutMap) {
    if (!entry.won) {
      const levelUpdate = await addExperience(entry.userId, entry.amount);
      if (io && levelUpdate?.leveledUp) {
        io.to(`user-${entry.userId}`).emit('user:leveled-up', {
          level: levelUpdate.level,
          xpGained: levelUpdate.xpGained,
          currentXp: levelUpdate.currentXp,
          xpNeeded: levelUpdate.xpNeeded,
        });
      }
    }
  }

  // Update accumulated jackpot
  const roundJackpotPool = currentRound.jackpotPool || 0;
  if (hasJackpot) {
    accumulatedJackpot = 0;
    consecutiveGreens = 0;
  } else {
    accumulatedJackpot += roundJackpotPool;
  }

  if (io) {
    io.to('roulette').emit('roulette:result', {
      roundId: currentRound.id,
      result: result.n,
      color: result.color,
      seed,
      payouts: payoutMap,
      consecutiveGreens,
      accumulatedJackpot,
      hasJackpot,
      jackpotDistributed: jackpotToDistribute,
    });
  }

  await new Promise((resolve) => setTimeout(resolve, RESULT_DISPLAY_MS));
  await initRoulette();
}

async function placeBet(req, res) {
  try {
    const userId = req.userId;
    const { color, amount: rawAmount } = req.body;
    const amount = parseFloat(rawAmount);

    if (!['red', 'black', 'green'].includes(color)) {
      return res.status(400).json({ error: 'Color inválido' });
    }
    if (!amount || amount < 1) {
      return res.status(400).json({ error: 'Cantidad mínima: 1 coin' });
    }
    if (!currentRound || currentRound.status !== 'betting') {
      return res.status(400).json({ error: 'No hay ronda de apuestas activa' });
    }
    if (new Date() > new Date(currentRound.bettingEndsAt)) {
      return res.status(400).json({ error: 'El tiempo de apuestas ha terminado' });
    }

    const user = await prisma.user.findUnique({ where: { id: userId }, select: { balance: true } });
    if (!user || user.balance < amount) {
      return res.status(400).json({ error: 'Saldo insuficiente' });
    }

    const jackpotContrib = amount * 0.05;

    const bet = await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: { balance: { decrement: amount } },
      });
      await tx.transaction.create({
        data: {
          userId,
          type: 'LOSS',
          amount: -amount,
          description: `Apuesta ruleta`,
        },
      });
      const created = await tx.rouletteBet.create({
        data: { roundId: currentRound.id, userId, color, amount },
        include: { user: { select: { id: true, username: true, level: true } } },
      });
      await tx.rouletteRound.update({
        where: { id: currentRound.id },
        data: {
          potTotal: { increment: amount },
          jackpotPool: { increment: jackpotContrib },
        },
      });
      return created;
    });

    // Keep in-memory round in sync
    currentRound.potTotal = (currentRound.potTotal || 0) + amount;
    currentRound.jackpotPool = (currentRound.jackpotPool || 0) + jackpotContrib;

    if (io) io.to('roulette').emit('roulette:bet_placed', bet);

    res.status(201).json(bet);
  } catch (err) {
    console.error('[placeBet]', err);
    res.status(500).json({ error: 'Error al registrar apuesta' });
  }
}

async function getCurrentRound(req, res) {
  try {
    if (!currentRound) {
      return res.json({ round: null, consecutiveGreens: 0, accumulatedJackpot: 0 });
    }
    const round = await prisma.rouletteRound.findUnique({
      where: { id: currentRound.id },
      include: {
        bets: { include: { user: { select: { id: true, username: true } } } },
      },
    });
    res.json({ round, consecutiveGreens, accumulatedJackpot });
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener ronda actual' });
  }
}

async function getRouletteHistory(req, res) {
  try {
    const history = await prisma.rouletteRound.findMany({
      where: { status: 'completed' },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: { id: true, result: true, color: true, potTotal: true, createdAt: true },
    });
    res.json(history);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener historial' });
  }
}

module.exports = { setIo, init, placeBet, getCurrentRound, getRouletteHistory };
