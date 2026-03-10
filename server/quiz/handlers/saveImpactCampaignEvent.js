// server/quiz/handlers/saveImpactCampaignEvent.js
import { connection, TABLE_PREFIX } from '../../config/database.js';
import { toEur, getTokenPriceEur } from '../../mgtsystem/services/Tokenpriceservice.js';

/**
 * Saves a completed Web3 quiz room to the impact ledger.
 *
 * EUR columns added (require migration — see bottom of file):
 *   total_raised_eur    decimal(18,4)
 *   charity_amount_eur  decimal(18,4)
 *   host_fee_amount_eur decimal(18,4)
 *   token_price_eur     decimal(18,8)   ← snapshot of price at time of save
 *
 * All four columns are nullable — if the price API is down we store NULL
 * rather than a wrong value of 0.
 */
export async function saveImpactCampaignEvent(eventData) {
  try {
    const table = `${TABLE_PREFIX}impact_campaign_events`;

    // ------------------------------------------------------------------
    // 1) Resolve the token code
    //    eventData.feeToken should already be a SolanaTokenCode string
    //    e.g. 'SOL', 'BONK', 'USDG' — matching solanaTokenConfig.ts
    // ------------------------------------------------------------------
    const tokenCode = eventData.feeToken ?? null;

    // ------------------------------------------------------------------
    // 2) Fetch EUR price once for this token
    //    toEur() handles caching — safe to call multiple times
    // ------------------------------------------------------------------
    let tokenPriceEur = null;
    let totalRaisedEur = null;
    let charityAmountEur = null;
    let hostFeeAmountEur = null;

    if (tokenCode) {
      try {
        tokenPriceEur = await getTokenPriceEur(tokenCode);

        if (tokenPriceEur !== null) {
          // toEur() = displayAmount * tokenPriceEur, rounded to 4dp
          totalRaisedEur    = await toEur(eventData.totalRaised    ?? 0, tokenCode);
          charityAmountEur  = await toEur(eventData.charityAmount  ?? 0, tokenCode);
          hostFeeAmountEur  = await toEur(eventData.hostFeeAmount  ?? 0, tokenCode);
        }

        console.log(`[saveImpactCampaignEvent] 💶 EUR conversion for ${tokenCode}:`, {
          tokenPriceEur,
          totalRaisedEur,
          charityAmountEur,
          hostFeeAmountEur,
        });
      } catch (priceErr) {
        // Price fetch failed — store raw amounts only, EUR cols stay NULL
        console.warn(
          `[saveImpactCampaignEvent] ⚠️ Price fetch failed for ${tokenCode}, EUR cols will be NULL:`,
          priceErr?.message
        );
      }
    }

    // ------------------------------------------------------------------
    // 3) Insert into impact ledger
    // ------------------------------------------------------------------
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
        number_of_players,
        token_price_eur,
        total_raised_eur,
        charity_amount_eur,
        host_fee_amount_eur
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const params = [
      eventData.platformCampaignId  ?? null,
      eventData.campaignId          ?? null,
      eventData.roomId,
      eventData.hostId              ?? null,
      eventData.hostName            ?? null,
      eventData.chain,
      eventData.network,
      tokenCode,
      eventData.hostWallet          ?? null,
      eventData.charityWallet       ?? null,
      eventData.charityName         ?? null,
      eventData.totalRaised         ?? 0,
      eventData.charityAmount       ?? 0,
      eventData.extrasRevenue       ?? 0,
      eventData.hostFeeAmount       ?? 0,
      eventData.numberOfPlayers     ?? 0,
      // EUR snapshot columns (nullable)
      tokenPriceEur,
      totalRaisedEur,
      charityAmountEur,
      hostFeeAmountEur,
    ];

    const [result] = await connection.execute(sql, params);

    return {
      success: true,
      insertId: result.insertId,
      eur: {
        tokenPriceEur,
        totalRaisedEur,
        charityAmountEur,
        hostFeeAmountEur,
      },
    };
  } catch (err) {
    console.error('[saveImpactCampaignEvent] ❌ Insert failed:', err);
    return { success: false, error: err?.message || String(err) };
  }
}


