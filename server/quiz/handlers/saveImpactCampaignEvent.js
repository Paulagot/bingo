// server/quiz/handlers/saveImpactCampaignEvent.js
import mysql from 'mysql2/promise';
import { dbConfig } from '../../config/database';  // adjust if your config path differs

/**
 * Insert completion data for Web3 Impact Campaign leaderboard
 */
export async function saveImpactCampaignEvent(eventData) {
  let connection;

  try {
    connection = await mysql.createConnection(dbConfig);

    const sql = `
      INSERT INTO fundraisely_impact_campaign_events (
        room_id,
        host_id,
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
        prizes_value,
        number_of_players
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const params = [
      eventData.roomId,
      eventData.hostId || null,
      eventData.chain,
      eventData.network,
      eventData.feeToken,
      eventData.hostWallet,
      eventData.charityWallet,
      eventData.charityName,
      eventData.totalRaised,
      eventData.charityAmount,
      eventData.extrasRevenue,
      eventData.hostFeeAmount,
      eventData.prizesValue,
      eventData.numberOfPlayers
    ];

    await connection.execute(sql, params);

    console.log(`💾 [ImpactCampaign] Saved event for room ${eventData.roomId}`);
    return { success: true };
  } catch (error) {
    console.error(`❌ [ImpactCampaign] Failed to save event:`, error);
    return { success: false, error };
  } finally {
    if (connection) await connection.end();
  }
}
