// src/components/puzzles/services/publicLeaderboardService.ts
//
// Client for the two PUBLIC leaderboard endpoints. No token is ever sent:
// these pages are shareable links for anyone — players, parents, potential
// joiners — so the service must work with no localStorage state at all.

import BaseService from '../../mgtsystem/services/BaseService';

// ─── Response types ──────────────────────────────────────────────────────────
// These mirror the JSON shapes built in server challengeService.js
// (getWeekLeaderboard / getPublicLeaderboardSummary). Nullable fields are
// typed `| null` (key always present, value may be null) rather than `?`
// (key may be absent) — the backend always includes them.

export interface PublicChallengeMeta {
  id: string;
  title: string;
  status: 'active' | 'completed';
  totalWeeks: number;
}

export interface WeekLeaderboardEntry {
  rank: number;
  playerName: string;
  totalScore: number;
  isCorrect: boolean;
  timeTakenSeconds: number | null;
  /** ISO datetime string — convert with `new Date(...)` at display time. */
  submittedAt: string | null;
}

export interface WeekLeaderboard {
  challenge: PublicChallengeMeta;
  weekNumber: number;
  puzzleType: string;
  difficulty: string;
  /** True only once the challenge has completed — until then the board is
   *  rolling and late joiners can still submit this puzzle. */
  isFinal: boolean;
  entries: WeekLeaderboardEntry[];
}

export interface WeekSummaryTopEntry {
  rank: number;
  playerName: string;
  totalScore: number;
  isCorrect: boolean;
  timeTakenSeconds: number | null;
}

export interface WeekSummary {
  weekNumber: number;
  puzzleType: string;
  difficulty: string;
  isUnlocked: boolean;
  playerCount: number;
  top: WeekSummaryTopEntry[];
}

export interface LeaderboardSummary {
  challenge: PublicChallengeMeta;
  isFinal: boolean;
  weeks: WeekSummary[];
}

// ─── Service ─────────────────────────────────────────────────────────────────

class PublicLeaderboardService extends BaseService {
  /**
   * Public endpoints: send NO Authorization header, ever. A stale or
   * wrong-audience token in localStorage must not be able to break a
   * public page (and there is nothing here worth authenticating).
   */
  protected override getAuthHeaders(): Record<string, string> {
    return { 'Content-Type': 'application/json' };
  }

  getSummary(challengeId: string) {
    return this.request<LeaderboardSummary>(
      `/puzzle-challenges/public/${challengeId}/leaderboard-summary`
    );
  }

  getWeekLeaderboard(challengeId: string, weekNumber: number) {
    return this.request<WeekLeaderboard>(
      `/puzzle-challenges/public/${challengeId}/weeks/${weekNumber}/leaderboard`
    );
  }
}

export const publicLeaderboardService = new PublicLeaderboardService();