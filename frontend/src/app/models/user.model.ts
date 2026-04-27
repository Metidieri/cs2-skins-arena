export interface LevelData {
  level: number;
  currentXp: number;
  xpNeeded: number;
  progress: number;
}

export interface User {
  id: number;
  email: string;
  username: string;
  balance: number;
  avatar?: string;
  level?: number;
  experience?: number;
  levelData?: LevelData;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  username: string;
  password: string;
}
