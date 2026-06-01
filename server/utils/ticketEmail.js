// server/utils/ticketEmail.js
// UPDATED: game_type aware — supports 'quiz' and 'elimination' (and future types)
// UPDATED: club name shown prominently, correct join URLs per game type

import { sendEmailSafe } from './mailer.js';
import { connection, TABLE_PREFIX } from '../config/database.js';

const CLUBS_TABLE = `${TABLE_PREFIX}clubs`;

async function getClubName(clubId) {
  try {
    const [rows] = await connection.execute(
      `SELECT name FROM ${CLUBS_TABLE} WHERE id = ? LIMIT 1`,
      [clubId]
    );
    return rows?.[0]?.name || null;
  } catch {
    return null;
  }
}

function formatDateTime(isoString, timeZone) {
  try {
    return new Intl.DateTimeFormat('en-IE', {
      timeZone: timeZone || 'Europe/Dublin',
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(isoString));
  } catch {
    return isoString;
  }
}

function formatAmount(amount, currencySymbol) {
  return `${currencySymbol || '€'}${parseFloat(amount).toFixed(2)}`;
}

function buildExtrasHtml(extras, currencySymbol) {
  if (!extras || extras.length === 0) return '';

  const rows = extras
    .map(
      (e) => `
    <tr>
      <td style="padding:6px 12px;border-bottom:1px solid #f0f0f0;color:#555;">
        ${e.extraId?.replace(/_/g, ' ') || 'Extra'}
      </td>
      <td style="padding:6px 12px;border-bottom:1px solid #f0f0f0;text-align:right;color:#555;">
        ${formatAmount(e.price, currencySymbol)}
      </td>
    </tr>
  `
    )
    .join('');

  return `
    <div style="margin:20px 0;">
      <p style="font-weight:600;color:#333;margin-bottom:8px;">Extras purchased:</p>
      <table style="width:100%;border-collapse:collapse;background:#fafafa;border-radius:8px;overflow:hidden;">
        ${rows}
      </table>
    </div>
  `;
}

// ─── Game-type helpers ────────────────────────────────────────────────────────

/**
 * Returns display strings and join URL based on game_type.
 * Defaults to quiz behaviour for backwards compatibility.
 */
function getGameTypeMeta(gameType, roomId, ticketId, appUrl) {
  const statusUrl = `${appUrl}/tickets/status/${ticketId}`;

  switch (gameType) {
    case 'elimination':
      return {
        label: 'Elimination Game',
        emoji: '🏆',
        headerSubtitle: 'Your elimination ticket is confirmed',
        subjectLabel: 'elimination game',
        buttonText: 'View My Ticket & Join Game',
        joinUrl: statusUrl, // player goes to status page; join button there uses /elimination/join/:roomId?ticket=
        eventLabel: 'Game date',
        completedLabel: 'elimination game',
      };

    case 'quiz':
    default:
      return {
        label: 'Quiz Night',
        emoji: '🎟️',
        headerSubtitle: 'Your quiz ticket is confirmed',
        subjectLabel: 'quiz',
        buttonText: 'View My Ticket & Join Quiz',
        joinUrl: statusUrl,
        eventLabel: 'Quiz date',
        completedLabel: 'quiz',
      };
  }
}

// ─── getTicketWithRoomConfig ──────────────────────────────────────────────────
// Joins room row to get game_type alongside existing config_json.
// Also joins clubs table so club_name is available without a second query.

export async function getTicketWithRoomConfig(ticketId) {
  const TICKETS_TABLE = `${TABLE_PREFIX}quiz_tickets`;
  const ROOMS_TABLE = `${TABLE_PREFIX}web2_quiz_rooms`;
  const CLUBS_TABLE_LOCAL = `${TABLE_PREFIX}clubs`;

  const [rows] = await connection.execute(
    `SELECT
       t.*,
       r.config_json,
       r.game_type,
       c.name AS club_name
     FROM ${TICKETS_TABLE} t
     LEFT JOIN ${ROOMS_TABLE} r
       ON r.room_id COLLATE utf8mb4_0900_ai_ci = t.room_id COLLATE utf8mb4_0900_ai_ci
 LEFT JOIN ${CLUBS_TABLE_LOCAL} c
  ON c.id COLLATE utf8mb4_0900_ai_ci = t.club_id COLLATE utf8mb4_0900_ai_ci
     WHERE t.ticket_id = ? LIMIT 1`,
    [ticketId]
  );
  return rows?.[0] || null;
}

// ─── sendTicketConfirmationEmail ──────────────────────────────────────────────

export async function sendTicketConfirmationEmail({
  ticketId,
  purchaserEmail,
  purchaserName,
  playerName,
  entryFee,
  extrasTotal,
  totalAmount,
  currency,
  currencySymbol,
  extras,
  clubId,
  hostName,
  eventDateTime,
  timeZone,
  gameType = 'quiz',   // ← new param, defaults to 'quiz' for backwards compat
  clubName: clubNameParam = null, // ← can be passed in directly (from getTicketWithRoomConfig)
}) {
   console.log('[TicketEmail] 🔍 gameType received:', gameType, '| clubName:', clubNameParam);
  const appUrl = process.env.APP_URL || 'https://fundraisely.ie';

  // Prefer passed-in clubName (already fetched by getTicketWithRoomConfig join),
  // fall back to a lookup, then to hostName.
  const clubName = clubNameParam || (await getClubName(clubId));
  const displayName = clubName || hostName || 'your host';

  const meta = getGameTypeMeta(gameType, null, ticketId, appUrl);

  const formattedDate = eventDateTime
    ? formatDateTime(eventDateTime, timeZone)
    : null;

  const extrasHtml = buildExtrasHtml(extras, currencySymbol);
  const symbol = currencySymbol || '€';

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin:0;padding:0;background:#f5f5f5;font-family:'Segoe UI',Arial,sans-serif;">
      <div style="max-width:560px;margin:32px auto;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">

        <!-- Header -->
        <div style="background:linear-gradient(135deg,#4f46e5,#7c3aed);padding:32px 24px;text-align:center;">
          <div style="font-size:40px;margin-bottom:8px;">${meta.emoji}</div>
          <h1 style="color:#ffffff;margin:0;font-size:24px;font-weight:700;">You're in!</h1>
          <p style="color:#c7d2fe;margin:8px 0 0;font-size:15px;">${meta.headerSubtitle}</p>
        </div>

        <!-- Club / Event banner -->
        <div style="background:#f0f4ff;border-bottom:1px solid #e0e7ff;padding:16px 24px;">
          <div style="display:flex;align-items:center;gap:10px;">
            <span style="font-size:20px;">🏢</span>
            <div>
              <div style="font-size:12px;color:#6366f1;text-transform:uppercase;letter-spacing:0.06em;font-weight:600;">
                ${meta.label}
              </div>
              <div style="font-size:16px;font-weight:700;color:#1e1b4b;">
                ${displayName}
              </div>
            </div>
          </div>
        </div>

        <!-- Body -->
        <div style="padding:28px 24px;">

          <p style="color:#333;font-size:16px;margin-top:0;">
            Hi <strong>${purchaserName}</strong>,
          </p>
          <p style="color:#555;font-size:15px;line-height:1.6;">
            Thanks for purchasing a ticket for the ${meta.completedLabel} hosted by
            <strong>${displayName}</strong>.
            ${playerName && playerName !== purchaserName ? `You'll be playing as <strong>${playerName}</strong>.` : ''}
          </p>

          ${
            formattedDate
              ? `
          <!-- Event date -->
          <div style="background:#f0f4ff;border-radius:8px;padding:14px 16px;margin:20px 0;display:flex;align-items:center;gap:10px;">
            <span style="font-size:20px;">📅</span>
            <div>
              <div style="font-size:11px;color:#6366f1;text-transform:uppercase;letter-spacing:0.06em;font-weight:600;margin-bottom:2px;">
                ${meta.eventLabel}
              </div>
              <span style="color:#3730a3;font-weight:600;font-size:15px;">${formattedDate}</span>
            </div>
          </div>`
              : ''
          }

          <!-- Ticket ID -->
          <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:14px 16px;margin:20px 0;">
            <p style="margin:0 0 4px;color:#888;font-size:12px;text-transform:uppercase;letter-spacing:0.05em;">Ticket ID</p>
            <p style="margin:0;color:#111;font-size:16px;font-weight:700;font-family:monospace;">${ticketId}</p>
          </div>

          <!-- Payment breakdown -->
          <div style="margin:20px 0;">
            <p style="font-weight:600;color:#333;margin-bottom:8px;">Payment summary:</p>
            <table style="width:100%;border-collapse:collapse;">
              <tr>
                <td style="padding:6px 12px;border-bottom:1px solid #f0f0f0;color:#555;">Entry fee</td>
                <td style="padding:6px 12px;border-bottom:1px solid #f0f0f0;text-align:right;color:#555;">
                  ${formatAmount(entryFee, symbol)}
                </td>
              </tr>
            </table>
          </div>

          ${extrasHtml}

          <!-- Total -->
          <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:14px 16px;margin:20px 0;display:flex;justify-content:space-between;align-items:center;">
            <span style="font-weight:700;color:#166534;font-size:16px;">Total paid</span>
            <span style="font-weight:700;color:#166534;font-size:20px;">${formatAmount(totalAmount, symbol)}</span>
          </div>

          <!-- What happens next -->
          <div style="background:#fafafa;border:1px solid #e5e7eb;border-radius:8px;padding:16px;margin:20px 0;">
            <p style="font-weight:600;color:#333;margin:0 0 10px;">What happens next</p>
            <ol style="margin:0;padding-left:20px;color:#555;font-size:14px;line-height:1.8;">
              <li>The host confirms your payment</li>
              <li>Your ticket becomes ready to use</li>
              <li>Use your ticket link on the night</li>
              <li>Check your ticket status anytime using the button below</li>
            </ol>
          </div>

          <!-- CTA button -->
          <div style="text-align:center;margin:28px 0 8px;">
            <a href="${meta.joinUrl}"
               style="display:inline-block;background:linear-gradient(135deg,#4f46e5,#7c3aed);color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:8px;font-size:16px;font-weight:700;">
              ${meta.buttonText}
            </a>
          </div>
          <p style="text-align:center;color:#888;font-size:12px;">
            Or paste this link: <a href="${meta.joinUrl}" style="color:#4f46e5;">${meta.joinUrl}</a>
          </p>

        </div>

        <!-- Footer -->
        <div style="background:#f9fafb;border-top:1px solid #f0f0f0;padding:16px 24px;text-align:center;">
          <p style="color:#aaa;font-size:12px;margin:0;">
            Powered by FundRaisely &bull; Good luck! 🍀
          </p>
        </div>

      </div>
    </body>
    </html>
  `;

  return sendEmailSafe({
    to: purchaserEmail,
    subject: `${meta.emoji} Your ${meta.subjectLabel} ticket is confirmed — ${displayName}`,
    html,
  });
}