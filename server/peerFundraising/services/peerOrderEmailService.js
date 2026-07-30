// server/peerFundraising/services/peerOrderEmailService.js
//
// Sends a single order-confirmation email to the supporter once their order
// exists - one per ORDER, not per ticket (that's peerTicketBridgeService's
// job, fired once expansion runs). Mirrors campaignOrderEmailService.js,
// which peer had no equivalent of at all.
//
// Non-fatal everywhere it's called - if the send fails the order is already
// committed, we just log and move on.

import { sendEmailSafe } from '../../utils/mailer.js';
import { connection, TABLE_PREFIX } from '../../config/database.js';

const T_ORDERS       = `${TABLE_PREFIX}peer_orders`;
const T_ORDER_ITEMS  = `${TABLE_PREFIX}peer_order_items`;
const T_FUNDRAISERS  = `${TABLE_PREFIX}peer_fundraisers`;
const T_CLUBS        = `${TABLE_PREFIX}clubs`;

function currencySymbol(currency) {
  const map = { EUR: '€', GBP: '£', USD: '$' };
  return map[currency] ?? currency ?? '€';
}

function fmt(amount, symbol = '€') {
  return `${symbol}${parseFloat(amount || 0).toFixed(2)}`;
}

// Peer's payment_method_category ENUM differs slightly from campaign's -
// 'cash_to_participant' instead of 'cash_to_player', plus card_tap/pay_admin.
function nextStepsHtml(paymentMethodCategory, paymentReference, symbol) {
  const cat = String(paymentMethodCategory || '').toLowerCase();

  if (cat === 'cash_to_participant' || cat === 'cash') {
    return `
      <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:10px;padding:18px 20px;margin:24px 0;">
        <p style="margin:0 0 10px;font-weight:700;color:#9a3412;font-size:15px;">💵 What happens next</p>
        <ol style="margin:0;padding-left:20px;color:#7c3a1e;font-size:14px;line-height:1.9;">
          <li>The club receives your order and will confirm your cash payment</li>
          <li>Once confirmed, your game join links will be activated</li>
          <li>You'll receive a separate email with your ticket link for each game</li>
        </ol>
      </div>`;
  }

  if (cat === 'instant_payment' || cat === 'bank_transfer') {
    const refBlock = paymentReference
      ? `<div style="margin-top:12px;background:#fffbeb;border-radius:8px;padding:12px 14px;">
           <div style="font-size:11px;text-transform:uppercase;letter-spacing:0.06em;font-weight:700;color:#92400e;margin-bottom:4px;">Your payment reference</div>
           <div style="font-family:monospace;font-size:17px;font-weight:800;color:#1c1917;letter-spacing:0.08em;">${paymentReference}</div>
           <div style="font-size:12px;color:#78716c;margin-top:4px;">Use this when making your transfer so the club can match it</div>
         </div>`
      : '';
    return `
      <div style="background:#f0f9ff;border:1px solid #bae6fd;border-radius:10px;padding:18px 20px;margin:24px 0;">
        <p style="margin:0 0 10px;font-weight:700;color:#0c4a6e;font-size:15px;">📱 What happens next</p>
        <ol style="margin:0;padding-left:20px;color:#075985;font-size:14px;line-height:1.9;">
          <li>Complete your payment using the reference below</li>
          <li>The club will verify receipt and confirm your order</li>
          <li>Your game join links will be sent by email once confirmed</li>
        </ol>
        ${refBlock}
      </div>`;
  }

  if (cat === 'crypto') {
    return `
      <div style="background:#f5f3ff;border:1px solid #ddd6fe;border-radius:10px;padding:18px 20px;margin:24px 0;">
        <p style="margin:0 0 10px;font-weight:700;color:#4c1d95;font-size:15px;">🔗 What happens next</p>
        <ol style="margin:0;padding-left:20px;color:#5b21b6;font-size:14px;line-height:1.9;">
          <li>Your on-chain payment has been detected and verified</li>
          <li>Your game join links are being activated now</li>
          <li>You'll receive a separate email with your ticket link for each game</li>
        </ol>
      </div>`;
  }

  // Stripe / card - auto-confirmed, tickets are ready
  return `
    <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:18px 20px;margin:24px 0;">
      <p style="margin:0 0 10px;font-weight:700;color:#14532d;font-size:15px;">✅ What happens next</p>
      <ol style="margin:0;padding-left:20px;color:#166534;font-size:14px;line-height:1.9;">
        <li>Your payment has been confirmed automatically</li>
        <li>Your game join links are being activated now</li>
        <li>You'll receive a separate email with your ticket link for each game</li>
      </ol>
    </div>`;
}

function buildItemsTableHtml(items, currency) {
  const sym = currencySymbol(currency);
  const rows = items.map(item => `
    <tr>
      <td style="padding:10px 14px;border-bottom:1px solid #f1f5f9;color:#334155;font-size:14px;font-weight:600;">
        ${item.pack_name_snapshot ?? 'Item'}
      </td>
      <td style="padding:10px 14px;border-bottom:1px solid #f1f5f9;text-align:center;color:#64748b;font-size:14px;">
        ×${item.quantity}
      </td>
      <td style="padding:10px 14px;border-bottom:1px solid #f1f5f9;text-align:right;color:#334155;font-size:14px;font-weight:700;">
        ${fmt(item.line_total, sym)}
      </td>
    </tr>`).join('');

  return `
    <table style="width:100%;border-collapse:collapse;background:#f8fafc;border-radius:10px;overflow:hidden;margin:20px 0;">
      <thead>
        <tr style="background:#f1f5f9;">
          <th style="padding:10px 14px;text-align:left;font-size:12px;text-transform:uppercase;letter-spacing:0.05em;color:#94a3b8;font-weight:700;">Item</th>
          <th style="padding:10px 14px;text-align:center;font-size:12px;text-transform:uppercase;letter-spacing:0.05em;color:#94a3b8;font-weight:700;">Qty</th>
          <th style="padding:10px 14px;text-align:right;font-size:12px;text-transform:uppercase;letter-spacing:0.05em;color:#94a3b8;font-weight:700;">Amount</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>`;
}

/**
 * Send the order confirmation email to the supporter.
 * @param {string} orderId - the peer_orders.id
 */
export async function sendPeerOrderConfirmationEmail(orderId) {
  const [orderRows] = await connection.execute(
    `SELECT * FROM ${T_ORDERS} WHERE id = ? LIMIT 1`,
    [orderId]
  );
  const order = orderRows[0];
  if (!order) {
    console.warn(`[PeerOrderEmail] ⚠️ Order ${orderId} not found - skipping email`);
    return;
  }
  if (!order.supporter_email) {
    console.warn(`[PeerOrderEmail] ⚠️ Order ${orderId} has no supporter_email - skipping email`);
    return;
  }

  let fundraiserName = null;
  let clubName = null;

  try {
    if (order.peer_fundraiser_id) {
      const [rows] = await connection.execute(
        `SELECT name FROM ${T_FUNDRAISERS} WHERE id = ? LIMIT 1`,
        [order.peer_fundraiser_id]
      );
      fundraiserName = rows[0]?.name ?? null;
    }
  } catch (e) {
    console.warn(`[PeerOrderEmail] ⚠️ Could not fetch fundraiser name for ${orderId}:`, e.message);
  }

  try {
    if (order.club_id) {
      const [rows] = await connection.execute(
        `SELECT name FROM ${T_CLUBS} WHERE id = ? LIMIT 1`,
        [order.club_id]
      );
      clubName = rows[0]?.name ?? null;
    }
  } catch (e) {
    console.warn(`[PeerOrderEmail] ⚠️ Could not fetch club name for ${orderId}:`, e.message);
  }

  const [items] = await connection.execute(
    `SELECT * FROM ${T_ORDER_ITEMS} WHERE order_id = ? ORDER BY id ASC`,
    [orderId]
  );

  const appUrl        = process.env.APP_URL || 'https://fundraisely.ie';
  const sym            = currencySymbol(order.currency);
  const fundraiser      = fundraiserName || 'the fundraiser';
  const clubDisplayName = clubName || 'the organisers';
  const supporterName   = order.supporter_name || 'there';
  const participantName = order.participant_name || null;
  const paymentCat      = order.payment_method_category;
  const reference       = order.payment_reference ?? null;

  const isCash    = paymentCat === 'cash_to_participant' || paymentCat === 'cash';
  const isInstant = paymentCat === 'instant_payment' || paymentCat === 'bank_transfer';
  const isCrypto  = paymentCat === 'crypto';

  const headerGradient = isCash    ? 'linear-gradient(135deg,#ea580c,#f97316)'
                       : isInstant ? 'linear-gradient(135deg,#0284c7,#0ea5e9)'
                       : isCrypto  ? 'linear-gradient(135deg,#7c3aed,#a855f7)'
                       : 'linear-gradient(135deg,#16a34a,#22c55e)';

  const statusBadge = isCash || isInstant
    ? `<span style="display:inline-block;background:#fef3c7;color:#92400e;border:1px solid #fde68a;border-radius:999px;padding:5px 16px;font-size:13px;font-weight:700;">⏳ Awaiting confirmation</span>`
    : `<span style="display:inline-block;background:#dcfce7;color:#15803d;border:1px solid #bbf7d0;border-radius:999px;padding:5px 16px;font-size:13px;font-weight:700;">✅ Payment received</span>`;

  const headlineSecondLine = isCash || isInstant
    ? `Your entries are on their way once the club confirms your payment.`
    : `Your payment is confirmed and your entries are being activated.`;

  const supportedLine = participantName
    ? `We've received your order supporting <strong>${participantName}</strong> for <strong>${fundraiser}</strong>, from <strong>${clubDisplayName}</strong>.`
    : `We've received your order for <strong>${fundraiser}</strong>, from <strong>${clubDisplayName}</strong>.`;

  const itemsTable = buildItemsTableHtml(items, order.currency);
  const nextSteps   = nextStepsHtml(paymentCat, reference, sym);

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Order confirmed - FundRaisely</title>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:'Segoe UI',Arial,sans-serif;">
  <div style="max-width:580px;margin:36px auto 24px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 16px rgba(0,0,0,0.08);">

    <div style="background:${headerGradient};padding:36px 28px 28px;text-align:center;">
      <div style="font-size:48px;margin-bottom:10px;">🎟️</div>
      <h1 style="color:#fff;margin:0;font-size:26px;font-weight:800;letter-spacing:-0.02em;">
        Thanks for your support!
      </h1>
      <p style="color:rgba(255,255,255,0.85);margin:10px 0 0;font-size:15px;">
        ${headlineSecondLine}
      </p>
    </div>

    <div style="text-align:center;padding:20px 28px 0;">
      ${statusBadge}
    </div>

    <div style="padding:24px 28px 32px;">

      <p style="color:#1e293b;font-size:16px;margin:0 0 6px;">
        Hi <strong>${supporterName}</strong>,
      </p>
      <p style="color:#475569;font-size:15px;line-height:1.65;margin:0 0 24px;">
        ${supportedLine} Here's a summary of what you've purchased.
      </p>

      <p style="font-weight:700;color:#1e293b;font-size:14px;text-transform:uppercase;letter-spacing:0.05em;margin:0 0 8px;">Your order</p>
      ${itemsTable}

      <div style="background:#f8fafc;border:2px solid #e2e8f0;border-radius:10px;padding:14px 18px;display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
        <span style="font-weight:800;color:#1e293b;font-size:16px;">Total</span>
        <span style="font-weight:800;color:#1e293b;font-size:22px;">${fmt(order.total_amount, sym)}</span>
      </div>
      <p style="color:#94a3b8;font-size:12px;margin:6px 0 0;text-align:right;">
        Order ref: <code style="font-family:monospace;">${orderId}</code>
      </p>

      ${nextSteps}

      <div style="background:#fafafa;border-radius:10px;padding:14px 18px;margin-top:8px;display:flex;align-items:flex-start;gap:12px;">
        <span style="font-size:22px;line-height:1;">💌</span>
        <p style="margin:0;color:#64748b;font-size:13px;line-height:1.6;">
          This confirmation was sent to <strong style="color:#1e293b;">${order.supporter_email}</strong>.
          If you have any questions, contact the club directly - they manage all orders through FundRaisely.
        </p>
      </div>

    </div>

    <div style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:16px 28px;text-align:center;">
      <p style="color:#94a3b8;font-size:12px;margin:0;">
        Powered by <strong style="color:#f97316;">FundRaisely</strong> &bull; Helping clubs fundraise smarter 🍀
      </p>
    </div>

  </div>
</body>
</html>`;

  const subjectEmoji = isCash || isInstant ? '⏳' : '✅';
  const subject = `${subjectEmoji} Your order for ${fundraiser} - ${clubDisplayName}`;

  await sendEmailSafe({
    to: order.supporter_email,
    subject,
    html,
  });

  console.log(`[PeerOrderEmail] 📧 Order confirmation sent to ${order.supporter_email} (order: ${orderId}, method: ${paymentCat})`);
}