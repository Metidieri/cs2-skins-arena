const ROULETTE_NUMBERS = [
  { n: 0,  color: 'green' },
  { n: 1,  color: 'red'   },
  { n: 2,  color: 'black' },
  { n: 3,  color: 'red'   },
  { n: 4,  color: 'black' },
  { n: 5,  color: 'red'   },
  { n: 6,  color: 'black' },
  { n: 7,  color: 'red'   },
  { n: 8,  color: 'black' },
  { n: 9,  color: 'red'   },
  { n: 10, color: 'black' },
  { n: 11, color: 'red'   },
  { n: 12, color: 'black' },
  { n: 13, color: 'red'   },
  { n: 14, color: 'black' },
];

function calculateResult(seed) {
  const hash = parseInt(seed.substring(0, 8), 16);
  const idx = hash % 15;
  return ROULETTE_NUMBERS[idx];
}

function calculatePayout(bet, result, jackpotPool, totalGreenBets) {
  if (bet.color !== result.color) return 0;
  if (result.color === 'green') {
    const basePayout = bet.amount * 14;
    const jackpotShare =
      totalGreenBets > 0 ? (bet.amount / totalGreenBets) * jackpotPool : 0;
    return basePayout + jackpotShare;
  }
  return bet.amount * 2;
}

module.exports = { ROULETTE_NUMBERS, calculateResult, calculatePayout };
