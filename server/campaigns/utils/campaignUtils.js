// server/campaigns/utils/campaignUtils.js
import { connection, TABLE_PREFIX } from '../../config/database.js';

/**
 * Resolve club_id from a campaign — used by public routes
 * so we never trust club_id from the request body.
 */
export async function getCampaignClubId(campaignId) {
  const [rows] = await connection.execute(
    `SELECT club_id FROM ${TABLE_PREFIX}campaigns WHERE id = ? LIMIT 1`,
    [campaignId]
  );
  if (!rows[0]) throw Object.assign(new Error('campaign_not_found'), { status: 404 });
  return rows[0].club_id;
}