export interface JackpotEntryUser {
  id: string;
  username: string;
  avatar?: string;
}

export interface JackpotEntrySkin {
  id: string;
  name: string;
  weapon?: string;
  imageUrl: string;
  price: number;
  rarity: string;
}

export interface JackpotEntry {
  id: string;
  jackpotId: string;
  userId: string;
  skinId: string;
  value: number;
  createdAt: string;
  user: JackpotEntryUser;
  skin: JackpotEntrySkin;
  percentage?: number;
}

export interface JackpotPlayerStat {
  userId: string;
  value: number;
  percentage: number;
}

export interface Jackpot {
  id: string;
  status: 'open' | 'completed';
  seed: string;
  winnerId?: string;
  totalValue: number;
  resolvedAt?: string;
  createdAt: string;
  entries: JackpotEntry[];
  winner?: JackpotEntryUser;
  playerStats?: JackpotPlayerStat[];
}

export interface JackpotResolvedEvent {
  jackpotId: string;
  winnerId: string;
  winnerUsername: string;
  seed: string;
  totalValue: number;
  entries: JackpotEntry[];
  winnerChance: number;
}

export interface JackpotEntryEvent {
  jackpotId: string;
  entry: JackpotEntry;
  jackpot: Jackpot;
}

export interface JackpotTimerEvent {
  jackpotId: string;
  seconds: number;
}
