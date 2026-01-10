// server/quiz/handlers/saveImpactCampaignEvent.js
import { connection, TABLE_PREFIX } from '../../config/database.js';

export async function saveImpactCampaignEvent(eventData) {
  try {
    const table = `${TABLE_PREFIX}impact_campaign_events`;

    const sql = `
      INSERT INTO ${table}
      (
        platform_campaign_id,
        campaign_id,
        room_id,
        host_id,
        host_name,
        chain,
        network,
        fee_token,
        host_wallet,
        charity_wallet,
        charity_name,
        total_raised,
        charity_amount,
        extras_revenue,
        host_fee_amount,
        number_of_players
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const params = [
      eventData.platformCampaignId ?? null,
      eventData.campaignId ?? null,  // ✅ NEW: campaign_id
      eventData.roomId,
      eventData.hostId ?? null,
      eventData.hostName ?? null,
      eventData.chain,
      eventData.network,
      eventData.feeToken,
      eventData.hostWallet ?? null,
      eventData.charityWallet ?? null,
      eventData.charityName ?? null,
      eventData.totalRaised ?? 0,
      eventData.charityAmount ?? 0,
      eventData.extrasRevenue ?? 0,
      eventData.hostFeeAmount ?? 0,
      eventData.numberOfPlayers ?? 0,
    ];

    const [result] = await connection.execute(sql, params);

    return { success: true, insertId: result.insertId };
  } catch (err) {
    console.error('[saveImpactCampaignEvent] ❌ Insert failed:', err);
    return { success: false, error: err?.message || String(err) };
  }
}



