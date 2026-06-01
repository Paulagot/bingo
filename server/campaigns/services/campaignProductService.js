// server/campaigns/services/campaignProductService.js
//
// CRUD for campaign products and product items.
// All write operations validate club/campaign ownership.
// club_id is always taken from auth middleware — never trusted from client.

import { connection, TABLE_PREFIX } from '../../config/database.js';
import { nanoid } from 'nanoid';

const T_PRODUCTS      = `${TABLE_PREFIX}campaign_products`;
const T_ITEMS         = `${TABLE_PREFIX}campaign_product_items`;
const T_CAMPAIGNS     = `${TABLE_PREFIX}campaigns`;          // existing table
const T_ROOMS         = `${TABLE_PREFIX}web2_quiz_rooms`;   // existing rooms table

// ─── Helpers ────────────────────────────────────────────────────────────────

function parseJson(value, fallback = null) {
  if (!value) return fallback;
  if (typeof value === 'object') return value;
  try { return JSON.parse(value); } catch { return fallback; }
}

function newId() {
  return nanoid(21);
}

/**
 * Assert a campaign exists and belongs to the given club.
 * Throws structured errors matching the spec error codes.
 */
async function assertCampaignOwnership(campaignId, clubId) {
  if (!campaignId) throw Object.assign(new Error('missing_campaign_id'), { status: 400 });

  const [rows] = await connection.execute(
    `SELECT id, club_id, is_published FROM ${T_CAMPAIGNS} WHERE id = ? LIMIT 1`,
    [campaignId]
  );

  if (!rows[0]) throw Object.assign(new Error('campaign_not_found'), { status: 404 });
  if (rows[0].club_id !== clubId) throw Object.assign(new Error('campaign_not_found'), { status: 404 });

  return rows[0];
}

/**
 * Assert a product exists and belongs to the campaign + club.
 */
async function assertProductOwnership(productId, campaignId, clubId) {
  const [rows] = await connection.execute(
    `SELECT * FROM ${T_PRODUCTS} WHERE id = ? AND campaign_id = ? AND club_id = ? LIMIT 1`,
    [productId, campaignId, clubId]
  );
  if (!rows[0]) throw Object.assign(new Error('product_not_found'), { status: 404 });
  return rows[0];
}

/**
 * Assert a room belongs to the club.
 * The rooms table has no campaign_id column — rooms are owned by the club
 * and referenced by products. Validation is by club ownership only.
 */
async function assertRoomLinkedToCampaign(roomId, campaignId, clubId) {
  const [rows] = await connection.execute(
    `SELECT room_id FROM ${T_ROOMS}
     WHERE room_id = ? AND club_id = ? LIMIT 1`,
    [roomId, clubId]
  );
  if (!rows[0]) throw Object.assign(new Error('invalid_product_item_event'), { status: 400 });
}

/**
 * Check whether a product has any confirmed/claimed sales.
 * Used to block hard-delete and certain edits.
 */
async function productHasSales(productId) {
  const T_ORDER_ITEMS = `${TABLE_PREFIX}campaign_product_order_items`;
  const [rows] = await connection.execute(
    `SELECT COUNT(*) AS cnt FROM ${T_ORDER_ITEMS} WHERE product_id = ? LIMIT 1`,
    [productId]
  );
  return (rows[0]?.cnt ?? 0) > 0;
}

// ─── Product CRUD ────────────────────────────────────────────────────────────

/**
 * List all products (with their items) for a campaign.
 */
export async function listProducts(campaignId, clubId) {
  await assertCampaignOwnership(campaignId, clubId);

  const [products] = await connection.execute(
    `SELECT * FROM ${T_PRODUCTS}
     WHERE campaign_id = ? AND club_id = ?
     ORDER BY display_order ASC, created_at ASC`,
    [campaignId, clubId]
  );

  if (!products.length) return { products: [] };

  const productIds = products.map(p => p.id);
  const placeholders = productIds.map(() => '?').join(',');

  const [items] = await connection.execute(
    `SELECT * FROM ${T_ITEMS} WHERE product_id IN (${placeholders}) ORDER BY created_at ASC`,
    productIds
  );

  const itemsByProduct = {};
  for (const item of items) {
    if (!itemsByProduct[item.product_id]) itemsByProduct[item.product_id] = [];
    itemsByProduct[item.product_id].push(formatItem(item));
  }

  return {
    products: products.map(p => formatProduct(p, itemsByProduct[p.id] ?? []))
  };
}

/**
 * Get a single product with its items.
 */
export async function getProduct(productId, campaignId, clubId) {
  const product = await assertProductOwnership(productId, campaignId, clubId);

  const [items] = await connection.execute(
    `SELECT * FROM ${T_ITEMS} WHERE product_id = ? ORDER BY created_at ASC`,
    [productId]
  );

  return { product: formatProduct(product, items.map(formatItem)) };
}

/**
 * Create a product with its product items.
 * @param {string} campaignId
 * @param {string} clubId  — from auth, never client
 * @param {object} payload — see spec section 6.3/6.4
 */
export async function createProduct(campaignId, clubId, payload) {
  await assertCampaignOwnership(campaignId, clubId);
  validateProductPayload(payload);

  const items = Array.isArray(payload.items) ? payload.items : [];

  // Validate all items before writing anything
  for (const item of items) {
    validateItemPayload(item);
    await assertRoomLinkedToCampaign(item.targetRoomId, campaignId, clubId);
  }

  const productId = newId();

  await connection.execute(
    `INSERT INTO ${T_PRODUCTS}
      (id, campaign_id, club_id, name, description, product_type, price, currency,
       is_featured, badge_label, display_order, max_sales,
       sales_start_at, sales_end_at, is_active, metadata_json)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,1,?)`,
    [
      productId, campaignId, clubId,
      payload.name.trim(),
      payload.description?.trim() ?? null,
      payload.productType ?? 'single_entry',
      Number(payload.price) || 0,
      payload.currency ?? 'EUR',
      payload.isFeatured ? 1 : 0,
      payload.badgeLabel?.trim() ?? null,
      payload.displayOrder ?? 0,
      payload.maxSales ?? null,
      payload.salesStartAt ?? null,
      payload.salesEndAt ?? null,
      payload.metadata ? JSON.stringify(payload.metadata) : null,
    ]
  );

  for (const item of items) {
    await insertProductItem(productId, campaignId, clubId, item);
  }

  return getProduct(productId, campaignId, clubId);
}

/**
 * Update a product and replace its items.
 * Snapshot-safe: we only update the product record; existing order item
 * snapshots already captured the name/price at purchase time.
 */
export async function updateProduct(productId, campaignId, clubId, payload) {
  await assertProductOwnership(productId, campaignId, clubId);
  validateProductPayload(payload);

  const items = Array.isArray(payload.items) ? payload.items : [];
  for (const item of items) {
    validateItemPayload(item);
    await assertRoomLinkedToCampaign(item.targetRoomId, campaignId, clubId);
  }

  await connection.execute(
    `UPDATE ${T_PRODUCTS} SET
       name=?, description=?, product_type=?, price=?, currency=?,
       is_featured=?, badge_label=?, display_order=?, max_sales=?,
       sales_start_at=?, sales_end_at=?, metadata_json=?
     WHERE id=? AND campaign_id=? AND club_id=?`,
    [
      payload.name.trim(),
      payload.description?.trim() ?? null,
      payload.productType ?? 'single_entry',
      Number(payload.price) || 0,
      payload.currency ?? 'EUR',
      payload.isFeatured ? 1 : 0,
      payload.badgeLabel?.trim() ?? null,
      payload.displayOrder ?? 0,
      payload.maxSales ?? null,
      payload.salesStartAt ?? null,
      payload.salesEndAt ?? null,
      payload.metadata ? JSON.stringify(payload.metadata) : null,
      productId, campaignId, clubId,
    ]
  );

  // Replace items
  await connection.execute(`DELETE FROM ${T_ITEMS} WHERE product_id = ?`, [productId]);
  for (const item of items) {
    await insertProductItem(productId, campaignId, clubId, item);
  }

  return getProduct(productId, campaignId, clubId);
}

/**
 * Hide (soft-delete) a product.
 * Hard-delete is blocked if the product has sales.
 */
export async function hideProduct(productId, campaignId, clubId) {
  await assertProductOwnership(productId, campaignId, clubId);

  await connection.execute(
    `UPDATE ${T_PRODUCTS} SET is_active = 0 WHERE id = ? AND campaign_id = ? AND club_id = ?`,
    [productId, campaignId, clubId]
  );

  return { ok: true };
}

/**
 * Duplicate a product (and its items) as an inactive draft.
 */
export async function duplicateProduct(productId, campaignId, clubId) {
  const { product } = await getProduct(productId, campaignId, clubId);

  const newProductId = newId();

  await connection.execute(
    `INSERT INTO ${T_PRODUCTS}
      (id, campaign_id, club_id, name, description, product_type, price, currency,
       is_featured, badge_label, display_order, max_sales,
       sales_start_at, sales_end_at, is_active, metadata_json)
     VALUES (?,?,?,?,?,?,?,?,0,?,?,?,?,?,0,?)`,
    [
      newProductId, campaignId, clubId,
      `${product.name} (copy)`,
      product.description ?? null,
      product.productType,
      product.price,
      product.currency,
      product.badgeLabel ?? null,
      product.displayOrder,
      product.maxSales ?? null,
      product.salesStartAt ?? null,
      product.salesEndAt ?? null,
      product.metadata ? JSON.stringify(product.metadata) : null,
    ]
  );

  for (const item of product.items) {
    await insertProductItem(newProductId, campaignId, clubId, {
      targetRoomId: item.targetRoomId,
      itemType:     item.itemType,
      quantity:     item.quantity,
      metadata:     item.metadata,
    });
  }

  return getProduct(newProductId, campaignId, clubId);
}

// ─── Templates ───────────────────────────────────────────────────────────────

/**
 * Fetch all active rooms for the club to use in templates.
 * The rooms table has no campaign_id — we return all non-cancelled
 * club rooms so templates can pick appropriate ones.
 */
async function getLinkedRooms(campaignId, clubId) {
  const [rows] = await connection.execute(
    `SELECT room_id, game_type, config_json FROM ${T_ROOMS}
     WHERE club_id = ? AND status != 'cancelled'
     ORDER BY scheduled_at DESC`,
    [clubId]
  );
  return rows;
}

const TEMPLATES = {
  door_to_door: async (campaignId, clubId, rooms) => {
    const elimination = rooms.find(r => r.game_type === 'elimination');
    const quiz        = rooms.find(r => r.game_type === 'quiz');

    const products = [];

    if (elimination) {
      products.push(
        { name: 'Tournament Game Pack', productType: 'bundle', price: 10, isFeatured: true, badgeLabel: 'Most Popular',
          items: [
            { targetRoomId: elimination.room_id, itemType: 'elimination_entry', quantity: 1 },
          ] },
        { name: 'Last Player Standing Entry', productType: 'single_entry', price: 5,
          items: [{ targetRoomId: elimination.room_id, itemType: 'elimination_entry', quantity: 1 }] },
      );
    }

    if (quiz) {
      products.push(
        { name: 'Family Quiz Team', productType: 'ticket', price: 30,
          items: [{ targetRoomId: quiz.room_id, itemType: 'quiz_team_ticket', quantity: 1 }] },
      );
    }

    return products;
  },

  quiz_only: async (campaignId, clubId, rooms) => {
    const quiz = rooms.find(r => r.game_type === 'quiz');
    if (!quiz) return [];
    return [
      { name: 'Family Quiz Team',     productType: 'ticket',       price: 30,
        items: [{ targetRoomId: quiz.room_id, itemType: 'quiz_team_ticket', quantity: 1 }] },
      { name: 'Individual Ticket',    productType: 'single_entry', price: 10,
        items: [{ targetRoomId: quiz.room_id, itemType: 'quiz_individual_ticket', quantity: 1 }] },
      { name: 'Supporter Ticket',     productType: 'single_entry', price: 5,
        items: [{ targetRoomId: quiz.room_id, itemType: 'quiz_individual_ticket', quantity: 1 }] },
    ];
  },
};

/**
 * Apply a product template — creates suggested products from linked campaign events.
 */
export async function applyTemplate(campaignId, clubId, templateKey) {
  await assertCampaignOwnership(campaignId, clubId);

  const builder = TEMPLATES[templateKey];
  if (!builder) throw Object.assign(new Error('invalid_template_key'), { status: 400 });

  const rooms = await getLinkedRooms(campaignId, clubId);
  if (!rooms.length) throw Object.assign(new Error('no_linked_events'), { status: 400 });

  const blueprints = await builder(campaignId, clubId, rooms);
  const created = [];

  for (const blueprint of blueprints) {
    const result = await createProduct(campaignId, clubId, blueprint);
    created.push(result.product);
  }

  return { products: created };
}

// ─── Internal helpers ────────────────────────────────────────────────────────

async function insertProductItem(productId, campaignId, clubId, item) {
  await connection.execute(
    `INSERT INTO ${T_ITEMS} (id, product_id, campaign_id, club_id, target_room_id, item_type, quantity, metadata_json)
     VALUES (?,?,?,?,?,?,?,?)`,
    [
      newId(), productId, campaignId, clubId,
      item.targetRoomId,
      item.itemType,
      item.quantity ?? 1,
      item.metadata ? JSON.stringify(item.metadata) : null,
    ]
  );
}

function validateProductPayload(payload) {
  if (!payload.name?.trim()) throw Object.assign(new Error('invalid_product_name'), { status: 400 });
  const price = Number(payload.price);
  if (!Number.isFinite(price) || price < 0) throw Object.assign(new Error('invalid_price'), { status: 400 });
  if (payload.currency && typeof payload.currency !== 'string')
    throw Object.assign(new Error('invalid_currency'), { status: 400 });
}

function validateItemPayload(item) {
  if (!item.targetRoomId) throw Object.assign(new Error('invalid_product_item_event'), { status: 400 });
  if (!item.itemType)     throw Object.assign(new Error('invalid_item_type'), { status: 400 });
  const qty = Number(item.quantity);
  if (!Number.isFinite(qty) || qty < 1) throw Object.assign(new Error('invalid_quantity'), { status: 400 });
}

function formatProduct(row, items = []) {
  return {
    id:           row.id,
    campaignId:   row.campaign_id,
    clubId:       row.club_id,
    name:         row.name,
    description:  row.description ?? null,
    productType:  row.product_type,
    price:        Number(row.price),
    currency:     row.currency,
    isFeatured:   row.is_featured === 1 || row.is_featured === true,
    badgeLabel:   row.badge_label ?? null,
    displayOrder: row.display_order,
    maxSales:     row.max_sales ?? null,
    salesStartAt: row.sales_start_at ?? null,
    salesEndAt:   row.sales_end_at ?? null,
    isActive:     row.is_active === 1 || row.is_active === true,
    metadata:     parseJson(row.metadata_json),
    items,
    createdAt:    row.created_at,
    updatedAt:    row.updated_at,
  };
}

function formatItem(row) {
  return {
    id:           row.id,
    productId:    row.product_id,
    targetRoomId: row.target_room_id,
    itemType:     row.item_type,
    quantity:     Number(row.quantity),
    metadata:     parseJson(row.metadata_json),
  };
}