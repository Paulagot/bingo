// client/src/services/campaignsService.ts
// Campaigns service extending BaseService

import BaseService from './baseServices';
import type { Campaign } from '../types/types';

export interface CreateCampaignForm {
  name: string;
  category?: string;
  description?: string;
  target_amount: number;
  start_date?: string;
  end_date?: string;
  tags?: string[];
}

class CampaignsService extends BaseService {
  /**
   * Get all campaigns for a club
   */
  async getClubCampaigns(clubId: string): Promise<{ campaigns: Campaign[] }> {
    return this.request<{ campaigns: Campaign[] }>(`/clubs/${clubId}/campaigns`);
  }

  /**
   * Get a single campaign by ID
   */
  async getCampaign(campaignId: string): Promise<{ campaign: Campaign }> {
    return this.request<{ campaign: Campaign }>(`/campaigns/${campaignId}`);
  }

  /**
   * Create a new campaign (automatically saved as draft)
   */
  async createCampaign(clubId: string, campaignData: CreateCampaignForm): Promise<{ campaign: Campaign; message: string }> {
    return this.request<{ campaign: Campaign; message: string }>(`/clubs/${clubId}/campaigns`, {
      method: 'POST',
      body: JSON.stringify(campaignData),
    });
  }

  /**
   * Update an existing campaign
   */
  async updateCampaign(campaignId: string, campaignData: Partial<CreateCampaignForm>): Promise<{ campaign: Campaign; message: string }> {
    return this.request<{ campaign: Campaign; message: string }>(`/campaigns/${campaignId}`, {
      method: 'PUT',
      body: JSON.stringify(campaignData),
    });
  }

  /**
   * Delete a campaign
   */
  async deleteCampaign(campaignId: string): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/campaigns/${campaignId}`, {
      method: 'DELETE',
    });
  }

  /**
   * ✅ Publish a campaign (makes it public, requires trust check)
   */
  async publishCampaign(campaignId: string): Promise<{ message: string; campaign: Campaign }> {
    return this.request<{ message: string; campaign: Campaign }>(`/campaigns/${campaignId}/publish`, {
      method: 'PATCH',
    });
  }

  /**
   * ✅ NEW: Unpublish a campaign (makes it draft again)
   */
  async unpublishCampaign(campaignId: string): Promise<{ message: string; campaign: Campaign }> {
    return this.request<{ message: string; campaign: Campaign }>(`/campaigns/${campaignId}/unpublish`, {
      method: 'PATCH',
    });
  }

  /**
   * Get public campaigns (only published campaigns)
   */
  async getPublicCampaigns(clubId: string): Promise<{ campaigns: Campaign[] }> {
    return this.request<{ campaigns: Campaign[] }>(`/clubs/${clubId}/campaigns/published`);
  }

  /**
   * Get active campaigns
   */
  async getActiveCampaigns(clubId: string): Promise<{ campaigns: Campaign[] }> {
    const response = await this.getClubCampaigns(clubId);
    const now = new Date();
    
    const activeCampaigns = response.campaigns.filter(campaign => {
      const startDate = campaign.start_date ? new Date(campaign.start_date) : null;
      const endDate = campaign.end_date ? new Date(campaign.end_date) : null;
      
      const hasStarted = !startDate || startDate <= now;
      const hasNotEnded = !endDate || endDate >= now;
      
      return hasStarted && hasNotEnded;
    });
    
    return { campaigns: activeCampaigns };
  }

  /**
   * Get upcoming campaigns
   */
  async getUpcomingCampaigns(clubId: string): Promise<{ campaigns: Campaign[] }> {
    const response = await this.getClubCampaigns(clubId);
    const now = new Date();
    
    const upcomingCampaigns = response.campaigns.filter(campaign => {
      const startDate = campaign.start_date ? new Date(campaign.start_date) : null;
      return startDate && startDate > now;
    });
    
    return { campaigns: upcomingCampaigns };
  }

  /**
   * Get ended campaigns
   */
  async getEndedCampaigns(clubId: string): Promise<{ campaigns: Campaign[] }> {
    const response = await this.getClubCampaigns(clubId);
    const now = new Date();
    
    const endedCampaigns = response.campaigns.filter(campaign => {
      const endDate = campaign.end_date ? new Date(campaign.end_date) : null;
      return endDate && endDate < now;
    });
    
    return { campaigns: endedCampaigns };
  }

  /**
   * Recalculate campaign financials
   */
  async recalculateCampaignFinancials(campaignId: string): Promise<{ message: string; financials: any }> {
    return this.request<{ message: string; financials: any }>(`/campaigns/${campaignId}/financials/recalculate`, {
      method: 'POST',
    });
  }

  /**
   * Get campaign financial breakdown
   */
  async getCampaignFinancials(campaignId: string): Promise<any> {
    return this.request<any>(`/campaigns/${campaignId}/financials`);
  }

  /**
   * Validate campaign data before submission
   */
  validateCampaignData(data: CreateCampaignForm): string[] {
    const errors: string[] = [];

    if (!data.name?.trim()) {
      errors.push('Campaign name is required');
    }

    if (!data.target_amount || data.target_amount <= 0) {
      errors.push('Target amount must be greater than 0');
    }

    if (data.start_date && data.end_date) {
      const startDate = new Date(data.start_date);
      const endDate = new Date(data.end_date);
      
      if (endDate <= startDate) {
        errors.push('End date must be after start date');
      }
    }

    return errors;
  }

  /**
   * Calculate campaign progress percentage
   */
  calculateProgress(targetAmount: number, totalRaised: number): number {
    if (targetAmount === 0) return 0;
    return Math.min((totalRaised / targetAmount) * 100, 100);
  }

  /**
   * Get campaign status
   */
  getCampaignStatus(campaign: Campaign): { status: string; label: string; color: string } {
    const now = new Date();
    const startDate = campaign.start_date ? new Date(campaign.start_date) : null;
    const endDate = campaign.end_date ? new Date(campaign.end_date) : null;

    if (endDate && endDate < now) {
      return { status: 'ended', label: 'Ended', color: 'gray' };
    }

    if (startDate && startDate > now) {
      return { status: 'upcoming', label: 'Upcoming', color: 'blue' };
    }

    return { status: 'active', label: 'Active', color: 'green' };
  }

  /**
   * Calculate time remaining
   */
  getTimeRemaining(campaign: Campaign): string | null {
    if (!campaign.end_date) return null;
    
    const now = new Date();
    const endDate = new Date(campaign.end_date);
    const diffTime = endDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return null;
    if (diffDays === 0) return 'Ends today';
    if (diffDays === 1) return '1 day left';
    if (diffDays <= 30) return `${diffDays} days left`;
    
    const diffMonths = Math.ceil(diffDays / 30);
    return `${diffMonths} month${diffMonths > 1 ? 's' : ''} left`;
  }

  /**
   * Check if campaign can be edited
   */
  canEditCampaign(campaign: Campaign): boolean {
    const endDate = campaign.end_date ? new Date(campaign.end_date) : null;
    const now = new Date();
    
    // Can edit if campaign hasn't ended
    return !endDate || endDate > now;
  }

  /**
   * Check if campaign can be deleted
   */
  canDeleteCampaign(campaign: Campaign): boolean {
    // Can delete if no events or financials associated
    return (campaign.total_events || 0) === 0 && 
           (campaign.total_raised || 0) === 0;
  }

  /**
   * Format campaign for display
   */
  formatCampaignForDisplay(campaign: Campaign): any {
    const status = this.getCampaignStatus(campaign);
    const timeRemaining = this.getTimeRemaining(campaign);
    
    return {
      ...campaign,
      formatted_target: this.formatCurrency(campaign.target_amount),
      formatted_raised: this.formatCurrency(campaign.total_raised || 0),
      formatted_profit: this.formatCurrency(campaign.total_profit || 0),
      progress: this.calculateProgress(campaign.target_amount, campaign.total_raised || 0),
      status: status.status,
      status_label: status.label,
      status_color: status.color,
      time_remaining: timeRemaining,
      can_edit: this.canEditCampaign(campaign),
      can_delete: this.canDeleteCampaign(campaign),
    };
  }

  /**
   * Get campaign categories
   */
  getCampaignCategories(): Array<{ label: string; value: string }> {
    return [
      { label: 'Building Project', value: 'building' },
      { label: 'Equipment Purchase', value: 'equipment' },
      { label: 'Program Funding', value: 'program' },
      { label: 'Emergency Relief', value: 'emergency' },
      { label: 'Community Development', value: 'community' },
      { label: 'Education', value: 'education' },
      { label: 'Other', value: 'other' },
    ];
  }
}

// Export singleton instance
const campaignsService = new CampaignsService();
export default campaignsService;