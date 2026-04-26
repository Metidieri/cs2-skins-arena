export type TransactionType = 'WIN' | 'LOSS' | 'DEPOSIT';

export interface Transaction {
  id: number;
  userId: number;
  type: TransactionType;
  amount: number;
  description: string | null;
  createdAt: string;
}

export interface BiggestWin {
  amount: number;
  description: string | null;
  createdAt: string;
}

export interface FavoriteWeapon {
  weapon: string;
  count: number;
}

export interface UserStats {
  wins: number;
  losses: number;
  totalBets: number;
  winRate: number;
  totalWon: number;
  totalLost: number;
  totalDeposited: number;
  netProfit: number;
  inventoryCount: number;
  inventoryValue: number;
  coinflipsPlayed?: number;
  coinflipsWon?: number;
  coinflipsLost?: number;
  jackpotsPlayed?: number;
  jackpotsWon?: number;
  marketplaceSales?: number;
  marketplacePurchases?: number;
  totalEarnings?: number;
  biggestWin?: BiggestWin | null;
  favoriteWeapon?: FavoriteWeapon | null;
}

export interface StatsResponse {
  user: {
    id: number;
    username: string;
    balance: number;
    createdAt: string;
  };
  stats: UserStats;
}

export interface UserProfile {
  id: number;
  email: string;
  username: string;
  balance: number;
  avatar: string | null;
  createdAt: string;
  inventoryCount: number;
}
