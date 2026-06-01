// src/shared/types/user.ts
// User and authentication types

export interface User {
  id: string;
  club_id: string;
  name: string;        // person's name (e.g. "Jane Smith")
  email: string;
  role: string;
}

export interface Club {
  id: string;
  name: string;                // club name (e.g. "Greenfield Community Club")
  email: string;
  reporting_currency: string;  // ISO 4217 code e.g. 'EUR', 'GBP'
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
  [key: string]: any;
}

