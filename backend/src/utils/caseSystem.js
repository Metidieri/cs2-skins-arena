const CASES = {
  'weapon-case': {
    name: 'Weapon Case',
    price: 250,
    houseEdge: 0.1,
    items: [
      { rarity: 'consumer',   probability: 79.92, priceRange: [10,  50]   },
      { rarity: 'industrial', probability: 15.98, priceRange: [30,  100]  },
      { rarity: 'mil-spec',   probability: 3.20,  priceRange: [80,  300]  },
      { rarity: 'restricted', probability: 0.64,  priceRange: [200, 800]  },
      { rarity: 'classified', probability: 0.128, priceRange: [500, 2000] },
      { rarity: 'covert',     probability: 0.026, priceRange: [1500, 5000]},
    ],
  },
  'premium-case': {
    name: 'Premium Case',
    price: 1000,
    houseEdge: 0.1,
    items: [
      { rarity: 'mil-spec',   probability: 79.92, priceRange: [200, 500]   },
      { rarity: 'restricted', probability: 15.98, priceRange: [400, 1200]  },
      { rarity: 'classified', probability: 3.20,  priceRange: [800, 3000]  },
      { rarity: 'covert',     probability: 0.64,  priceRange: [2000, 8000] },
      { rarity: 'contraband', probability: 0.26,  priceRange: [5000, 20000]},
    ],
  },
};

function openCase(caseType, seed) {
  const caseData = CASES[caseType];
  if (!caseData) throw new Error('Caja no encontrada');

  const hash = parseInt(seed.substring(0, 8), 16);
  const roll = (hash % 10000) / 100; // 0.00 — 99.99

  let accumulated = 0;
  for (const item of caseData.items) {
    accumulated += item.probability;
    if (roll < accumulated) {
      return { rarity: item.rarity, priceRange: item.priceRange, roll };
    }
  }
  const last = caseData.items[caseData.items.length - 1];
  return { rarity: last.rarity, priceRange: last.priceRange, roll };
}

module.exports = { CASES, openCase };
