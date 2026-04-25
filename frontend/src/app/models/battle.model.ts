export interface BattlePlayer {
  id: string;
  username: string;
  avatar?: string;
}

export interface BattleSkin {
  id: string;
  name: string;
  weapon: string;
  rarity: string;
  price: number;
  imageUrl: string;
}

export interface Battle {
  id: string;
  playerAId: string;
  playerBId?: string;
  winnerId?: string;
  skinAId: string;
  skinBId?: string;
  status: 'waiting' | 'in_progress' | 'completed';
  result?: 'heads' | 'tails';
  seed: string;
  createdAt: string;
  resolvedAt?: string;
  playerA?: BattlePlayer;
  playerB?: BattlePlayer;
  skinA?: BattleSkin;
  skinB?: BattleSkin;
}

export interface BattleResolvedEvent {
  battleId: string;
  winnerId: string;
  winnerUsername: string;
  result: 'heads' | 'tails';
  seed: string;
  skinA?: BattleSkin;
  skinB?: BattleSkin;
  playerA?: BattlePlayer;
  playerB?: BattlePlayer;
}
