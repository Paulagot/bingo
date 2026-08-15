// src/services/ClubBrandingService.ts
import BaseService from '../components/mgtsystem/services/BaseService';

export interface ClubBranding {
  brand_logo_url:              string | null;
  brand_primary_color:         string | null;
  brand_background_color:      string | null;
  brand_text_on_primary_color: string | null;
}

class ClubBrandingService extends BaseService {
  async get(clubId: string): Promise<ClubBranding> {
    const res = await this.request<{ branding: ClubBranding }>(
      `/clubs/${clubId}/branding`
    );
    return res.branding;
  }

  async save(clubId: string, data: ClubBranding): Promise<ClubBranding> {
    const res = await this.request<{ branding: ClubBranding }>(
      `/clubs/${clubId}/branding`,
      {
        method: 'PATCH',
        body: JSON.stringify(data),
      }
    );
    return res.branding;
  }
}

export default new ClubBrandingService();