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
  max_players_per_game: number;
  max_rounds: number;
  round_types_allowed: string[];
  extras_allowed: string[];
  concurrent_rooms: number;
  game_credits_remaining: number;
  plan_id: number | null;
  plan_code?: string;
}

