// src/components/donationModal/services/DonationModalService.ts
//
// Shared by BOTH the standalone donation page (StandaloneDonatePage.tsx)
// AND the new in-page donation modal (DonationModal.tsx). Originally
// written as a standalone-page-only file; renamed/widened once it
// became clear the modal needed the exact same three calls
// (getPublicConfig, startCheckout, getStatus) — no reason to duplicate.
//
// Deliberately a SEPARATE file from
// src/components/embed/services/DonationCheckoutService.ts (the iframe
// embed's own service) for the same reason as before: the embed flow
// and everything built here are meant to stay independent, so a future
// edit to one never silently changes the other.
//
// Auth: no BaseService, no auth header — same reasoning as the embed
// service. A supporter is never logged in; this stays a plain
// anonymous fetch even if a club admin happens to be signed in
// elsewhere in the same browser.

import type {
  PublicDonationButtonConfig,
  StartDonationCheckoutRequest,
  StartDonationCheckoutResponse,
} from '../../../shared/types/donationCheckout';

const API_BASE_URL = import.meta.env.PROD
  ? '/api'
  : 'http://localhost:3001/api';

function getAppOrigin(): string {
  return window.location.origin;
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const error = new Error(
      errorData.message || errorData.error || `HTTP error! status: ${response.status}`
    ) as any;
    Object.keys(errorData).forEach((key) => {
      if (key !== 'error' && key !== 'message') {
        error[key] = errorData[key];
      }
    });
    throw error;
  }

  return response.json();
}

// Superset of the shared request type — adds the one field this needs
// that the embed page never sends. `returnPath` is OPTIONAL on the
// backend (see DonationCheckoutService.js patch); omitting it just
// means Stripe falls back to the old hardcoded embed path, so widening
// the shape this way carries no risk.
type DonationModalStartCheckoutRequest = Omit<StartDonationCheckoutRequest, 'appOrigin'> & {
  returnPath?: string;
};

class DonationModalService {
  getPublicConfig(clubId: string) {
    return request<{ ok: true } & PublicDonationButtonConfig>(
      `/donations/${clubId}/config`
    );
  }

  startCheckout(clubId: string, data: DonationModalStartCheckoutRequest) {
    return request<StartDonationCheckoutResponse>(
      `/donations/${clubId}/checkout`,
      {
        method: 'POST',
        body: JSON.stringify({ ...data, appOrigin: getAppOrigin() }),
      }
    );
  }

  /**
   * Polls the new GET /api/donations/:clubId/:donationId/status route
   * (server/donations/api/donationStatusRouter.js) — used by the modal
   * to detect confirmation without any postMessage/relay mechanism.
   */
  getStatus(clubId: string, donationId: string) {
    return request<{ ok: true; status: 'pending' | 'confirmed' | 'failed' | 'expired'; amount: number; currency: string }>(
      `/donations/${clubId}/${donationId}/status`
    );
  }
}

export default new DonationModalService();