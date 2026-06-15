// server/utils/ticketedEventEmail.js
// No embedded QR — email clients block base64 images.
// The ticket status page at /tickets/status/:ticketId IS the ticket.
// The email's only job is to get the attendee to that page reliably.

import { sendEmailSafe } from './mailer.js';

function formatDateTime(isoString, timeZone) {
  try {
    return new Intl.DateTimeFormat('en-IE', {
      timeZone:  timeZone || 'Europe/Dublin',
      weekday:   'long',
      year:      'numeric',
      month:     'long',
      day:       'numeric',
      hour:      '2-digit',
      minute:    '2-digit',
    }).format(new Date(isoString));
  } catch {
    return isoString;
  }
}

function formatAmount(amount, symbol) {
  return `${symbol || '€'}${parseFloat(amount).toFixed(2)}`;
}

export async function sendTicketedEventConfirmationEmail({
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
}) {
  const appUrl       = process.env.APP_URL || 'https://fundraisely.ie';
  const ticketUrl    = `${appUrl}/tickets/status/${ticketId}`;
  const symbol       = currencySymbol || '€';
  const displayName  = clubName || 'your host';
  const attendeeName = playerName || purchaserName;
  const formattedDate = eventDateTime ? formatDateTime(eventDateTime, timeZone) : null;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background:#f6f1e8;font-family:'Segoe UI',Arial,sans-serif;">
<div style="max-width:560px;margin:32px auto;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 16px rgba(16,37,50,0.1);">

  <!-- Top accent bar -->
  <div style="height:5px;background:linear-gradient(90deg,#157f85,#0e6268);"></div>

  <!-- Header -->
  <div style="background:#102532;padding:32px 28px;text-align:center;">
    <div style="font-size:40px;margin-bottom:10px;">🎫</div>
    <h1 style="color:#ffffff;margin:0;font-size:22px;font-weight:700;">You're on the list!</h1>
    <p style="color:rgba(255,255,255,0.55);margin:8px 0 0;font-size:14px;">Your ticket is confirmed</p>
  </div>

  <!-- Club / event name -->
  <div style="background:#f6f1e8;border-bottom:1px solid #dce1df;padding:16px 28px;">
    <p style="margin:0;font-size:11px;color:#8a6d2f;text-transform:uppercase;letter-spacing:0.08em;font-weight:700;">Hosted by</p>
    <p style="margin:4px 0 0;font-size:18px;font-weight:700;color:#102532;">${displayName}</p>
    ${eventTitle ? `<p style="margin:3px 0 0;font-size:14px;color:#52636f;font-weight:600;">${eventTitle}</p>` : ''}
  </div>

  <!-- Body -->
  <div style="padding:28px;">

    <p style="color:#102532;font-size:15px;margin:0 0 6px;">Hi <strong>${purchaserName}</strong>,</p>
    <p style="color:#52636f;font-size:14px;line-height:1.6;margin:0 0 24px;">
      ${attendeeName !== purchaserName
        ? `Your ticket for <strong>${attendeeName}</strong> has been confirmed.`
        : 'Your ticket has been confirmed.'}
      ${eventTitle ? ` We look forward to seeing you at <strong>${eventTitle}</strong>.` : ''}
    </p>

    <!-- Event details -->
    <div style="background:#f6f1e8;border-radius:12px;padding:18px;margin-bottom:24px;">
      <p style="margin:0 0 12px;font-size:11px;color:#8a6d2f;text-transform:uppercase;letter-spacing:0.08em;font-weight:700;">Event Details</p>

      ${formattedDate ? `
      <div style="margin-bottom:10px;">
        <p style="margin:0;font-size:11px;color:#8a9bab;text-transform:uppercase;letter-spacing:0.05em;font-weight:600;">Date &amp; Time</p>
        <p style="margin:3px 0 0;font-size:14px;font-weight:600;color:#102532;">📅 ${formattedDate}</p>
      </div>` : ''}

      ${eventLocation ? `
      <div style="margin-bottom:10px;">
        <p style="margin:0;font-size:11px;color:#8a9bab;text-transform:uppercase;letter-spacing:0.05em;font-weight:600;">Location</p>
        <p style="margin:3px 0 0;font-size:14px;font-weight:600;color:#102532;">📍 ${eventLocation}</p>
      </div>` : ''}

      <div>
        <p style="margin:0;font-size:11px;color:#8a9bab;text-transform:uppercase;letter-spacing:0.05em;font-weight:600;">Ticket ID</p>
        <p style="margin:3px 0 0;font-size:15px;font-weight:700;color:#102532;font-family:monospace;letter-spacing:0.05em;">${ticketId}</p>
      </div>
    </div>

    <!-- Payment summary -->
    <div style="border:1px solid #dce1df;border-radius:12px;overflow:hidden;margin-bottom:28px;">
      <div style="background:#fbf8f2;padding:10px 16px;border-bottom:1px solid #dce1df;">
        <p style="margin:0;font-size:11px;color:#8a6d2f;text-transform:uppercase;letter-spacing:0.08em;font-weight:700;">Payment Summary</p>
      </div>
      <div style="padding:0 16px;">
        <table style="width:100%;border-collapse:collapse;">
          <tr>
            <td style="padding:10px 0;border-bottom:1px solid #f1f0ee;color:#52636f;font-size:13px;">Ticket price</td>
            <td style="padding:10px 0;border-bottom:1px solid #f1f0ee;text-align:right;color:#52636f;font-size:13px;">${formatAmount(entryFee, symbol)}</td>
          </tr>
          ${extrasTotal > 0 ? `
          <tr>
            <td style="padding:10px 0;border-bottom:1px solid #f1f0ee;color:#52636f;font-size:13px;">Extras</td>
            <td style="padding:10px 0;border-bottom:1px solid #f1f0ee;text-align:right;color:#52636f;font-size:13px;">${formatAmount(extrasTotal, symbol)}</td>
          </tr>` : ''}
          <tr>
            <td style="padding:12px 0;font-weight:700;color:#102532;font-size:15px;">Total paid</td>
            <td style="padding:12px 0;text-align:right;font-weight:700;color:#157f85;font-size:17px;">${formatAmount(totalAmount, symbol)}</td>
          </tr>
        </table>
      </div>
    </div>

    <!-- Primary CTA — the ticket link IS the ticket -->
    <div style="background:linear-gradient(135deg,#157f85,#0e6268);border-radius:14px;padding:24px;text-align:center;margin-bottom:20px;">
      <p style="color:rgba(255,255,255,0.8);font-size:12px;margin:0 0 6px;text-transform:uppercase;letter-spacing:0.08em;font-weight:700;">
        Your ticket link
      </p>
      <p style="color:#ffffff;font-size:14px;margin:0 0 18px;line-height:1.5;">
        Open this on your phone at the door.<br>The host will check you in from this page.
      </p>
      <a href="${ticketUrl}"
         style="display:inline-block;background:#ffffff;color:#157f85;text-decoration:none;padding:14px 32px;border-radius:10px;font-size:15px;font-weight:800;letter-spacing:0.01em;">
        Open My Ticket →
      </a>
      <p style="margin:14px 0 0;font-size:11px;color:rgba(255,255,255,0.6);word-break:break-all;">
        ${ticketUrl}
      </p>
    </div>

    <!-- On the night instructions -->
    <div style="border:1px solid #dce1df;border-radius:12px;padding:18px;">
      <p style="margin:0 0 10px;font-size:12px;font-weight:700;color:#52636f;text-transform:uppercase;letter-spacing:0.06em;">
        On the night
      </p>
      <ol style="margin:0;padding-left:18px;color:#52636f;font-size:13px;line-height:2;">
        <li>Open the <strong>Open My Ticket</strong> link above on your phone</li>
        <li>Show the page to the host at the door</li>
        <li>If you can't access the link, give the host your <strong>Ticket ID: ${ticketId}</strong></li>
      </ol>
    </div>

  </div>

  <!-- Footer -->
  <div style="background:#fbf8f2;border-top:1px solid #dce1df;padding:16px 28px;text-align:center;">
    <p style="color:#b8c6b0;font-size:11px;margin:0;">Powered by FundRaisely &bull; See you there! 🎉</p>
  </div>

</div>
</body>
</html>`;

  return sendEmailSafe({
    to:      purchaserEmail,
    subject: `🎫 Your ticket is confirmed — ${eventTitle || displayName}`,
    html,
  });
}