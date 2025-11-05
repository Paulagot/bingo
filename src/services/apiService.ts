// src/services/apiService.ts
function stripTrailingSlash(s: string) {
  return s.replace(/\/+$/, '');
}

const MGMT_API_BASE_URL = import.meta.env.VITE_MGMT_API_URL || 'https://mgtsystem-production.up.railway.app/api';
const QUIZ_API_BASE_URL = (() => {
  const v = import.meta.env.VITE_QUIZ_API_URL?.trim();
  // Default to same-origin (empty string = relative paths)
  return stripTrailingSlash(v || '');
})();
const Debug = false; // Set to true to enable debug logs

class ApiService {
  private getAuthHeaders() {
    const token = localStorage.getItem('auth_token');
    return {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` })
    };
  }

  

  private async request<T>(endpoint: string, options: RequestInit = {}, useManagementAPI: boolean = false): Promise<T> {
    const baseURL = useManagementAPI ? MGMT_API_BASE_URL : QUIZ_API_BASE_URL;
    const url = baseURL ? `${baseURL}${endpoint}` : endpoint;
    
    const config: RequestInit = {
      headers: this.getAuthHeaders(),
      ...options,
    };

   if (Debug) {
     console.log(`🌐 API Request: ${options.method || 'GET'} ${url}`);
     console.log(`   Using: ${useManagementAPI ? 'Management API' : 'Quiz API'}`);
     console.log(`   Base URL: ${baseURL}`);
   }

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error || errorData.message || `HTTP error! status: ${response.status}`;
        if (Debug) {
          console.error(`💥 API Error (${endpoint}):`, {
            status: response.status,
            statusText: response.statusText,
            error: errorMessage,
            url,
            response: errorData
          });
        }
        throw new Error(errorMessage);
      }

      return await response.json();
    } catch (error) {
     if (Debug) console.error(`💥 API Error (${endpoint}):`, error);
      throw error;
    }
  }

  // 🔐 AUTHENTICATION (calls management system)
async registerClub(data: { 
  name: string; 
  email: string; 
  password: string;
  gdprConsent: boolean;
  privacyPolicyAccepted: boolean;
  marketingConsent?: boolean;
}) {
  return this.request('/clubs/register', {
    method: 'POST',
    body: JSON.stringify({
      name: data.name,
      email: data.email,
      password: data.password,
      gdprConsent: data.gdprConsent,
      privacyPolicyAccepted: data.privacyPolicyAccepted,
      marketingConsent: data.marketingConsent || false
    }),
  }, true); // Add this parameter to use management API
}


  async loginClub(credentials: { email: string; password: string }) {
    return this.request<{
      message: string;
      token: string;
      user: any;
      club: any;
    }>('/clubs/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    }, true); // Use management API
  }

  async getCurrentUser() {
    return this.request<{
      user: any;
      club: any;
    }>('/clubs/me', {}, true); // Use management API
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

