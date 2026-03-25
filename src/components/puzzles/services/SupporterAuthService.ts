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
}

export interface ScheduleRow {
  week_number: number;
  puzzle_type: string;
  difficulty:  string;
  unlocks_at:  string | null;
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

  async verifyToken(token: string): Promise<{ accessToken: string; supporter: SupporterProfile }> {
    const result = await this.request<{ accessToken: string; supporter: SupporterProfile }>(
      `/supporter-auth/verify?token=${encodeURIComponent(token)}`
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

  getEnrollmentStatus(challengeId: string) {
    return this.request<{ enrolled: boolean; status: string | null }>(
      `/puzzle-subscriptions/status/${challengeId}`
    );
  }

  getMyChallenges() {
    return this.request<SupporterChallenge[]>('/puzzle-subscriptions/my-challenges');
  }
}

export const supporterAuthService = new SupporterAuthService();