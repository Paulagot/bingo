// server/puzzles/services/puzzleDropEmailService.js
//
// Sends a single "your puzzles are ready" email per Drop purchase — one
// email per ledger/purchase, listing every item bought, not one per item.
// Mirrors peerOrderEmailService.js's shape and non-fatal calling
// convention (payment is already committed by the time this runs; a
// failed send is logged and swallowed, never re-thrown).

import { sendEmailSafe } from '../../utils/mailer.js';
import { connection, TABLE_PREFIX } from '../../config/database.js';

const T_CLUBS  = `${TABLE_PREFIX}clubs`;
const T_LEDGER = `${TABLE_PREFIX}quiz_payment_ledger`;

function currencySymbol(currency) {
  const map = { EUR: '€', GBP: '£', USD: '$' };
  return map[currency] ?? currency ?? '€';
}

function fmt(amount, symbol = '€') {
  return `${symbol}${parseFloat(amount || 0).toFixed(2)}`;
}

async function getClubName(clubId) {
  try {
    const [rows] = await connection.execute(
      `SELECT name FROM ${T_CLUBS} WHERE id = ? LIMIT 1`,
      [clubId]
    );
    return rows[0]?.name ?? null;
  } catch {
    return null;
  }
}

async function getLedgerAmount(ledgerId) {
  if (!ledgerId) return null;
  try {
    const [rows] = await connection.execute(
      `SELECT amount, currency FROM ${T_LEDGER} WHERE id = ? LIMIT 1`,
      [ledgerId]
    );
    return rows[0] || null;
  } catch {
    return null;
  }
}

function buildItemsHtml(items, appUrl) {
  return items.map((item) => {
    const link = `${appUrl}/puzzle-drop/play/${item.entitlementId}?token=${item.accessToken}`;
    return `
      <tr>
        <td style="padding:14px 16px;border-bottom:1px solid #f1f5f9;">
          <div style="font-weight:700;color:#1e293b;font-size:15px;">
            Puzzle #${item.itemNumber}${item.puzzleType ? ` — ${item.puzzleType}` : ''}
          </div>
          <a href="${link}"
             style="display:inline-block;margin-top:8px;background:#7c3aed;color:#fff;
                    text-decoration:none;padding:9px 18px;border-radius:8px;font-size:14px;
                    font-weight:700;">
            🧩 Play Puzzle #${item.itemNumber}
          </a>
        </td>
      </tr>`;
  }).join('');
}

/**
 * @param {Object} params
 * @param {string} params.clubId
 * @param {string} params.dropRoomId
 * @param {string|null} params.dropTitle
 * @param {string} params.buyerEmail
 * @param {string|null} params.buyerName
 * @param {string|null} params.ledgerId — used to pull total paid, optional
 * @param {Array<{entitlementId:string, itemNumber:number, puzzleType?:string, accessToken:string}>} params.items
 */
export async function sendPuzzleDropConfirmationEmail({
  clubId,
  dropRoomId,
  dropTitle,
  buyerEmail,
  buyerName,
  ledgerId = null,
  items,
}) {
  if (!buyerEmail) {
    console.warn(`[PuzzleDropEmail] ⚠️ No buyerEmail for drop ${dropRoomId} — skipping email`);
    return;
  }
  if (!Array.isArray(items) || items.length === 0) {
    console.warn(`[PuzzleDropEmail] ⚠️ No items for drop ${dropRoomId} — skipping email`);
    return;
  }

  const appUrl = process.env.APP_URL || 'http://localhost:5173';
  const clubName = (await getClubName(clubId)) || 'the club';
  const title = dropTitle || 'Puzzle Drop';

  const ledger = await getLedgerAmount(ledgerId);
  const sym = currencySymbol(ledger?.currency || 'EUR');
  const totalHtml = ledger
    ? `
      <div style="background:#f8fafc;border:2px solid #e2e8f0;border-radius:10px;padding:14px 18px;
                  display:flex;justify-content:space-between;align-items:center;margin:20px 0;">
        <span style="font-weight:800;color:#1e293b;font-size:16px;">Total paid</span>
        <span style="font-weight:800;color:#1e293b;font-size:20px;">${fmt(ledger.amount, sym)}</span>
      </div>`
    : '';

  const name = buyerName || 'there';
  const itemsHtml = buildItemsHtml(items, appUrl);
  const plural = items.length > 1 ? 'puzzles are' : 'puzzle is';

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your puzzles are ready — ${clubName}</title>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:'Segoe UI',Arial,sans-serif;">
  <div style="max-width:560px;margin:36px auto 24px;background:#ffffff;border-radius:16px;overflow:hidden;
              box-shadow:0 4px 16px rgba(0,0,0,0.08);">

    <div style="background:linear-gradient(135deg,#7c3aed,#a855f7);padding:36px 28px 28px;text-align:center;">
      <div style="font-size:48px;margin-bottom:10px;">🧩</div>
      <h1 style="color:#fff;margin:0;font-size:24px;font-weight:800;letter-spacing:-0.02em;">
        Your ${plural} ready!
      </h1>
      <p style="color:rgba(255,255,255,0.85);margin:10px 0 0;font-size:15px;">
        Thanks for supporting ${clubName}'s ${title}
      </p>
    </div>

    <div style="padding:24px 28px 32px;">
      <p style="color:#1e293b;font-size:16px;margin:0 0 6px;">Hi <strong>${name}</strong>,</p>
      <p style="color:#475569;font-size:15px;line-height:1.65;margin:0 0 20px;">
        Your payment is confirmed — tap the link below for each puzzle you bought to start playing.
      </p>

      <table style="width:100%;border-collapse:collapse;background:#f8fafc;border-radius:10px;overflow:hidden;">
        <tbody>${itemsHtml}</tbody>
      </table>

      ${totalHtml}

      <div style="background:#fafafa;border-radius:10px;padding:14px 18px;margin-top:16px;
                  display:flex;align-items:flex-start;gap:12px;">
        <span style="font-size:22px;line-height:1;">💌</span>
        <p style="margin:0;color:#64748b;font-size:13px;line-height:1.6;">
          This confirmation was sent to <strong style="color:#1e293b;">${buyerEmail}</strong>.
          Keep this email — each link is your access to that puzzle.
        </p>
      </div>
    </div>

    <div style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:16px 28px;text-align:center;">
      <p style="color:#94a3b8;font-size:12px;margin:0;">
        Powered by <strong style="color:#7c3aed;">FundRaisely</strong> &bull; Helping clubs fundraise smarter 🍀
      </p>
    </div>

  </div>
</body>
</html>`;

  const subject = `🧩 ${clubName} Puzzle Drop — your puzzle${items.length > 1 ? 's are' : ' is'} ready!`;

  await sendEmailSafe({ to: buyerEmail, subject, html });

  console.log(`[PuzzleDropEmail] 📧 Confirmation sent to ${buyerEmail} (drop: ${dropRoomId}, items: ${items.length})`);
}