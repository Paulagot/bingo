// server/utils/ticketEmail.js
//
// Game-type aware:
//   - quiz
//   - elimination
//   - ticketed_event
//
// Quiz + Elimination use this email.
// Ticketed events are routed to their dedicated ticketedEventEmail.js.
//
// Prize / sponsor behaviour:
//   - Reads prizes directly from the room config_json
//   - Supports any number of prizes
//   - Shows place, description, value and sponsor
//   - Uses config_json.currency as the preferred currency source
//   - Does NOT hard-code EUR / € as a fallback

import { sendEmailSafe } from './mailer.js';
import { sendTicketedEventConfirmationEmail } from './ticketedEventEmail.js';
import { connection, TABLE_PREFIX } from '../config/database.js';

const CLUBS_TABLE = `${TABLE_PREFIX}clubs`;

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function getClubName(clubId) {
  try {
    const [rows] = await connection.execute(
      `SELECT name
       FROM ${CLUBS_TABLE}
       WHERE id = ?
       LIMIT 1`,
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

function parseRoomConfig(configJson) {
  if (!configJson) {
    return {};
  }

  if (typeof configJson === 'object') {
    return configJson;
  }

  try {
    return JSON.parse(configJson);
  } catch (err) {
    console.warn(
      '[ticketEmail] Could not parse room config_json:',
      err?.message || err
    );

    return {};
  }
}

function escapeHtml(value) {
  if (value == null) return '';

  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Formats money without assuming EUR.
 *
 * Priority:
 *   1. ISO currency code - e.g. EUR, GBP, USD
 *   2. Explicit currency symbol
 *   3. Plain numeric amount
 */
function formatAmount(
  amount,
  currency = null,
  currencySymbol = null
) {
  if (
    amount === null ||
    amount === undefined ||
    amount === ''
  ) {
    return '';
  }

  const numeric = Number(amount);

  if (!Number.isFinite(numeric)) {
    return escapeHtml(amount);
  }

  if (currency) {
    try {
      return new Intl.NumberFormat('en-IE', {
        style: 'currency',
        currency: String(currency).toUpperCase(),
        minimumFractionDigits: Number.isInteger(numeric) ? 0 : 2,
        maximumFractionDigits: 2,
      }).format(numeric);
    } catch {
      // Fall through to symbol / code formatting below.
    }
  }

  if (currencySymbol) {
    return `${escapeHtml(currencySymbol)}${numeric.toFixed(2)}`;
  }

  if (currency) {
    return `${numeric.toFixed(2)} ${escapeHtml(
      String(currency).toUpperCase()
    )}`;
  }

  return numeric.toFixed(2);
}

function ordinalPlace(place) {
  const numeric = Number(place);

  if (!Number.isFinite(numeric)) {
    return escapeHtml(place || 'Prize');
  }

  const mod100 = numeric % 100;

  if (mod100 >= 11 && mod100 <= 13) {
    return `${numeric}th`;
  }

  switch (numeric % 10) {
    case 1:
      return `${numeric}st`;

    case 2:
      return `${numeric}nd`;

    case 3:
      return `${numeric}rd`;

    default:
      return `${numeric}th`;
  }
}

// ─── Extras ───────────────────────────────────────────────────────────────────

function buildExtrasHtml(
  extras,
  currency,
  currencySymbol
) {
  if (!extras || extras.length === 0) {
    return '';
  }

  const rows = extras
    .map(
      (extra) => `
        <tr>
          <td
            style="
              padding:6px 12px;
              border-bottom:1px solid #f0f0f0;
              color:#555;
            "
          >
            ${escapeHtml(
              extra.extraId?.replace(/_/g, ' ') ||
                'Extra'
            )}
          </td>

          <td
            style="
              padding:6px 12px;
              border-bottom:1px solid #f0f0f0;
              text-align:right;
              color:#555;
            "
          >
            ${formatAmount(
              extra.price,
              currency,
              currencySymbol
            )}
          </td>
        </tr>
      `
    )
    .join('');

  return `
    <div style="margin:20px 0;">
      <p
        style="
          font-weight:600;
          color:#333;
          margin-bottom:8px;
        "
      >
        Extras purchased:
      </p>

      <table
        style="
          width:100%;
          border-collapse:collapse;
          background:#fafafa;
          border-radius:8px;
          overflow:hidden;
        "
      >
        ${rows}
      </table>
    </div>
  `;
}

// ─── Prizes ───────────────────────────────────────────────────────────────────

function buildPrizesHtml(
  prizes,
  currency,
  currencySymbol
) {
  if (!Array.isArray(prizes) || prizes.length === 0) {
    return '';
  }

  const validPrizes = prizes.filter(
    (prize) =>
      prize &&
      (
        prize.description ||
        prize.sponsor ||
        prize.value !== null &&
        prize.value !== undefined &&
        prize.value !== ''
      )
  );

  if (validPrizes.length === 0) {
    return '';
  }

  const prizeRows = validPrizes
    .map((prize, index) => {
      const place =
        prize.place ??
        index + 1;

      const placeLabel =
        `${ordinalPlace(place)} Prize`;

      const description =
        prize.description
          ? escapeHtml(prize.description)
          : null;

      const sponsor =
        prize.sponsor
          ? escapeHtml(prize.sponsor)
          : null;

      const formattedValue =
        prize.value !== null &&
        prize.value !== undefined &&
        prize.value !== ''
          ? formatAmount(
              prize.value,
              currency,
              currencySymbol
            )
          : null;

      return `
        <div
          style="
            padding:16px 0;
            border-bottom:
              ${
                index === validPrizes.length - 1
                  ? 'none'
                  : '1px solid #fde68a'
              };
          "
        >
          <div
            style="
              font-size:11px;
              font-weight:700;
              color:#a16207;
              text-transform:uppercase;
              letter-spacing:0.08em;
              margin-bottom:5px;
            "
          >
            🏆 ${placeLabel}
          </div>

          ${
            description
              ? `
                <div
                  style="
                    font-size:16px;
                    font-weight:700;
                    color:#422006;
                    margin-bottom:3px;
                  "
                >
                  ${description}
                </div>
              `
              : ''
          }

          ${
            formattedValue
              ? `
                <div
                  style="
                    color:#ca8a04;
                    font-size:14px;
                    font-weight:600;
                    margin-bottom:${sponsor ? '8px' : '0'};
                  "
                >
                  ${formattedValue} value
                </div>
              `
              : ''
          }

          ${
            sponsor
              ? `
                <div
                  style="
                    margin-top:6px;
                    padding-top:8px;
                    border-top:1px solid rgba(202,138,4,0.12);
                  "
                >
                  <span
                    style="
                      font-size:11px;
                      color:#78716c;
                    "
                  >
                    Prize sponsored by
                  </span>

                  <strong
                    style="
                      display:block;
                      margin-top:2px;
                      font-size:14px;
                      color:#92400e;
                    "
                  >
                    ${sponsor}
                  </strong>
                </div>
              `
              : ''
          }
        </div>
      `;
    })
    .join('');

  const heading =
    validPrizes.length === 1
      ? 'Tonight’s Prize'
      : 'Tonight’s Prizes';

  const intro =
    validPrizes.length === 1
      ? 'Here’s what you could win.'
      : 'Here’s what’s up for grabs.';

  return `
    <div
      style="
        background:#fffbeb;
        border:1px solid #fde68a;
        border-radius:10px;
        padding:18px 20px;
        margin:22px 0;
      "
    >
      <div
        style="
          text-align:center;
          margin-bottom:4px;
        "
      >
        <div
          style="
            font-size:24px;
            margin-bottom:4px;
          "
        >
          🏆
        </div>

        <div
          style="
            font-size:13px;
            color:#a16207;
            text-transform:uppercase;
            letter-spacing:0.08em;
            font-weight:700;
          "
        >
          ${heading}
        </div>

        <div
          style="
            font-size:13px;
            color:#78716c;
            margin-top:4px;
          "
        >
          ${intro}
        </div>
      </div>

      <div>
        ${prizeRows}
      </div>
    </div>
  `;
}

// ─── Game-type helpers ────────────────────────────────────────────────────────

function getGameTypeMeta(
  gameType,
  roomId,
  ticketId,
  appUrl
) {
  const statusUrl =
    `${appUrl}/tickets/status/${ticketId}`;

  switch (gameType) {
    case 'elimination':
      return {
        label: 'Elimination Game',
        emoji: '🏆',
        headerSubtitle:
          'Your elimination ticket is confirmed',
        subjectLabel:
          'elimination game',
        buttonText:
          'View My Ticket & Join Game',
        joinUrl: statusUrl,
        eventLabel:
          'Game date',
        completedLabel:
          'elimination game',
      };

    case 'quiz':
    default:
      return {
        label: 'Quiz Night',
        emoji: '🎟️',
        headerSubtitle:
          'Your quiz ticket is confirmed',
        subjectLabel:
          'quiz',
        buttonText:
          'View My Ticket & Join Quiz',
        joinUrl: statusUrl,
        eventLabel:
          'Quiz date',
        completedLabel:
          'quiz',
      };
  }
}

// ─── getTicketWithRoomConfig ──────────────────────────────────────────────────

export async function getTicketWithRoomConfig(
  ticketId
) {
  const TICKETS_TABLE =
    `${TABLE_PREFIX}quiz_tickets`;

  const ROOMS_TABLE =
    `${TABLE_PREFIX}web2_quiz_rooms`;

  const CLUBS_TABLE_LOCAL =
    `${TABLE_PREFIX}clubs`;

  const [rows] = await connection.execute(
    `SELECT
       t.*,
       r.config_json,
       r.game_type,
       c.name AS club_name
     FROM ${TICKETS_TABLE} t
     LEFT JOIN ${ROOMS_TABLE} r
       ON r.room_id = t.room_id
     LEFT JOIN ${CLUBS_TABLE_LOCAL} c
       ON c.id = t.club_id
     WHERE t.ticket_id = ?
     LIMIT 1`,
    [ticketId]
  );

  const row =
    rows?.[0] || null;

  // ── DIAGNOSTIC
  // Remove once game_type routing is confirmed working.
  console.log(
    '[getTicketWithRoomConfig] ticketId:',
    ticketId
  );

  console.log(
    '[getTicketWithRoomConfig] row found:',
    !!row
  );

  if (row) {
    console.log(
      '[getTicketWithRoomConfig] room_id on ticket:',
      row.room_id
    );

    console.log(
      '[getTicketWithRoomConfig] game_type from JOIN:',
      row.game_type
    );

    console.log(
      '[getTicketWithRoomConfig] club_name from JOIN:',
      row.club_name
    );

    console.log(
      '[getTicketWithRoomConfig] config_json present:',
      !!row.config_json
    );
  }

  return row;
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

  gameType = 'quiz',

  clubName:
    clubNameParam = null,

  eventTitle = null,
  eventLocation = null,
}) {
  // ── DIAGNOSTIC
  // Remove once confirmed working.

  console.log(
    '[sendTicketConfirmationEmail] ─────────────────────────────────'
  );

  console.log(
    '[sendTicketConfirmationEmail] ticketId:',
    ticketId
  );

  console.log(
    '[sendTicketConfirmationEmail] gameType param:',
    gameType
  );

  console.log(
    '[sendTicketConfirmationEmail] clubNameParam:',
    clubNameParam
  );

  console.log(
    '[sendTicketConfirmationEmail] eventTitle:',
    eventTitle
  );

  console.log(
    '[sendTicketConfirmationEmail] eventLocation:',
    eventLocation
  );

  console.log(
    '[sendTicketConfirmationEmail] purchaserEmail:',
    purchaserEmail
  );

  // ────────────────────────────────────────────────────────────────────────────
  // Ticketed events get their own dedicated email.
  // Do not apply Quiz / Elimination prize formatting here.
  // ────────────────────────────────────────────────────────────────────────────

  if (gameType === 'ticketed_event') {
    console.log(
      '[sendTicketConfirmationEmail] ✅ Routing to ticketed event email'
    );

    const clubName =
      clubNameParam ||
      (await getClubName(clubId));

    return sendTicketedEventConfirmationEmail({
      ticketId,
      purchaserEmail,
      purchaserName,
      playerName,

      entryFee,
      extrasTotal,
      totalAmount,

      currency,
      currencySymbol,

      clubName,
      eventTitle,
      eventLocation,
      eventDateTime,
      timeZone,
    });
  }

  // ────────────────────────────────────────────────────────────────────────────
  // Quiz / Elimination
  // ────────────────────────────────────────────────────────────────────────────

  console.log(
    '[sendTicketConfirmationEmail] ➡️ Routing to quiz/elimination email, gameType:',
    gameType
  );

  const appUrl =
    process.env.APP_URL ||
    'https://fundraisely.ie';

  // Load the ticket + room config so prize/sponsor information
  // comes from the actual room configuration.
  let ticketRoom = null;

  try {
    ticketRoom =
      await getTicketWithRoomConfig(ticketId);
  } catch (err) {
    // Email should still send even if prize lookup fails.
    console.warn(
      '[sendTicketConfirmationEmail] Could not load room config:',
      err?.message || err
    );
  }

  const roomConfig =
    parseRoomConfig(
      ticketRoom?.config_json
    );

  const prizes =
    Array.isArray(roomConfig?.prizes)
      ? roomConfig.prizes
      : [];

  /**
   * Currency priority:
   *
   * 1. Room config currency
   *    This was populated from the club currency when
   *    the room was created.
   *
   * 2. Currency supplied by the existing email caller
   *
   * No EUR fallback.
   */
  const resolvedCurrency =
    roomConfig?.currency ||
    currency ||
    null;

  /**
   * currencySymbol is useful as a fallback for older
   * rooms where only the symbol may exist.
   */
  const resolvedCurrencySymbol =
    roomConfig?.currencySymbol ||
    currencySymbol ||
    null;

  const clubName =
    clubNameParam ||
    ticketRoom?.club_name ||
    (await getClubName(clubId));

  const displayName =
    clubName ||
    hostName ||
    'your host';

  const meta =
    getGameTypeMeta(
      gameType,
      null,
      ticketId,
      appUrl
    );

  const resolvedEventDateTime =
    eventDateTime ||
    roomConfig?.eventDateTime ||
    null;

  const resolvedTimeZone =
    timeZone ||
    roomConfig?.timeZone ||
    null;

  const formattedDate =
    resolvedEventDateTime
      ? formatDateTime(
          resolvedEventDateTime,
          resolvedTimeZone
        )
      : null;

  const extrasHtml =
    buildExtrasHtml(
      extras,
      resolvedCurrency,
      resolvedCurrencySymbol
    );

  const prizesHtml =
    buildPrizesHtml(
      prizes,
      resolvedCurrency,
      resolvedCurrencySymbol
    );

  // ─── Email HTML ─────────────────────────────────────────────────────────────

  const html = `
    <!DOCTYPE html>

    <html>
      <head>
        <meta charset="utf-8">

        <meta
          name="viewport"
          content="width=device-width, initial-scale=1.0"
        >
      </head>

      <body
        style="
          margin:0;
          padding:0;
          background:#f5f5f5;
          font-family:'Segoe UI',Arial,sans-serif;
        "
      >
        <div
          style="
            max-width:560px;
            margin:32px auto;
            background:#ffffff;
            border-radius:12px;
            overflow:hidden;
            box-shadow:0 2px 8px rgba(0,0,0,0.08);
          "
        >

          <!-- Header -->

          <div
            style="
              background:linear-gradient(
                135deg,
                #4f46e5,
                #7c3aed
              );
              padding:32px 24px;
              text-align:center;
            "
          >
            <div
              style="
                font-size:40px;
                margin-bottom:8px;
              "
            >
              ${meta.emoji}
            </div>

            <h1
              style="
                color:#ffffff;
                margin:0;
                font-size:24px;
                font-weight:700;
              "
            >
              You're in!
            </h1>

            <p
              style="
                color:#c7d2fe;
                margin:8px 0 0;
                font-size:15px;
              "
            >
              ${meta.headerSubtitle}
            </p>
          </div>

          <!-- Club / Event banner -->

          <div
            style="
              background:#f0f4ff;
              border-bottom:1px solid #e0e7ff;
              padding:16px 24px;
            "
          >
            <div
              style="
                display:flex;
                align-items:center;
                gap:10px;
              "
            >
              <span
                style="
                  font-size:20px;
                "
              >
                🏢
              </span>

              <div>
                <div
                  style="
                    font-size:12px;
                    color:#6366f1;
                    text-transform:uppercase;
                    letter-spacing:0.06em;
                    font-weight:600;
                  "
                >
                  ${meta.label}
                </div>

                <div
                  style="
                    font-size:16px;
                    font-weight:700;
                    color:#1e1b4b;
                  "
                >
                  ${escapeHtml(displayName)}
                </div>
              </div>
            </div>
          </div>

          <!-- Body -->

          <div
            style="
              padding:28px 24px;
            "
          >

            <p
              style="
                color:#333;
                font-size:16px;
                margin-top:0;
              "
            >
              Hi
              <strong>
                ${escapeHtml(
                  purchaserName ||
                    playerName ||
                    'there'
                )}
              </strong>,
            </p>

            <p
              style="
                color:#555;
                font-size:15px;
                line-height:1.6;
              "
            >
              Thanks for purchasing a ticket for the
              ${meta.completedLabel}
              hosted by

              <strong>
                ${escapeHtml(displayName)}
              </strong>.

              ${
                playerName &&
                playerName !== purchaserName
                  ? `
                    You'll be playing as
                    <strong>
                      ${escapeHtml(playerName)}
                    </strong>.
                  `
                  : ''
              }
            </p>

            ${
              formattedDate
                ? `
                  <div
                    style="
                      background:#f0f4ff;
                      border-radius:8px;
                      padding:14px 16px;
                      margin:20px 0;
                      display:flex;
                      align-items:center;
                      gap:10px;
                    "
                  >
                    <span
                      style="
                        font-size:20px;
                      "
                    >
                      📅
                    </span>

                    <div>
                      <div
                        style="
                          font-size:11px;
                          color:#6366f1;
                          text-transform:uppercase;
                          letter-spacing:0.06em;
                          font-weight:600;
                          margin-bottom:2px;
                        "
                      >
                        ${meta.eventLabel}
                      </div>

                      <span
                        style="
                          color:#3730a3;
                          font-weight:600;
                          font-size:15px;
                        "
                      >
                        ${escapeHtml(formattedDate)}
                      </span>
                    </div>
                  </div>
                `
                : ''
            }

            <!-- Prize / Sponsor section -->

            ${prizesHtml}

            <!-- Ticket ID -->

            <div
              style="
                background:#f9fafb;
                border:1px solid #e5e7eb;
                border-radius:8px;
                padding:14px 16px;
                margin:20px 0;
              "
            >
              <p
                style="
                  margin:0 0 4px;
                  color:#888;
                  font-size:12px;
                  text-transform:uppercase;
                  letter-spacing:0.05em;
                "
              >
                Ticket ID
              </p>

              <p
                style="
                  margin:0;
                  color:#111;
                  font-size:16px;
                  font-weight:700;
                  font-family:monospace;
                "
              >
                ${escapeHtml(ticketId)}
              </p>
            </div>

            <!-- Payment summary -->

            <div
              style="
                margin:20px 0;
              "
            >
              <p
                style="
                  font-weight:600;
                  color:#333;
                  margin-bottom:8px;
                "
              >
                Payment summary:
              </p>

              <table
                style="
                  width:100%;
                  border-collapse:collapse;
                "
              >
                <tr>
                  <td
                    style="
                      padding:6px 12px;
                      border-bottom:1px solid #f0f0f0;
                      color:#555;
                    "
                  >
                    Entry fee
                  </td>

                  <td
                    style="
                      padding:6px 12px;
                      border-bottom:1px solid #f0f0f0;
                      text-align:right;
                      color:#555;
                    "
                  >
                    ${formatAmount(
                      entryFee,
                      resolvedCurrency,
                      resolvedCurrencySymbol
                    )}
                  </td>
                </tr>
              </table>
            </div>

            ${extrasHtml}

            <!-- Total -->

            <div
              style="
                background:#f0fdf4;
                border:1px solid #bbf7d0;
                border-radius:8px;
                padding:14px 16px;
                margin:20px 0;
                display:flex;
                justify-content:space-between;
                align-items:center;
              "
            >
              <span
                style="
                  font-weight:700;
                  color:#166534;
                  font-size:16px;
                "
              >
                Total paid
              </span>

              <span
                style="
                  font-weight:700;
                  color:#166534;
                  font-size:20px;
                "
              >
                ${formatAmount(
                  totalAmount,
                  resolvedCurrency,
                  resolvedCurrencySymbol
                )}
              </span>
            </div>

            <!-- What happens next -->

            <div
              style="
                background:#fafafa;
                border:1px solid #e5e7eb;
                border-radius:8px;
                padding:16px;
                margin:20px 0;
              "
            >
              <p
                style="
                  font-weight:600;
                  color:#333;
                  margin:0 0 10px;
                "
              >
                What happens next
              </p>

              <ol
                style="
                  margin:0;
                  padding-left:20px;
                  color:#555;
                  font-size:14px;
                  line-height:1.8;
                "
              >
                <li>
                  The host confirms your payment
                </li>

                <li>
                  Your ticket becomes ready to use
                </li>

                <li>
                  Use your ticket link on the night
                </li>

                <li>
                  Check your ticket status anytime
                  using the button below
                </li>
              </ol>
            </div>

            <!-- CTA -->

            <div
              style="
                text-align:center;
                margin:28px 0 8px;
              "
            >
              <a
                href="${meta.joinUrl}"
                style="
                  display:inline-block;
                  background:linear-gradient(
                    135deg,
                    #4f46e5,
                    #7c3aed
                  );
                  color:#ffffff;
                  text-decoration:none;
                  padding:14px 32px;
                  border-radius:8px;
                  font-size:16px;
                  font-weight:700;
                "
              >
                ${meta.buttonText}
              </a>
            </div>

            <p
              style="
                text-align:center;
                color:#888;
                font-size:12px;
              "
            >
              Or paste this link:

              <a
                href="${meta.joinUrl}"
                style="
                  color:#4f46e5;
                "
              >
                ${meta.joinUrl}
              </a>
            </p>

          </div>

          <!-- Footer -->

          <div
            style="
              background:#f9fafb;
              border-top:1px solid #f0f0f0;
              padding:16px 24px;
              text-align:center;
            "
          >
            <p
              style="
                color:#aaa;
                font-size:12px;
                margin:0;
              "
            >
              Powered by FundRaisely
              &bull;
              Good luck! 🍀
            </p>
          </div>

        </div>
      </body>
    </html>
  `;

  return sendEmailSafe({
    to: purchaserEmail,

    subject:
      `${meta.emoji} Your ${meta.subjectLabel} ticket is confirmed - ${displayName}`,

    html,
  });
}