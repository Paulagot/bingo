// src/services/apiService.ts

function stripTrailingSlash(s: string) {
  return s.replace(/\/+$/, '');
}
function ensureLeadingSlash(s: string) {
  return s.startsWith('/') ? s : `/${s}`;
}

/**
 * ✅ Use same-origin defaults so staging/prod need NO Vite envs.
 * - MGMT calls hit '/mgmt/api/*' → your Node server proxies to MGMT_TARGET.
 * - QUIZ calls use '' (same origin) → '/quiz/api/*' on your app.
 * You can still override in local dev with Vite envs if you want.
 */
const MGMT_API_BASE_URL = (() => {
  const v = import.meta.env.VITE_MGMT_API_URL?.trim();
  // Default to same-origin proxy
  return stripTrailingSlash(v || '/mgmt/api');
})();

const QUIZ_API_BASE_URL = (() => {
  const v = import.meta.env.VITE_QUIZ_API_URL?.trim();
  // Default to same-origin
  return stripTrailingSlash(v || '');
})();

const Debug = true;

// One-time boot log
(() => {
  // eslint-disable-next-line no-console
  console.info(
    `[api] MODE=${import.meta.env.MODE} | MGMT_BASE=${MGMT_API_BASE_URL || '(relative /mgmt/api)'} | QUIZ_BASE=${QUIZ_API_BASE_URL || '(relative)'}`
  );
})();

class ApiService {
  private getAuthHeaders() {
    const token = localStorage.getItem('auth_token');
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
    useManagementAPI = false
  ): Promise<T> {
    const base = useManagementAPI ? MGMT_API_BASE_URL : QUIZ_API_BASE_URL;
    const url = `${base}${ensureLeadingSlash(endpoint)}`;

    if (Debug) {
      // eslint-disable-next-line no-console
      console.log(`🌐 API Request: ${options.method || 'GET'} ${url}`);
    }

    const res = await fetch(url, {
      credentials: 'include',
      ...options,
      headers: {
        ...this.getAuthHeaders(),
        ...(options.headers || {}),
      },
    });

    if (!res.ok) {
      let payload: any = {};
      try { payload = await res.json(); } catch { /* ignore */ }
      const message =
        payload?.error || payload?.message || `HTTP ${res.status} ${res.statusText}`;
      if (Debug) {
        // eslint-disable-next-line no-console
        console.error(`💥 API Error (${endpoint}):`, {
          status: res.status,
          statusText: res.statusText,
          message,
        });
      }
      throw new Error(message);
    }

    return (await res.json()) as T;
  }

  // ───────────── MANAGEMENT (proxied by server) ─────────────
  async registerClub(data: {
    name: string;
    email: string;
    password: string;
    gdprConsent: boolean;
    privacyPolicyAccepted: boolean;
    marketingConsent?: boolean;
  }) {
    return this.request(
      '/clubs/register',
      {
        method: 'POST',
        body: JSON.stringify({
          name: data.name,
          email: data.email,
          password: data.password,
          gdprConsent: data.gdprConsent,
          privacyPolicyAccepted: data.privacyPolicyAccepted,
          marketingConsent: !!data.marketingConsent,
        }),
      },
      true
    );
  }

  async loginClub(credentials: { email: string; password: string }) {
    return this.request<{
      message: string;
      token: string;
      user: any;
      club: any;
    }>(
      '/clubs/login',
      { method: 'POST', body: JSON.stringify(credentials) },
      true
    );
  }

  async getCurrentUser() {
    return this.request<{ user: any; club: any }>(
      '/clubs/me',
      {},
      true
    );
  }

  // ─────────────────── QUIZ API (same origin) ───────────────────
  async getEntitlements() {
    return this.request<{
      max_players_per_game: number;
      max_rounds: number;
      round_types_allowed: string[];
      extras_allowed: string[];
      concurrent_rooms: number;
      game_credits_remaining: number;
      plan_id: number | null;
      plan_code?: string;
    }>('/quiz/api/me/entitlements');
  }

  async createWeb3Room(roomData: { config: any; roomId: string; hostId: string }) {
    return this.request<{
      roomId: string;
      hostId: string;
      contractAddress: string;
      deploymentTxHash: string;
      roomCaps: any;
      verified: boolean;
    }>('/quiz/api/create-web3-room', {
      method: 'POST',
      body: JSON.stringify(roomData),
    });
  }

  async createRoom(roomData: { config: any; roomId: string; hostId: string }) {
    return this.request<{
      roomId: string;
      hostId: string;
      roomCaps: any;
    }>('/quiz/api/create-room', {
      method: 'POST',
      body: JSON.stringify(roomData),
    });
  }
}

export const apiService = new ApiService();
export default apiService;

