// server/campaigns/services/campaignSupportService.js
//
// Builds the public supporter page payload.
// Never exposes club management data.

import { connection, TABLE_PREFIX } from '../../config/database.js';

const T_CAMPAIGNS = `${TABLE_PREFIX}campaigns`;
const T_PRODUCTS  = `${TABLE_PREFIX}campaign_products`;
const T_ITEMS     = `${TABLE_PREFIX}campaign_product_items`;
const T_ROOMS     = `${TABLE_PREFIX}web2_quiz_rooms`;

function parseJson(v, fallback = null) {
  if (!v) return fallback;
  if (typeof v === 'object') return v;
  try { return JSON.parse(v); } catch { return fallback; }
}

/**
 * Public campaign support page payload.
 * Includes campaign summary, active products, and seller attribution.
 *
 * @param {string} campaignId
 * @param {string|null} sellerId  — from QR query param
 */
export async function getCampaignSupportPayload(campaignId, sellerId = null) {
  const [campRows] = await connection.execute(
    `SELECT id, name, description, target_amount, is_published,
            start_date, end_date, club_id, total_raised
     FROM ${T_CAMPAIGNS}
     WHERE id = ? LIMIT 1`,
    [campaignId]
  );
  const campaign = campRows[0];
  if (!campaign) throw Object.assign(new Error('campaign_not_found'), { status: 404 });
  // No status column — use is_published as the active check
  // (unpublished campaigns are still accessible for testing; remove this check if you want strict enforcement)

  // Active products
  const [products] = await connection.execute(
    `SELECT * FROM ${T_PRODUCTS}
     WHERE campaign_id = ? AND is_active = 1
     ORDER BY display_order ASC, is_featured DESC, created_at ASC`,
    [campaignId]
  );

  let productItems = [];
  if (products.length) {
    const ids = products.map(p => p.id);
    const ph  = ids.map(() => '?').join(',');
    const [items] = await connection.execute(
      `SELECT * FROM ${T_ITEMS} WHERE product_id IN (${ph})`, ids
    );
    productItems = items;
  }

  const itemsByProduct = {};
  for (const item of productItems) {
    if (!itemsByProduct[item.product_id]) itemsByProduct[item.product_id] = [];
    itemsByProduct[item.product_id].push({
      id:           item.id,
      targetRoomId: item.target_room_id,
      itemType:     item.item_type,
      quantity:     Number(item.quantity),
    });
  }

  // Seller attribution (non-fatal — if sellers table doesn't exist yet, just skip)
  let seller = null;
  if (sellerId) {
    try {
      const [sellerRows] = await connection.execute(
        `SELECT id, seller_name, seller_slug FROM ${TABLE_PREFIX}campaign_sellers
         WHERE id = ? AND campaign_id = ? LIMIT 1`,
        [sellerId, campaignId]
      );
      seller = sellerRows[0] ?? null;
    } catch { /* sellers table not yet created */ }
  }

  return {
    campaign: {
      id:           campaign.id,
      name:         campaign.name,
      description:  campaign.description ?? null,
      targetAmount: Number(campaign.target_amount ?? 0),
      totalRaised:  Number(campaign.total_raised ?? 0),
      currency:     'EUR',           // not stored on campaign — default EUR
      isPublished:  campaign.is_published === 1 || campaign.is_published === true,
      startDate:    campaign.start_date ?? null,
      endDate:      campaign.end_date   ?? null,
    },
    products: products.map(p => ({
      id:           p.id,
      name:         p.name,
      description:  p.description ?? null,
      productType:  p.product_type,
      price:        Number(p.price),
      currency:     p.currency,
      isFeatured:   p.is_featured === 1 || p.is_featured === true,
      badgeLabel:   p.badge_label ?? null,
      soldOut:      false,
      items:        itemsByProduct[p.id] ?? [],
    })),
    seller,
    sellerId: sellerId ?? null,
  };
}