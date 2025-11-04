// src/services/apiService.ts

function stripTrailingSlash(s: string) {
  return s.replace(/\/+$/, '');
}
function ensureLeadingSlash(s: string) {
  return s.startsWith('/') ? s : `/${s}`;
}

/** 🔧 Resolve bases at build time (no localhost fallback in prod/staging) */
const MGMT_API_BASE_URL = (() => {
  const v = import.meta.env.VITE_MGMT_API_URL?.trim();
  if (!v) throw new Error('VITE_MGMT_API_URL is missing at build time');
  return stripTrailingSlash(v);
})();

const QUIZ_API_BASE_URL = (() => {
  const v = import.meta.env.VITE_QUIZ_API_URL?.trim();
  if (!v) throw new Error('VITE_QUIZ_API_URL is missing at build time');
  return stripTrailingSlash(v);
})();

/** 🔎 One-time boot logs (safe to keep on staging) */
(() => {
  // Don’t log anything secret; just the bases + mode
  // eslint-disable-next-line no-console
  console.info(
    `[api] MODE=${import.meta.env.MODE} | MGMT_BASE=${MGMT_API_BASE_URL} | QUIZ_BASE=${QUIZ_API_BASE_URL}`
  );
})();

const Debug = true;

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
      let errorPayload: any = {};
      try {
        errorPayload = await res.json();
      } catch {
        /* ignore JSON parse errors */
      }
      const message =
        errorPayload?.error ||
        errorPayload?.message ||
        `HTTP ${res.status} ${res.statusText}`;
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

    const data = (await res.json()) as T;
    return data;
  }

  // ─────────────────────────────────────────────────────────
  // 🔐 MANAGEMENT API (uses MGMT_API_BASE_URL)
  // ─────────────────────────────────────────────────────────

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
      {
        method: 'POST',
        body: JSON.stringify(credentials),
      },
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

  // ─────────────────────────────────────────────────────────
  // 🎯 QUIZ API (uses QUIZ_API_BASE_URL)
  // ─────────────────────────────────────────────────────────

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
