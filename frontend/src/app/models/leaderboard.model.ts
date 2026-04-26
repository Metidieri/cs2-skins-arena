export type LeaderboardType = 'earnings' | 'winrate' | 'games';

export interface LeaderboardEntry {
  rank: number;
  user: {
    id: number;
    username: string;
    avatar: string | null;
  };
  stat: number;
  gamesPlayed: number;
  winRate: number;
}

export interface LeaderboardResponse {
  type: LeaderboardType;
  results: LeaderboardEntry[];
}

export interface PublicProfileBattle {
  id: number;
  status: string;
  result?: string | null;
  winnerId?: number | null;
  playerAId: number;
  playerBId?: number | null;
  skinAId: number;
  skinBId?: number | null;
  createdAt: string;
  resolvedAt?: string | null;
  playerA?: { id: number; username: string; avatar: string | null };
  playerB?: { id: number; username: string; avatar: string | null };
}

export interface PublicProfileSkin {
  id: number;
  name: string;
  weapon: string;
  rarity: string;
  price: number;
  imageUrl: string;
}

export interface PublicProfileResponse {
  user: {
    id: number;
    username: string;
    avatar: string | null;
    createdAt: string;
  };
  stats: {
    wins: number;
    losses: number;
    winRate: number;
    totalEarnings: number;
    inventoryValue: number;
    inventoryCount: number;
  };
  inventory: PublicProfileSkin[];
  recentBattles: PublicProfileBattle[];
}
