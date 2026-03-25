// src/components/puzzles/services/ChallengeService.ts

import BaseService from '../../mgtsystem/services/BaseService';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ScheduleEntry {
  week: number;
  puzzleType: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

export interface ScheduleRow {
  id: number;
  week_number: number;
  puzzle_type: string;
  difficulty: 'easy' | 'medium' | 'hard';
  unlocks_at: string | null;
}

export type Currency = 'eur' | 'gbp' | 'usd';

export interface Challenge {
  id: string;
  club_id: string;
  title: string;
  description: string | null;
  status: 'draft' | 'active' | 'completed' | 'cancelled';
  total_weeks: number;
  starts_at: string;
  created_at: string;
  weekly_price: number | null;      // pence/cents e.g. 300 = €3.00
  currency: Currency;
  platform_fee_percent: number;
  is_free: 0 | 1;
  player_count?: number;
  schedule?: ScheduleRow[];
}

export interface LeaderboardWeek {
  weekNumber: number;
  puzzleType: string;
  isCorrect: boolean;
  totalScore: number;
  playerAnswer: Record<string, unknown> | null;
  correctAnswer: Record<string, unknown> | null;
}

export interface LeaderboardEntry {
  rank: number;
  playerId: number;
  playerName: string;
  totalScore: number;
  weeksCompleted: number;
  weeks: LeaderboardWeek[];
}

export interface EnrolledPlayer {
  id: number;
  name: string;
  email: string;
  enrolled_at: string;
  status: string;
}

export interface CreateChallengePayload {
  title: string;
  description?: string;
  totalWeeks: number;
  startsAt: string;
  puzzleSchedule: ScheduleEntry[];
  isFree: boolean;
  weeklyPrice?: number;             // in pence/cents — only required if !isFree
  currency?: Currency;
}

// ─── Service ──────────────────────────────────────────────────────────────────

class ChallengeService extends BaseService {

  listChallenges() {
    return this.request<Challenge[]>('/puzzle-challenges', { method: 'GET' });
  }

  getChallenge(challengeId: string) {
    return this.request<Challenge>(`/puzzle-challenges/${challengeId}`, { method: 'GET' });
  }

  createChallenge(payload: CreateChallengePayload) {
    return this.request<Challenge>('/puzzle-challenges', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  updateStatus(challengeId: string, status: Challenge['status']) {
    return this.request<Challenge>(`/puzzle-challenges/${challengeId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  }

  getPlayers(challengeId: string) {
    return this.request<EnrolledPlayer[]>(`/puzzle-challenges/${challengeId}/players`, { method: 'GET' });
  }

  enrollPlayers(challengeId: string, playerIds: number[]) {
    return this.request<{ enrolled: number }>(`/puzzle-challenges/${challengeId}/players`, {
      method: 'POST',
      body: JSON.stringify({ playerIds }),
    });
  }

  getLeaderboard(challengeId: string) {
    return this.request<LeaderboardEntry[]>(`/puzzle-challenges/${challengeId}/leaderboard`, { method: 'GET' });
  }

  getCurrentWeek(challengeId: string) {
    return this.request<{ weekNumber: number; startsAt: string; totalWeeks: number }>(
      `/puzzle-challenges/${challengeId}/current-week`,
      { method: 'GET' }
    );
  }
}

export const challengeService = new ChallengeService();