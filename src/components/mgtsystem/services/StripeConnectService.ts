import BaseService from './BaseService';

interface StartConnectResponse {
  ok: boolean;
  url?: string;
  error?: string;
  message?: string;
}

interface StatusResponse {
  ok: boolean;
  accountId?: string;
  detailsSubmitted?: boolean;
  chargesEnabled?: boolean;
  payoutsEnabled?: boolean;
  error?: string;
  message?: string;
}

interface DisconnectResponse {
  ok: boolean;
  error?: string;
}

// StripeConnectService.ts — update the interface
interface ReconnectResponse {
  ok:    boolean;
  ready?: boolean;
  url?:  string;
  error?: string;
  accountId?: string;
  chargesEnabled?: boolean;
  payoutsEnabled?: boolean;
  detailsSubmitted?: boolean;
}

interface HistoryResponse {
  ok:             boolean;
  hasHistory:     boolean;
  accountId:      string | null;
  disconnectedAt: string | null;
  disconnectedBy: string | null;
}

class StripeConnectService extends BaseService {
  startConnect(appOrigin: string) {
    return this.request<StartConnectResponse>(`/stripe/connect/start`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-app-origin': appOrigin,
      },
      body: JSON.stringify({ appOrigin }),
    });
  }

  getStatus() {
    return this.request<StatusResponse>(`/stripe/connect/status`);
  }

  disconnect() {
    return this.request<DisconnectResponse>(`/stripe/connect/disconnect`, {
      method: 'POST',
    });
  }

  /**
   * Reactivate the most recently disconnected Stripe account.
   * Clears disconnectedAt on the existing row and returns a fresh onboarding URL.
   */
  reconnect() {
    return this.request<ReconnectResponse>(`/stripe/connect/reconnect`, {
      method: 'POST',
    });
  }

  /**
   * Fetch the most recent Stripe row including disconnected ones.
   * Used by the UI to show previously connected account info after a disconnect.
   */
  getHistory() {
    return this.request<HistoryResponse>(`/stripe/connect/history`);
  }
}

export default new StripeConnectService();