// src/components/mgtsystem/services/DonationButtonService.ts

import BaseService from './BaseService';

import type {
  GetDonationButtonManageResponse,
  UpsertClubDonationButtonRequest,
  DonationButtonEmbedResponse,
} from '../../../shared/types/donationButton';

class DonationButtonService extends BaseService {
  /**
   * Get current donation button config + eligible payment methods
   * for the management UI.
   */
  getForManagement(clubId: string) {
    return this.request<GetDonationButtonManageResponse>(
      `/donation-buttons/${clubId}/manage`
    );
  }

  /**
   * Create or update the club's single donation button.
   */
  save(clubId: string, data: UpsertClubDonationButtonRequest) {
    return this.request<GetDonationButtonManageResponse>(
      `/donation-buttons/${clubId}`,
      {
        method: 'PUT',
        body: JSON.stringify(data),
      }
    );
  }

  /**
   * Get the generated embed HTML for the club's donation button.
   * Rejects (throws) if the button is not configured, disabled, or
   * the linked payment method is no longer usable.
   */
  getEmbed(clubId: string) {
    return this.request<DonationButtonEmbedResponse>(
      `/donation-buttons/${clubId}/embed`
    );
  }
}

export default new DonationButtonService();