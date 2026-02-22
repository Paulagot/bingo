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

class StripeConnectService extends BaseService {
  startConnect(appOrigin: string) {
    // BaseService likely adds Authorization automatically
    // We need the origin header so return_url points to 5174 / .ie / .co.uk correctly.
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
}

export default new StripeConnectService();