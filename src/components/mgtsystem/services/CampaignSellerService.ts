// src/components/mgtsystem/services/CampaignSellerService.ts

import BaseService from './BaseService';

export interface CampaignSeller {
  id:         string;
  campaignId: string;
  sellerName: string;
  sellerSlug: string;
  isActive:   boolean;
  notes:      string | null;
  createdAt:  string;
  updatedAt:  string;
  stats?: {
    orderCount:     number;
    confirmedTotal: number;
    claimedTotal:   number;
    lastSaleAt:     string | null;
  };
}

export interface PublicSellerStats {
  seller: {
    id:           string;
    sellerName:   string;
    sellerSlug:   string;
    campaignName: string;
  };
  stats: {
    orderCount:     number;
    confirmedTotal: number;
    claimedTotal:   number;
    currency:       string;
  };
}

class CampaignSellerService extends BaseService {
  private base = '/campaigns';

  async listSellers(campaignId: string): Promise<{ sellers: CampaignSeller[] }> {
    return this.request(`${this.base}/${encodeURIComponent(campaignId)}/sellers`);
  }

  async createSeller(
    campaignId: string,
    sellerName: string,
    notes?: string
  ): Promise<{ seller: CampaignSeller }> {
    return this.request(`${this.base}/${encodeURIComponent(campaignId)}/sellers`, {
      method: 'POST',
      body: JSON.stringify({ sellerName, notes }),
    });
  }

  async updateSeller(
    campaignId: string,
    sellerId: string,
    updates: { sellerName?: string; notes?: string; isActive?: boolean }
  ): Promise<{ seller: CampaignSeller }> {
    return this.request(
      `${this.base}/${encodeURIComponent(campaignId)}/sellers/${encodeURIComponent(sellerId)}`,
      { method: 'PATCH', body: JSON.stringify(updates) }
    );
  }

  async deleteSeller(
    campaignId: string,
    sellerId: string
  ): Promise<{ deleted: boolean; deactivated: boolean }> {
    return this.request(
      `${this.base}/${encodeURIComponent(campaignId)}/sellers/${encodeURIComponent(sellerId)}`,
      { method: 'DELETE' }
    );
  }
}

export default new CampaignSellerService();
