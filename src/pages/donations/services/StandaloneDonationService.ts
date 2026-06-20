// src/pages/donations/services/StandaloneDonationService.ts
//
// Deliberately a SEPARATE file from
// src/components/embed/services/DonationCheckoutService.ts, even though
// 95% of the logic is identical. Two reasons:
//
// 1. The handoff doc is explicit that the embed page and its service
//    are reference-only for this task, not to be imported/modified.
//    Sharing the file (or importing it directly) would mean any future
//    edit to the embed flow risks silently changing this standalone
//    page's behavior too, and vice versa — these two pages are meant
//    to stay independent.
// 2. This page needs one extra outbound field (`returnPath`) that the
//    embed page's StartDonationCheckoutRequest never sends. Rather than
//    widening the shared type (which would let the embed page
//    accidentally start sending it too), this file types its own
//    request shape as a superset and passes the extra field straight
//    through in the fetch body — the backend reads it as a plain
//    optional property, no type plumbing needed on the shared type.
//
// Auth: same reasoning as the embed service — no BaseService, no auth
// header. A supporter on this page is never logged in, and even if a
// club admin happened to be signed into the dashboard in the same
// browser while testing, this call should stay anonymous.

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

// Superset of the shared request type — adds the one field this page
// needs that the embed page never sends. `returnPath` is OPTIONAL on
// the backend (see DonationCheckoutService.js patch); omitting it here
// would just mean Stripe falls back to the old hardcoded embed path,
// so there's no risk in widening the shape this way.
type StandaloneStartCheckoutRequest = Omit<StartDonationCheckoutRequest, 'appOrigin'> & {
  returnPath?: string;
};

class StandaloneDonationService {
  getPublicConfig(clubId: string) {
    return request<{ ok: true } & PublicDonationButtonConfig>(
      `/donations/${clubId}/config`
    );
  }

  startCheckout(clubId: string, data: StandaloneStartCheckoutRequest) {
    return request<StartDonationCheckoutResponse>(
      `/donations/${clubId}/checkout`,
      {
        method: 'POST',
        body: JSON.stringify({ ...data, appOrigin: getAppOrigin() }),
      }
    );
  }
}

export default new StandaloneDonationService();
