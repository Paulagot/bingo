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
}

export default new StripeConnectService();