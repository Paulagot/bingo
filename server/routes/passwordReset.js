// server/routes/passwordReset.js
import { Router } from 'express';
import crypto from 'crypto';
import bcrypt from 'bcrypt';
import { connection as db, TABLE_PREFIX } from '../config/database.js';
import { authLimiter } from '../middleware/rateLimit.js';
import { validate, resetRequestSchema, resetConfirmSchema } from '../middleware/validate.js';
import { sendEmailSafe as sendEmail } from '../utils/mailer.js';

const router = Router();

const APP_ORIGIN = process.env.APP_ORIGIN || process.env.BASE_URL || 'https://fundraisely.ie';
const TTL_MIN = Number(process.env.RESET_TOKEN_TTL_MINUTES || 60);

const TOKENS_TABLE = `${TABLE_PREFIX}password_reset_tokens`;

// Auth source of truth.
// These MUST match the table used by your login route.
const AUTH_TABLE = process.env.AUTH_TABLE || `${TABLE_PREFIX}users`;
const AUTH_USER_ID_COLUMN = process.env.AUTH_USER_ID_COLUMN || 'id';
const AUTH_PASSWORD_COLUMN = process.env.AUTH_PASSWORD_COLUMN || 'password_hash';
const AUTH_EMAIL_COLUMN = process.env.AUTH_EMAIL_COLUMN || 'email';
const AUTH_NAME_COLUMN = process.env.AUTH_NAME_COLUMN || 'name';

function assertSafeIdentifier(value, label) {
  if (!/^[a-zA-Z0-9_]+$/.test(value)) {
    throw new Error(`Unsafe ${label}: ${value}`);
  }
  return value;
}

function safeTableName(value, label) {
  if (!/^[a-zA-Z0-9_]+$/.test(value)) {
    throw new Error(`Unsafe ${label}: ${value}`);
  }
  return value;
}

const SAFE_AUTH_TABLE = safeTableName(AUTH_TABLE, 'AUTH_TABLE');
const SAFE_TOKENS_TABLE = safeTableName(TOKENS_TABLE, 'TOKENS_TABLE');
const SAFE_AUTH_USER_ID_COLUMN = assertSafeIdentifier(AUTH_USER_ID_COLUMN, 'AUTH_USER_ID_COLUMN');
const SAFE_AUTH_PASSWORD_COLUMN = assertSafeIdentifier(AUTH_PASSWORD_COLUMN, 'AUTH_PASSWORD_COLUMN');
const SAFE_AUTH_EMAIL_COLUMN = assertSafeIdentifier(AUTH_EMAIL_COLUMN, 'AUTH_EMAIL_COLUMN');
const SAFE_AUTH_NAME_COLUMN = assertSafeIdentifier(AUTH_NAME_COLUMN, 'AUTH_NAME_COLUMN');

console.log('🔐 Password reset config:', {
  authTable: SAFE_AUTH_TABLE,
  authUserIdColumn: SAFE_AUTH_USER_ID_COLUMN,
  authPasswordColumn: SAFE_AUTH_PASSWORD_COLUMN,
  authEmailColumn: SAFE_AUTH_EMAIL_COLUMN,
  authNameColumn: SAFE_AUTH_NAME_COLUMN,
  tokensTable: SAFE_TOKENS_TABLE,
  appOrigin: APP_ORIGIN,
  ttlMinutes: TTL_MIN,
});

// ---- Step 1: request reset link by auth user email ----
router.post('/request', authLimiter, validate(resetRequestSchema), async (req, res) => {
  const { email } = req.body;
  const normalisedEmail = String(email || '').trim().toLowerCase();

  console.log('🔐 Password reset request for:', normalisedEmail);

  try {
    const [rows] = await db.execute(
      `SELECT 
         ${SAFE_AUTH_USER_ID_COLUMN} AS id,
         ${SAFE_AUTH_EMAIL_COLUMN} AS email,
         ${SAFE_AUTH_NAME_COLUMN} AS name
       FROM ${SAFE_AUTH_TABLE}
       WHERE LOWER(${SAFE_AUTH_EMAIL_COLUMN}) = ?
       LIMIT 1`,
      [normalisedEmail]
    );

    const user = Array.isArray(rows) && rows[0];

    // Always return ok so people cannot check which emails exist.
    if (!user) {
      console.log('🔐 No auth user found for email, returning ok:', normalisedEmail);
      return res.json({ ok: true });
    }

    console.log('🔐 Found auth user for reset:', {
      id: user.id,
      email: user.email,
      name: user.name,
    });

    await db.execute(
      `UPDATE ${SAFE_TOKENS_TABLE}
       SET used = 1
       WHERE user_id = ?`,
      [user.id]
    );

    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = await bcrypt.hash(rawToken, 12);

    await db.execute(
      `INSERT INTO ${SAFE_TOKENS_TABLE} (user_id, token_hash, expires_at, used)
       VALUES (?, ?, DATE_ADD(UTC_TIMESTAMP(), INTERVAL ? MINUTE), 0)`,
      [user.id, tokenHash, TTL_MIN]
    );

    const link = `${APP_ORIGIN}/reset-password?token=${encodeURIComponent(rawToken)}`;

    console.log('🔐 Reset link generated for auth user', user.id, '->', link);

    const mailResult = await sendEmail({
      to: user.email,
      subject: 'Reset your FundRaisely password',
      html: `
        <p>Hi${user.name ? ' ' + escapeHtml(user.name) : ''},</p>
        <p>Click the button below to reset your password. This link expires in ${TTL_MIN} minutes.</p>
        <p>
          <a href="${link}" style="display:inline-block;padding:10px 16px;border-radius:8px;background:#4f46e5;color:#fff;text-decoration:none;">
            Reset password
          </a>
        </p>
        <p>Or paste this link into your browser:<br>${escapeHtml(link)}</p>
      `,
    });

    console.log('📧 Reset email send result for', user.email, ':', mailResult);

    return res.json({ ok: true });
  } catch (error) {
    console.error('🔐 Password reset request error:', error);
    return res.json({ ok: true });
  }
});

// ---- Step 2: confirm new password ----
router.post('/confirm', authLimiter, validate(resetConfirmSchema), async (req, res) => {
  const { token, password } = req.body;

  console.log('🔐 Password reset confirm started');

  try {
    const [rows] = await db.execute(
      `SELECT id, user_id, token_hash
       FROM ${SAFE_TOKENS_TABLE}
       WHERE used = 0
         AND expires_at > UTC_TIMESTAMP()
       ORDER BY id DESC`
    );

    let match = null;

    for (const t of rows) {
      const isMatch = await bcrypt.compare(token, t.token_hash);
      if (isMatch) {
        match = t;
        break;
      }
    }

    if (!match) {
      console.log('🔐 Invalid or expired reset token');
      return res.status(400).json({ error: 'Invalid or expired token' });
    }

    const newHash = await bcrypt.hash(password, 12);

 const [updateResult] = await db.execute(
  `UPDATE ${SAFE_AUTH_TABLE}
   SET ${SAFE_AUTH_PASSWORD_COLUMN} = ?,
       password_updated_at = UTC_TIMESTAMP()
   WHERE ${SAFE_AUTH_USER_ID_COLUMN} = ?`,
  [newHash, match.user_id]
);

    console.log('🔐 Password hash update result:', {
      table: SAFE_AUTH_TABLE,
      userIdColumn: SAFE_AUTH_USER_ID_COLUMN,
      passwordColumn: SAFE_AUTH_PASSWORD_COLUMN,
      userId: match.user_id,
      affectedRows: updateResult?.affectedRows,
      changedRows: updateResult?.changedRows,
    });

    if (!updateResult?.affectedRows) {
      console.error('🔐 Password reset failed: update affected 0 rows');
      return res.status(500).json({ error: 'Password reset failed' });
    }

    await db.execute(
      `UPDATE ${SAFE_TOKENS_TABLE}
       SET used = 1
       WHERE id = ?`,
      [match.id]
    );

    console.log('🔐 Password reset complete for auth user:', match.user_id);

    return res.json({ ok: true });
  } catch (error) {
    console.error('🔐 Password reset confirm error:', error);
    return res.status(500).json({ error: 'Password reset failed' });
  }
});

function escapeHtml(s) {
  return String(s || '').replace(/[&<>"']/g, c => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[c]));
}

export default router;

