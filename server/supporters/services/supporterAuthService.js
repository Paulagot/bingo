/**
 * Supporter Auth Service
 * server/supporters/services/supporterAuthService.js
 *
 * Handles magic link generation, verification, and JWT issuance
 * for supporters/players. Scoped per club — same email at two
 * different clubs = two separate supporter records.
 */

import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import database from '../../config/database.js';
import { v4 as uuidv4 } from 'uuid';
import { sendEmailSafe } from '../../utils/mailer.js';

const JWT_SECRET        = process.env.JWT_SECRET || 'fallback-dev-secret';
const MAGIC_LINK_TTL_MS = 15 * 60 * 1000; // 15 minutes
const JWT_TTL           = '90d';
const APP_URL           = process.env.APP_URL || 'https://fundraisely.ie';

// ─── Find or create supporter ─────────────────────────────────────────────────

export async function findOrCreateSupporter({ email, name, clubId, challengeId }) {
  // Look for existing supporter at this club
  const [[existing]] = await database.connection.execute(
    `SELECT id, name, email, do_not_contact, gdpr_consent
     FROM fundraisely_supporters
     WHERE email = ? AND club_id = ?
     LIMIT 1`,
    [email, clubId]
  );

  if (existing) {
    if (existing.do_not_contact) {
      throw new Error('This email address has opted out of communications.');
    }
    return existing;
  }

  // Create new supporter record
  const id = uuidv4();
  await database.connection.execute(
    `INSERT INTO fundraisely_supporters
       (id, club_id, name, email, type, contact_source, referral_source,
        gdpr_consent, gdpr_consent_date, email_subscribed,
        newsletter_subscribed, sms_subscribed, lifecycle_stage, created_at)
     VALUES (?, ?, ?, ?, 'player', 'website', ?, 1, NOW(), 0, 0, 0, 'first_time', NOW())`,
    [id, clubId, name, email, challengeId ?? null]
  );

  // Create auth row
  await database.connection.execute(
    `INSERT INTO fundraisely_supporter_auth (supporter_id, club_id)
     VALUES (?, ?)`,
    [id, clubId]
  );

  return { id, name, email, gdpr_consent: 1 };
}

// ─── Generate and send magic link ─────────────────────────────────────────────

export async function sendMagicLink({ supporterId, clubId, email, name, challengeId }) {
  // Generate token
  const token     = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + MAGIC_LINK_TTL_MS)
    .toISOString().slice(0, 19).replace('T', ' ');

  console.log('[sendMagicLink] storing token for supporterId:', supporterId);

  // Store token
  await database.connection.execute(
    `UPDATE fundraisely_supporter_auth
     SET magic_link_token = ?, magic_link_expires_at = ?
     WHERE supporter_id = ?`,
    [token, expiresAt, supporterId]
  );

   console.log('[sendMagicLink] storing token for supporterId:', supporterId);

  // Build magic link URL
  const params = new URLSearchParams({ token });
  if (challengeId) params.set('challengeId', challengeId);
  const magicLink = `${APP_URL}/puzzle-auth?${params.toString()}`;

  // Get club name for email
  const [[club]] = await database.connection.execute(
    'SELECT name FROM fundraisely_clubs WHERE id = ? LIMIT 1',
    [clubId]
  );
  const clubName = club?.name ?? 'your club';

  // Send email
  const html = buildMagicLinkEmail({ name, magicLink, clubName });
  await sendEmailSafe({
    to:      email,
    subject: `🧩 Your puzzle access link — ${clubName}`,
    html,
  });

  return { ok: true };
}

// ─── Verify magic link token ──────────────────────────────────────────────────

export async function verifyMagicLink({ token }) {
     console.log('[verifyMagicLink] looking up token:', token);
  const [[authRow]] = await database.connection.execute(
    `SELECT
       sa.supporter_id, sa.club_id,
       sa.magic_link_token, sa.magic_link_expires_at,
       s.name, s.email
     FROM fundraisely_supporter_auth sa
     JOIN fundraisely_supporters s ON s.id = sa.supporter_id
     WHERE sa.magic_link_token = ?
     LIMIT 1`,
    [token]
  );
   console.log('[verifyMagicLink] authRow found:', authRow);

  if (!authRow) {
    throw new Error('Invalid or already used link.');
  }

  if (new Date(authRow.magic_link_expires_at) < new Date()) {
    throw new Error('This link has expired. Please request a new one.');
  }

  // Clear token — single use
  await database.connection.execute(
    `UPDATE fundraisely_supporter_auth
     SET magic_link_token = NULL, magic_link_expires_at = NULL, last_login_at = NOW()
     WHERE supporter_id = ?`,
    [authRow.supporter_id]
  );

  // Issue JWT
  const jwtPayload = {
    supporterId: authRow.supporter_id,
    clubId:      authRow.club_id,
    role:        'supporter',
  };
  const accessToken = jwt.sign(jwtPayload, JWT_SECRET, { expiresIn: JWT_TTL });

  return {
    accessToken,
    supporter: {
      id:    authRow.supporter_id,
      name:  authRow.name,
      email: authRow.email,
      clubId: authRow.club_id,
    },
  };
}


// ─── Email template ───────────────────────────────────────────────────────────

function buildMagicLinkEmail({ name, magicLink, clubName }) {
  return `
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
          <div style="font-size:40px;margin-bottom:8px;">🧩</div>
          <h1 style="color:#ffffff;margin:0;font-size:24px;font-weight:700;">Your puzzle link</h1>
          <p style="color:#c7d2fe;margin:8px 0 0;font-size:15px;">${clubName}</p>
        </div>

        <!-- Body -->
        <div style="padding:28px 24px;">
          <p style="color:#333;font-size:16px;margin-top:0;">
            Hi <strong>${name}</strong>,
          </p>
          <p style="color:#555;font-size:15px;line-height:1.6;">
            Click the button below to access your puzzles.
            This link expires in <strong>15 minutes</strong> and can only be used once.
          </p>

          <!-- CTA button -->
          <div style="text-align:center;margin:32px 0;">
            <a href="${magicLink}"
               style="display:inline-block;background:linear-gradient(135deg,#4f46e5,#7c3aed);color:#ffffff;text-decoration:none;padding:16px 36px;border-radius:8px;font-size:16px;font-weight:700;">
              Access My Puzzles →
            </a>
          </div>

          <p style="text-align:center;color:#888;font-size:12px;">
            Or paste this link into your browser:<br>
            <a href="${magicLink}" style="color:#4f46e5;word-break:break-all;">${magicLink}</a>
          </p>

          <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:12px 16px;margin:24px 0;">
            <p style="margin:0;color:#92400e;font-size:13px;">
              ⚠️ If you didn't request this link, you can safely ignore this email.
            </p>
          </div>
        </div>

        <!-- Footer -->
        <div style="background:#f9fafb;border-top:1px solid #f0f0f0;padding:16px 24px;text-align:center;">
          <p style="color:#aaa;font-size:12px;margin:0;">
            Powered by FundRaisely &bull; 🍀
          </p>
        </div>

      </div>
    </body>
    </html>
  `;
}