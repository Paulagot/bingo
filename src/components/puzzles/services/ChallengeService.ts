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

export interface ChallengeSponsor {
  name: string;
  role?: string;
}

export interface Challenge {
  id: string;
  club_id: string;
  title: string;
  description: string | null;
  sponsors: ChallengeSponsor[];
  status: 'draft' | 'active' | 'completed' | 'cancelled';
  total_weeks: number;
  starts_at: string;
  created_at: string;
  // The linked fundraisely_web2_quiz_rooms room, created alongside the
  // challenge in challengeService.createChallenge (server-side). This is
  // the id ScheduleSubscriptionModal passes to onSaved(), and the same
  // id the event_integrations link (external_ref) and quiz_payment_ledger
  // rows (room_id) key off — see EventIntegrationsService/stripeWebhooks.
  // Nullable because room creation is a non-fatal, best-effort step.
  room_id: string | null;
  weekly_price: number | null;      // pence/cents e.g. 300 = €3.00
  currency: Currency;
  platform_fee_percent: number;
  is_free: 0 | 1;
  player_count?: number;
  schedule?: ScheduleRow[];
  // Present only in the response right after updateStatus(id, 'cancelled')
  // — a summary of how many subscribers' Stripe subscriptions were
  // actually cancelled vs failed, so the UI can surface partial failures
  // rather than silently assume everything succeeded.
  stripeCancelSummary?: { cancelledCount: number; failedCount: number; errors: string[] };
}
export interface LeaderboardWeek {
  weekNumber: number;
  puzzleType: string;
  isCorrect: boolean;
  totalScore: number;
  timeTakenSeconds: number | null;
  submittedAt: string | null;
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
  puzzleSchedule?: ScheduleEntry[];
  isFree: boolean;
  weeklyPrice?: number;             // in pence/cents — only required if !isFree
  currency?: Currency;
  sponsors?: ChallengeSponsor[];
}

// ─── Service ──────────────────────────────────────────────────────────────────

class ChallengeService extends BaseService {

  listChallenges() {
    return this.request<Challenge[]>('/puzzle-challenges', { method: 'GET' });
  }

  getChallenge(challengeId: string) {
    return this.request<Challenge>(`/puzzle-challenges/${challengeId}`, { method: 'GET' });
  }

  /**
   * Reverse lookup for the mgtsystem drawer, which only ever holds a
   * room_id (from fundraisely_event_integrations), not the challengeId.
   * Returns null (not a thrown error) on 404 so callers can render an
   * "unlinked" state rather than an error state.
   */
  async getChallengeByRoomId(roomId: string): Promise<Challenge | null> {
    try {
      return await this.request<Challenge>(`/puzzle-challenges/by-room/${roomId}`, { method: 'GET' });
    } catch (err) {
      if ((err as Error).message?.includes('404')) return null;
      throw err;
    }
  }

  createChallenge(payload: CreateChallengePayload) {
    return this.request<Challenge>('/puzzle-challenges', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  /**
   * Full edit — only succeeds server-side while status === 'draft'.
   * Throws with message 'challenge_not_editable' (409) if the challenge
   * has already been activated — callers should prevent reaching this
   * in the first place (see SetupTabSubscription's edit button, only
   * shown for drafts) but the backend is the real enforcement point.
   */
  updateChallenge(challengeId: string, payload: CreateChallengePayload) {
    return this.request<Challenge>(`/puzzle-challenges/${challengeId}`, {
      method: 'PATCH',
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