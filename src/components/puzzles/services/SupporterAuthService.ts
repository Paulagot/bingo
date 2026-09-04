// src/components/puzzles/services/SupporterAuthService.ts

import BaseService from '../../mgtsystem/services/BaseService';

const STORAGE_KEY = 'supporter_auth_token';

export interface SupporterProfile {
  id:         string;
  name:       string;
  email:      string;
  club_id:    string;
  type:       string;
  created_at: string;
}

export interface PublicChallenge {
  id:           string;
  club_id:      string;
  title:        string;
  description:  string | null;
  total_weeks:  number;
  starts_at:    string;
  weekly_price: number | null;
  currency:     string;
  is_free:      0 | 1;
  status:       string;
  club_name:    string;
  club_logo_url?:               string | null;
  club_primary_color?:          string | null;
  club_background_color?:       string | null;
  club_text_on_primary_color?:  string | null;
   /** Linked public event copy. */
  summary?: string | null;
 

  /** Linked event fundraising information. Values are in currency units, not cents. */
  goal_amount?: number | string | null;
  raised_amount?: number | string | null;
  event_id?: string | null;


}

export interface ScheduleRow {
  week_number: number;
  puzzle_type: string;
  difficulty:  string;
  unlocks_at:  string | null;
  is_correct:  0 | 1 | null;
}

export interface SupporterChallenge {
  id:                string;
  title:             string;
  description:       string | null;
  status:            string;
  total_weeks:       number;
  starts_at:         string;
  is_free:           0 | 1;
  weekly_price:      number | null;
  currency:          string;
  enrolled_at:       string;
  enrollment_status: string;
}

// ── Overall / cumulative leaderboard ──────────────────────────────────────────
//
// Mirrors ChallengeService's LeaderboardEntry/LeaderboardWeek shape (same
// backend response - GET /puzzle-challenges/:challengeId/leaderboard, which
// is authenticateAny and returns identical JSON for a club token or a
// supporter token). Kept as a separate local type here rather than imported
// from ChallengeService, since that service is club-side (mgtsystem) and
// this one is the player-side auth service - they shouldn't depend on each
// other. No answers/solutions in this payload; see challengeService.js's
// getLeaderboard for why that's safe to expose.

export interface SupporterLeaderboardWeek {
  weekNumber:       number;
  puzzleType:       string;
  isCorrect:        boolean;
  totalScore:       number;
  timeTakenSeconds: number | null;
  submittedAt:      string | null;
}

export interface SupporterLeaderboardEntry {
  rank:           number;
  playerId:       number;
  playerName:     string;
  totalScore:     number;
  weeksCompleted: number;
  weeks:          SupporterLeaderboardWeek[];
}

class SupporterAuthService extends BaseService {

  // ── Token storage ───────────────────────────────────────────────────────────

  getSupporterToken(): string | null {
    return localStorage.getItem(STORAGE_KEY);
  }

  setSupporterToken(token: string): void {
    localStorage.setItem(STORAGE_KEY, token);
  }

  clearSupporterToken(): void {
    localStorage.removeItem(STORAGE_KEY);
  }

  override isAuthenticated(): boolean {
    return !!this.getSupporterToken();
  }

  protected override getAuthHeaders(): Record<string, string> {
    const token = this.getSupporterToken();
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  }

  // ── Auth flows ──────────────────────────────────────────────────────────────

  requestMagicLink(payload: {
    email:        string;
    name?:        string;
    challengeId?: string;
    clubId:       string;
  }) {
    return this.request<{ ok: boolean }>('/supporter-auth/magic-link', {
      method: 'POST',
      body:   JSON.stringify(payload),
    });
  }

  async verifyToken(
    token: string,
    challengeId?: string
  ): Promise<{ accessToken: string; supporter: SupporterProfile }> {
    const params = new URLSearchParams({ token });
    if (challengeId) params.set('challengeId', challengeId);

    const result = await this.request<{ accessToken: string; supporter: SupporterProfile }>(
      `/supporter-auth/verify?${params.toString()}`
    );
    this.setSupporterToken(result.accessToken);
    return result;
  }

  getMe() {
    return this.request<SupporterProfile>('/supporter-auth/me');
  }

  // ── Challenge flows ─────────────────────────────────────────────────────────

  getPublicChallenge(challengeId: string) {
    return this.request<PublicChallenge>(
      `/puzzle-subscriptions/challenge/${challengeId}`
    );
  }

  getPublicChallengeByCode(joinCode: string) {
    return this.request<PublicChallenge>(
      `/puzzle-subscriptions/join/${joinCode}`
    );
  }

  getSchedule(challengeId: string) {
    return this.request<ScheduleRow[]>(
      `/puzzle-subscriptions/schedule/${challengeId}`
    );
  }

  joinFree(challengeId: string) {
    return this.request<{ enrolled: boolean; challengeId: string }>(
      '/puzzle-subscriptions/join-free',
      { method: 'POST', body: JSON.stringify({ challengeId }) }
    );
  }

  /**
   * Start Stripe Checkout (subscription mode) for a paid challenge.
   * Public endpoint - no supporter token needed up front, since the
   * backend creates the supporter record as part of this call. Returns
   * a Stripe Checkout URL; the caller is responsible for redirecting to
   * it (this service never does window.location itself, consistent
   * with every other method here just returning data).
   */
  createCheckoutSession(payload: {
    challengeId: string;
    name:        string;
    email:       string;
  }) {
    return this.request<{ url: string }>(
      '/puzzle-subscriptions/checkout',
      { method: 'POST', body: JSON.stringify(payload) }
    );
  }

  /**
   * Exchange a Stripe Checkout Session id for a supporter token, once
   * the player lands back from Stripe on /challenges/:id/play. Stores
   * the returned token exactly like verifyToken does, so isAuthenticated()
   * becomes true immediately after this resolves - no separate login
   * step needed post-payment.
   */
  async exchangeSession(
    sessionId: string,
    challengeId: string
  ): Promise<{ accessToken: string; supporter: SupporterProfile }> {
    const result = await this.request<{ accessToken: string; supporter: SupporterProfile }>(
      '/puzzle-subscriptions/exchange-session',
      { method: 'POST', body: JSON.stringify({ sessionId, challengeId }) }
    );
    this.setSupporterToken(result.accessToken);
    return result;
  }

  getEnrollmentStatus(challengeId: string) {
    return this.request<{ enrolled: boolean; status: string | null }>(
      `/puzzle-subscriptions/status/${challengeId}`
    );
  }

  getMyChallenges() {
    return this.request<SupporterChallenge[]>('/puzzle-subscriptions/my-challenges');
  }

  /**
   * Cumulative leaderboard across every week of the challenge. Same
   * endpoint the club dashboard's ChallengeLeaderboardPage uses
   * (GET /puzzle-challenges/:challengeId/leaderboard), but called here
   * with the supporter's own bearer token - the route is authenticateAny,
   * so either token is accepted and the JSON shape is identical.
   */
  getOverallLeaderboard(challengeId: string) {
    return this.request<SupporterLeaderboardEntry[]>(
      `/puzzle-challenges/${challengeId}/leaderboard`
    );
  }
}

export const supporterAuthService = new SupporterAuthService();