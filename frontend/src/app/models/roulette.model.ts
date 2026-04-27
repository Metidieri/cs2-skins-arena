export interface RouletteRound {
  id: string;
  status: string;
  result: number | null;
  color: string | null;
  potTotal: number;
  jackpotPool: number;
  consecutiveGreens: number;
  seed: string;
  bettingEndsAt: string;
  createdAt: string;
  resolvedAt: string | null;
  bets?: RouletteBet[];
}

export interface RouletteBet {
  id: string;
  roundId: string;
  userId: number;
  color: string;
  amount: number;
  won: boolean;
  payout: number;
  createdAt: string;
  user?: { id: number; username: string; level?: number };
}

export interface RouletteResult {
  roundId: string;
  result: number;
  color: string;
  seed: string;
  payouts: {
    userId: number;
    username: string;
    won: boolean;
    payout: number;
    amount: number;
    color: string;
  }[];
  consecutiveGreens: number;
  accumulatedJackpot: number;
  hasJackpot: boolean;
  jackpotDistributed: number;
}

export interface RouletteHistoryItem {
  id: string;
  result: number;
  color: string;
  potTotal: number;
  createdAt: string;
}

export interface RouletteState {
  round: RouletteRound | null;
  consecutiveGreens: number;
  accumulatedJackpot: number;
}
