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
  // Plan identity
  plan_id: number | null;
  plan_code: string;

  // Scope this was resolved for ('quiz' | 'elimination' | ...)
  scope?: string;
  credit_key?: string;

  // Caps
  max_players_per_game: number;
  max_rounds: number;
  concurrent_rooms: number;

  // Allowed types
  round_types_allowed: string[];
  extras_allowed: string[];

  // Credits
  game_credits_remaining: number;

  // Game features — quiz_features is the legacy key, game_features is generic
  quiz_features?: Record<string, boolean | undefined>;
  game_features?: Record<string, boolean | undefined>;
  quizFeatures?: Record<string, boolean | undefined>; // legacy alias

  // Management entitlements
  mgt?: {
    features?: Record<string, boolean | undefined>;
    limits?: Record<string, number | undefined>;
  };

  // Allow additional fields
  [key: string]: unknown;
}

