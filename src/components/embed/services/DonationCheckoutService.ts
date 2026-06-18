// src/components/embed/services/DonationCheckoutService.ts
//
// Deliberately does NOT extend BaseService, unlike every other *Service.ts
// in this codebase. BaseService.getAuthHeaders() reads auth_token from
// localStorage and attaches it as a Bearer token whenever one exists.
// Donors are never logged in — there's no token to attach in the normal
// case — but if this code ever runs in a context where a club ADMIN
// happens to be logged in (e.g. they're testing their own donation embed
// while signed into the dashboard in the same browser), inheriting
// BaseService would silently attach their session token to what's
// supposed to be an anonymous public request. Simpler and safer to use a
// plain fetch with no auth concept at all.
//
// Lives under src/components/embed/ rather than mgtsystem/ — this code
// ships inside the public embed page, not the admin dashboard bundle.

import type {
  PublicDonationButtonConfig,
  StartDonationCheckoutRequest,
  StartDonationCheckoutResponse,
} from '../../../shared/types/donationCheckout';

const API_BASE_URL = import.meta.env.PROD
  ? '/api'
  : 'http://localhost:3001/api';

/**
 * Mirrors the FundRaisely-domain detection your codebase already has
 * elsewhere (per earlier discussion) — this embed page is always loaded
 * from one of FundRaisely's own domains (.ie / .co.uk / localhost /
 * staging), regardless of which arbitrary site the surrounding <iframe>
 * tag is pasted onto. window.location here is the embed PAGE's own
 * location, not the parent page's — an iframe's window.location always
 * reflects what's loaded inside the frame, not the host page, so this is
 * safe and correct even though the iframe sits on a third-party site.
 */
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

class DonationCheckoutService {
  /**
   * Fetched on embed page load. Throws if the button isn't configured,
   * is disabled, or its method is no longer eligible — the embed page
   * should catch this and show a clear inactive state rather than a
   * blank/broken picker.
   */
  getPublicConfig(clubId: string) {
    return request<{ ok: true } & PublicDonationButtonConfig>(
      `/donations/${clubId}/config`
    );
  }

  /**
   * Starts checkout for the amount the supporter picked. appOrigin is
   * filled in here automatically (not something the embed page's UI
   * needs to pass in) — see getAppOrigin above for why this is always
   * correct even inside a third-party iframe.
   */
  startCheckout(
    clubId: string,
    data: Omit<StartDonationCheckoutRequest, 'appOrigin'>
  ) {
    return request<StartDonationCheckoutResponse>(
      `/donations/${clubId}/checkout`,
      {
        method: 'POST',
        body: JSON.stringify({ ...data, appOrigin: getAppOrigin() }),
      }
    );
  }
}

export default new DonationCheckoutService();