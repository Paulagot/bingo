// server/src/services/CampaignService.js
import { connection, TABLE_PREFIX } from '../../config/database.js';
import { v4 as uuidv4 } from 'uuid';

class CampaignService {
  constructor() {
    this.prefix = TABLE_PREFIX;
  }

  // ---- helpers ----
  _safeJsonParseArray(value, fallback = []) {
    if (!value) return fallback;
    try {
      const parsed = typeof value === 'string' ? JSON.parse(value) : value;
      return Array.isArray(parsed) ? parsed : fallback;
    } catch (e) {
      return fallback;
    }
  }

  _normalizeStringArray(arr) {
    if (!Array.isArray(arr)) return [];
    return arr
      .map((v) => (typeof v === 'string' ? v.trim() : ''))
      .filter(Boolean);
  }

  _hydrateCampaignRow(row) {
    if (!row) return row;

    // tags: stored as JSON string or JSON
    row.tags = this._safeJsonParseArray(row.tags, []);

    // impact_area_ids: stored as JSON string or JSON
    row.impact_area_ids = this._safeJsonParseArray(row.impact_area_ids, []);

    return row;
  }

  async createCampaign(clubId, campaignData) {
    const {
      name,
      description,
      target_amount,
      category,
      start_date,
      end_date,
      tags,
      impact_area_ids,
    } = campaignData;

    const campaignId = uuidv4();

    const tagsJson = tags && Array.isArray(tags) ? JSON.stringify(this._normalizeStringArray(tags)) : null;

    const impactAreasJson =
      impact_area_ids && Array.isArray(impact_area_ids)
        ? JSON.stringify(this._normalizeStringArray(impact_area_ids))
        : null;

    // Campaigns are created as drafts by default (is_published = FALSE)
    await database.connection.execute(
      `INSERT INTO ${this.prefix}campaigns (
        id, club_id, name, description, target_amount,
        category, start_date, end_date, tags, impact_area_ids, is_published
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, FALSE)`,
      [
        campaignId,
        clubId,
        name,
        description,
        target_amount,
        category || null,
        start_date || null,
        end_date || null,
        tagsJson,
        impactAreasJson,
      ]
    );

    const [rows] = await database.connection.execute(
      `SELECT * FROM ${this.prefix}campaigns WHERE id = ?`,
      [campaignId]
    );

    const campaign = Array.isArray(rows) ? rows[0] : null;
    return this._hydrateCampaignRow(campaign);
  }

  /**
   * Publish a campaign - makes it visible to the public
   * Trust status should be checked before calling this method
   */
  async publishCampaign(campaignId, clubId) {
    const [result] = await database.connection.execute(
      `UPDATE ${this.prefix}campaigns 
       SET is_published = TRUE 
       WHERE id = ? AND club_id = ?`,
      [campaignId, clubId]
    );

    if (result.affectedRows === 0) {
      throw new Error('Campaign not found');
    }

    // Return the updated campaign
    return await this.getCampaignById(campaignId, clubId);
  }

  /**
   * Unpublish a campaign - makes it a draft again
   */
  async unpublishCampaign(campaignId, clubId) {
    const [result] = await database.connection.execute(
      `UPDATE ${this.prefix}campaigns 
       SET is_published = FALSE 
       WHERE id = ? AND club_id = ?`,
      [campaignId, clubId]
    );

    if (result.affectedRows === 0) {
      throw new Error('Campaign not found');
    }

    // Return the updated campaign
    return await this.getCampaignById(campaignId, clubId);
  }

  async getCampaignsByClub(clubId) {
    const [rows] = await database.connection.execute(
      `SELECT * FROM ${this.prefix}campaigns WHERE club_id = ? ORDER BY created_at DESC`,
      [clubId]
    );

    return (rows || []).map((c) => this._hydrateCampaignRow(c));
  }

  /**
   * Get only published campaigns for a club (for public pages)
   */
  async getPublishedCampaignsByClub(clubId) {
    const [rows] = await database.connection.execute(
      `SELECT * FROM ${this.prefix}campaigns 
       WHERE club_id = ? 
       AND is_published = TRUE 
       ORDER BY created_at DESC`,
      [clubId]
    );

    return (rows || []).map((c) => this._hydrateCampaignRow(c));
  }

  async getCampaignById(campaignId, clubId) {
    const [rows] = await database.connection.execute(
      `SELECT * FROM ${this.prefix}campaigns WHERE id = ? AND club_id = ?`,
      [campaignId, clubId]
    );

    const campaign = Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
    return this._hydrateCampaignRow(campaign);
  }

  async updateCampaign(campaignId, clubId, updateData) {
    const allowedFields = [
      'name',
      'description',
      'target_amount',
      'category',
      'start_date',
      'end_date',
      'tags',
      'impact_area_ids',
      'is_published', // Allow updating is_published
    ];

    const updateFields = Object.keys(updateData).filter(
      (key) => allowedFields.includes(key) && updateData[key] !== undefined
    );

    if (updateFields.length === 0) {
      throw new Error('No valid fields to update');
    }

    const processedData = { ...updateData };

    if (processedData.tags !== undefined) {
      processedData.tags = JSON.stringify(this._normalizeStringArray(processedData.tags));
    }

    if (processedData.impact_area_ids !== undefined) {
      processedData.impact_area_ids = JSON.stringify(
        this._normalizeStringArray(processedData.impact_area_ids)
      );
    }

    const setClause = updateFields.map((field) => `${field} = ?`).join(', ');
    const values = updateFields.map((field) => processedData[field]);
    values.push(campaignId, clubId);

    const [result] = await database.connection.execute(
      `UPDATE ${this.prefix}campaigns SET ${setClause} WHERE id = ? AND club_id = ?`,
      values
    );

    if (result.affectedRows === 0) {
      return null;
    }

    return await this.getCampaignById(campaignId, clubId);
  }

  async deleteCampaign(campaignId, clubId) {
    const [eventRows] = await database.connection.execute(
      `SELECT COUNT(*) as event_count FROM ${this.prefix}events WHERE campaign_id = ?`,
      [campaignId]
    );

    const eventCount = Array.isArray(eventRows) ? eventRows[0].event_count : 0;

    if (eventCount > 0) {
      throw new Error('Cannot delete campaign with associated events');
    }

    const [result] = await database.connection.execute(
      `DELETE FROM ${this.prefix}campaigns WHERE id = ? AND club_id = ?`,
      [campaignId, clubId]
    );

    return result.affectedRows > 0;
  }

  async getCampaignStats(campaignId, clubId) {
    const [campaignRows] = await database.connection.execute(
      `SELECT 
        c.*,
        COUNT(e.id) as total_events,
        COALESCE(SUM(e.actual_amount), 0) as total_raised,
        COALESCE(SUM(e.net_profit), 0) as total_profit
      FROM ${this.prefix}campaigns c
      LEFT JOIN ${this.prefix}events e ON c.id = e.campaign_id
      WHERE c.id = ? AND c.club_id = ?
      GROUP BY c.id`,
      [campaignId, clubId]
    );

    if (!Array.isArray(campaignRows) || campaignRows.length === 0) {
      return null;
    }

    const campaign = this._hydrateCampaignRow(campaignRows[0]);

    campaign.progress_percentage =
      campaign.target_amount > 0
        ? Math.round((campaign.total_raised / campaign.target_amount) * 100)
        : 0;

    return campaign;
  }
}

export default CampaignService;
