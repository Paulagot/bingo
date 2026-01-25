// src/shared/types/user.ts
// User and authentication types

export interface User {
  id: string;
  club_id: string;
  name: string;
  email: string;
  role: string;
}

export interface Club {
  id: string;
  name: string;
  email: string;
}

export interface AuthUser {
  user: User;
  club: Club;
  token?: string;
}

export interface Entitlements {
  game_credits_remaining?: number;
  max_players_per_game?: number;
  max_rounds?: number;
  plan_id?: number;
  plan_code?: string;
  quiz_features?: {
    eventLinking?: boolean;
    [key: string]: any;
  };
  quizFeatures?: {
    eventLinking?: boolean;
    [key: string]: any;
  };
  // allow extra fields without TS moaning
  [key: string]: any;
}

