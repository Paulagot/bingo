// server/puzzles/services/puzzleDropEmailService.js
//
// Sends a single "your puzzles are ready" email per Puzzle Drop purchase.
//
// One email is sent per ledger/purchase and every puzzle bought in that
// transaction is listed in the same email.
//
// The email uses the fundraising club's branding:
//   - club name
//   - club logo
//   - primary colour
//   - background colour
//   - text-on-primary colour
//
// Email failure remains non-fatal. Payment has already been committed
// before this service is called.

import { sendEmailSafe } from '../../utils/mailer.js';
import {
  connection,
  TABLE_PREFIX,
} from '../../config/database.js';

const T_CLUBS = `${TABLE_PREFIX}clubs`;
const T_LEDGER = `${TABLE_PREFIX}quiz_payment_ledger`;

// ─────────────────────────────────────────────────────────────────────────────
// Formatting helpers
// ─────────────────────────────────────────────────────────────────────────────

function currencySymbol(currency) {
  const map = {
    EUR: '€',
    GBP: '£',
    USD: '$',
  };

  return map[currency] ?? currency ?? '€';
}

function fmt(amount, symbol = '€') {
  return `${symbol}${parseFloat(amount || 0).toFixed(2)}`;
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function escapeAttribute(value) {
  return escapeHtml(value);
}

function safeColour(value, fallback) {
  const colour = String(value || '').trim();

  // Allow standard hex colours only.
  // Prevents malformed database values from breaking email HTML/CSS.
  if (
    /^#[0-9a-fA-F]{3}$/.test(colour) ||
    /^#[0-9a-fA-F]{6}$/.test(colour)
  ) {
    return colour;
  }

  return fallback;
}

// ─────────────────────────────────────────────────────────────────────────────
// Club branding
// ─────────────────────────────────────────────────────────────────────────────

async function getClubBranding(clubId) {
  try {
    const [rows] = await connection.execute(
      `SELECT
         name,
         brand_logo_url,
         brand_primary_color,
         brand_background_color,
         brand_text_on_primary_color
       FROM ${T_CLUBS}
       WHERE id = ?
       LIMIT 1`,
      [clubId]
    );

    return rows[0] || null;
  } catch (err) {
    console.warn(
      '[PuzzleDropEmail] ⚠️ Could not load club branding:',
      {
        clubId,
        error: err.message,
      }
    );

    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Ledger amount
// ─────────────────────────────────────────────────────────────────────────────

async function getLedgerAmount(ledgerId) {
  if (!ledgerId) {
    return null;
  }

  try {
    const [rows] = await connection.execute(
      `SELECT
         amount,
         currency
       FROM ${T_LEDGER}
       WHERE id = ?
       LIMIT 1`,
      [ledgerId]
    );

    return rows[0] || null;
  } catch (err) {
    console.warn(
      '[PuzzleDropEmail] ⚠️ Could not load ledger amount:',
      {
        ledgerId,
        error: err.message,
      }
    );

    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Puzzle list
// ─────────────────────────────────────────────────────────────────────────────

function buildItemsHtml(
  items,
  appUrl,
  primaryColor,
  textOnPrimary
) {
  return items
    .map((item) => {
      const entitlementId =
        encodeURIComponent(item.entitlementId);

      const accessToken =
        encodeURIComponent(item.accessToken);

      const link =
        `${appUrl}/puzzle-drop/play/${entitlementId}` +
        `?token=${accessToken}`;

      const itemNumber = escapeHtml(item.itemNumber);

      const puzzleType = item.puzzleType
        ? ` - ${escapeHtml(item.puzzleType)}`
        : '';

      return `
        <tr>
          <td
            style="
              padding:16px;
              border-bottom:1px solid #ece7df;
            "
          >
            <div
              style="
                font-weight:700;
                color:#1e293b;
                font-size:15px;
                line-height:1.4;
              "
            >
              Puzzle #${itemNumber}${puzzleType}
            </div>

            <a
              href="${escapeAttribute(link)}"
              style="
                display:inline-block;
                margin-top:10px;
                background:${primaryColor};
                color:${textOnPrimary};
                text-decoration:none;
                padding:10px 18px;
                border-radius:8px;
                font-size:14px;
                line-height:1.4;
                font-weight:700;
              "
            >
              Play Puzzle #${itemNumber}
            </a>
          </td>
        </tr>
      `;
    })
    .join('');
}

// ─────────────────────────────────────────────────────────────────────────────
// Confirmation email
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @param {Object} params
 * @param {string} params.clubId
 * @param {string} params.dropRoomId
 * @param {string|null} params.dropTitle
 * @param {string} params.buyerEmail
 * @param {string|null} params.buyerName
 * @param {string|number|null} params.ledgerId
 * @param {Array<{
 *   entitlementId:string,
 *   itemNumber:number,
 *   puzzleType?:string,
 *   accessToken:string
 * }>} params.items
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
  // ───────────────────────────────────────────────────────────────────────────
  // Guards
  // ───────────────────────────────────────────────────────────────────────────

  if (!buyerEmail) {
    console.warn(
      `[PuzzleDropEmail] ⚠️ No buyerEmail for drop ${dropRoomId} - skipping email`
    );

    return;
  }

  if (!Array.isArray(items) || items.length === 0) {
    console.warn(
      `[PuzzleDropEmail] ⚠️ No items for drop ${dropRoomId} - skipping email`
    );

    return;
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Branding
  // ───────────────────────────────────────────────────────────────────────────

  const branding = await getClubBranding(clubId);

  const clubName =
    branding?.name ||
    'the club';

  const clubLogoUrl =
    branding?.brand_logo_url ||
    null;

  const primaryColor = safeColour(
    branding?.brand_primary_color,
    '#7c3aed'
  );

  const backgroundColor = safeColour(
    branding?.brand_background_color,
    '#F6F1E8'
  );

  const textOnPrimary = safeColour(
    branding?.brand_text_on_primary_color,
    '#ffffff'
  );

  // ───────────────────────────────────────────────────────────────────────────
  // General values
  // ───────────────────────────────────────────────────────────────────────────

  const appUrl =
    String(
      process.env.APP_URL ||
      'http://localhost:5173'
    ).replace(/\/+$/, '');

  const title =
    dropTitle ||
    'Puzzle Drop';

  const ledger =
    await getLedgerAmount(ledgerId);

  const sym =
    currencySymbol(
      ledger?.currency ||
      'EUR'
    );

  const safeClubName =
    escapeHtml(clubName);

  const safeTitle =
    escapeHtml(title);

  const safeBuyerEmail =
    escapeHtml(buyerEmail);

  const safeBuyerName =
    escapeHtml(
      buyerName ||
      'there'
    );

  const plural =
    items.length > 1
      ? 'puzzles are'
      : 'puzzle is';

  const itemsHtml =
    buildItemsHtml(
      items,
      appUrl,
      primaryColor,
      textOnPrimary
    );

  // ───────────────────────────────────────────────────────────────────────────
  // Logo
  // ───────────────────────────────────────────────────────────────────────────

  const logoHtml = clubLogoUrl
    ? `
      <img
        src="${escapeAttribute(clubLogoUrl)}"
        alt="${safeClubName}"
        style="
          display:block;
          max-width:180px;
          max-height:78px;
          width:auto;
          height:auto;
          object-fit:contain;
          margin:0 auto 18px;
        "
      />
    `
    : `
      <div
        style="
          font-size:48px;
          line-height:1;
          margin-bottom:14px;
        "
      >
        🧩
      </div>
    `;

  // ───────────────────────────────────────────────────────────────────────────
  // Total paid
  // ───────────────────────────────────────────────────────────────────────────

  const totalHtml = ledger
    ? `
      <div
        style="
          background:#f8fafc;
          border:1px solid #e2e8f0;
          border-radius:10px;
          padding:15px 18px;
          margin:22px 0;
        "
      >
        <table
          role="presentation"
          style="
            width:100%;
            border-collapse:collapse;
          "
        >
          <tr>
            <td
              style="
                font-weight:700;
                color:#1e293b;
                font-size:15px;
              "
            >
              Total paid
            </td>

            <td
              align="right"
              style="
                font-weight:800;
                color:#1e293b;
                font-size:19px;
              "
            >
              ${fmt(ledger.amount, sym)}
            </td>
          </tr>
        </table>
      </div>
    `
    : '';

  // ───────────────────────────────────────────────────────────────────────────
  // Email HTML
  // ───────────────────────────────────────────────────────────────────────────

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta
    name="viewport"
    content="width=device-width, initial-scale=1.0"
  >
  <title>
    Your puzzles are ready - ${safeClubName}
  </title>
</head>

<body
  style="
    margin:0;
    padding:0;
    background:${backgroundColor};
    font-family:'Segoe UI',Arial,sans-serif;
  "
>
  <table
    role="presentation"
    width="100%"
    cellspacing="0"
    cellpadding="0"
    border="0"
    style="
      width:100%;
      background:${backgroundColor};
      padding:32px 14px;
    "
  >
    <tr>
      <td align="center">

        <table
          role="presentation"
          width="560"
          cellspacing="0"
          cellpadding="0"
          border="0"
          style="
            width:100%;
            max-width:560px;
            background:#ffffff;
            border-radius:16px;
            overflow:hidden;
            box-shadow:0 4px 16px rgba(0,0,0,0.08);
          "
        >

          <!-- Club branded header -->
          <tr>
            <td
              align="center"
              style="
                background:${primaryColor};
                padding:34px 28px 30px;
              "
            >

              ${logoHtml}

              <div
                style="
                  color:${textOnPrimary};
                  font-size:14px;
                  font-weight:700;
                  margin-bottom:8px;
                  opacity:0.9;
                "
              >
                ${safeClubName}
              </div>

              <h1
                style="
                  color:${textOnPrimary};
                  margin:0;
                  font-size:24px;
                  line-height:1.3;
                  font-weight:800;
                  letter-spacing:-0.02em;
                "
              >
                Your ${plural} ready!
              </h1>

              <p
                style="
                  color:${textOnPrimary};
                  opacity:0.9;
                  margin:10px 0 0;
                  font-size:14px;
                  line-height:1.5;
                "
              >
                Thanks for supporting ${safeTitle}
              </p>

            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td
              style="
                padding:26px 28px 32px;
              "
            >

              <p
                style="
                  color:#1e293b;
                  font-size:16px;
                  margin:0 0 8px;
                "
              >
                Hi <strong>${safeBuyerName}</strong>,
              </p>

              <p
                style="
                  color:#475569;
                  font-size:15px;
                  line-height:1.65;
                  margin:0 0 22px;
                "
              >
                Your payment is confirmed. Your puzzle access is ready -
                use the button below for each puzzle you bought to start
                playing.
              </p>

              <table
                role="presentation"
                style="
                  width:100%;
                  border-collapse:collapse;
                  background:#FBF8F3;
                  border:1px solid #ece7df;
                  border-radius:10px;
                  overflow:hidden;
                "
              >
                <tbody>
                  ${itemsHtml}
                </tbody>
              </table>

              ${totalHtml}

              <div
                style="
                  background:#fafafa;
                  border:1px solid #eeeeee;
                  border-radius:10px;
                  padding:15px 18px;
                  margin-top:16px;
                "
              >
                <p
                  style="
                    margin:0;
                    color:#64748b;
                    font-size:13px;
                    line-height:1.6;
                  "
                >
                  💌 This confirmation was sent to
                  <strong style="color:#1e293b;">
                    ${safeBuyerEmail}
                  </strong>.
                  Keep this email safe - each link gives you access to
                  that puzzle.
                </p>
              </div>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td
              align="center"
              style="
                background:#f8fafc;
                border-top:1px solid #e2e8f0;
                padding:16px 28px;
              "
            >
              <p
                style="
                  color:#94a3b8;
                  font-size:12px;
                  line-height:1.5;
                  margin:0;
                "
              >
                Fundraising for
                <strong style="color:#64748b;">
                  ${safeClubName}
                </strong>
                &nbsp;•&nbsp;
                Powered by
                <strong style="color:${primaryColor};">
                  FundRaisely
                </strong>
              </p>
            </td>
          </tr>

        </table>

      </td>
    </tr>
  </table>
</body>
</html>
`;

  // ───────────────────────────────────────────────────────────────────────────
  // Subject + send
  // ───────────────────────────────────────────────────────────────────────────

  const subject =
    `🧩 ${clubName} Puzzle Drop - your puzzle` +
    `${items.length > 1 ? 's are' : ' is'} ready!`;

  await sendEmailSafe({
    to: buyerEmail,
    subject,
    html,
  });

  console.log(
    `[PuzzleDropEmail] 📧 Confirmation sent to ${buyerEmail} ` +
    `(drop: ${dropRoomId}, items: ${items.length})`
  );
}