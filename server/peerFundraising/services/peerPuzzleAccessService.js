// PEER_PUZZLE_ACCESS_VERSION: real-entitlements-v3.1
import { connection, TABLE_PREFIX } from '../../config/database.js';
import { nanoid } from 'nanoid';
import { createDropEntitlements } from '../../puzzles/services/puzzleDropService.js';
import { sendPuzzleDropConfirmationEmail } from '../../puzzles/services/puzzleDropEmailService.js';

const E = `${TABLE_PREFIX}peer_entries`;
const R = `${TABLE_PREFIX}web2_quiz_rooms`;
const L = `${TABLE_PREFIX}quiz_payment_ledger`;

const paymentMethod = category => ({
  stripe:'stripe',
  crypto:'crypto',
  instant_payment:'instant_payment',
  bank_transfer:'instant_payment',
  cash_to_participant:'cash',
  cash:'cash',
  card:'card',
  card_tap:'card_tap',
}[category] || 'other');

const paymentSource = category =>
  category === 'stripe'
    ? 'webhook_auto'
    : category === 'crypto'
      ? 'onchain_auto'
      : 'admin_assigned';

function parseJson(value, fallback = {}) {
  if (!value) return fallback;
  if (typeof value === 'object') return value;
  try { return JSON.parse(value); } catch { return fallback; }
}

export async function createPuzzleAccessForPeerEntry(entryId, context) {
  const {
    order,
    packItem,
    packItemMetadata = {},
    apportionedFee,
    clubPaymentMethodId,
  } = context;

  const roomId = packItem.target_room_id;
  const puzzleQuantity = Number(packItemMetadata.puzzleQuantity || 0);
  const availableItemIds = Array.isArray(packItemMetadata.puzzleItemIds)
    ? packItemMetadata.puzzleItemIds
    : [];

  if (!Number.isInteger(puzzleQuantity) || puzzleQuantity < 1) {
    throw new Error('peer_puzzle_quantity_missing');
  }
  if (availableItemIds.length < puzzleQuantity) {
    throw new Error('peer_puzzle_items_unavailable');
  }

  const selectedItemIds = availableItemIds.slice(0, puzzleQuantity);

  const result = await createDropEntitlements({
    dropRoomId: roomId,
    itemIds: selectedItemIds,
    buyerName: order.supporter_name,
    buyerEmail: order.supporter_email,
    paymentMethod: paymentMethod(order.payment_method_category),
    paymentSource: paymentSource(order.payment_method_category),
    paymentReference: order.payment_reference || `peer_order_${order.id}`,
    externalTransactionId: order.external_transaction_id || null,
    clubPaymentMethodId: clubPaymentMethodId || null,
    initialStatus: 'confirmed',
  });

  const apportionedAmount = Number(apportionedFee || 0);
  if (result.ledgerId && Number.isFinite(apportionedAmount)) {
    await connection.execute(
      `UPDATE ${L}
       SET amount=?, updated_at=UTC_TIMESTAMP()
       WHERE id=?`,
      [apportionedAmount, result.ledgerId]
    );
  }

  const first = result.entitlements[0];
  const firstUrl = first
    ? `/puzzle-drop/play/${first.id}?token=${first.accessToken}`
    : null;

  await connection.execute(
    `UPDATE ${E}
     SET entry_code=?,
         join_url=?,
         status='confirmed',
         confirmed_at=UTC_TIMESTAMP(),
         metadata_json=JSON_SET(
           COALESCE(metadata_json,'{}'),
           '$.puzzleEntitlements', CAST(? AS JSON),
           '$.ledgerId', ?,
           '$.roomId', ?
         )
     WHERE id=?`,
    [
      `PE-${nanoid(8).toUpperCase()}`,
      firstUrl,
      JSON.stringify(result.entitlements),
      result.ledgerId || null,
      roomId,
      entryId,
    ]
  );

  const [[roomRow]] = await connection.execute(
    `SELECT config_json FROM ${R} WHERE room_id=? LIMIT 1`,
    [roomId]
  );
  const config = parseJson(roomRow?.config_json, {});

  try {
    await sendPuzzleDropConfirmationEmail({
      clubId: order.club_id,
      dropRoomId: roomId,
      dropTitle: config.dropTitle || config.eventTitle || null,
      buyerEmail: order.supporter_email,
      buyerName: order.supporter_name,
      ledgerId: result.ledgerId,
      items: result.entitlements.map(entitlement => ({
        entitlementId: entitlement.id,
        itemNumber: entitlement.itemNumber,
        puzzleType: entitlement.puzzleType,
        accessToken: entitlement.accessToken,
      })),
    });
  } catch (emailError) {
    console.error(
      '[PeerPuzzleAccess] Puzzle confirmation email failed (non-fatal):',
      emailError.message,
    );
  }

  return {
    ledgerId: result.ledgerId,
    entitlements: result.entitlements,
    puzzleUrl: firstUrl,
  };
}
