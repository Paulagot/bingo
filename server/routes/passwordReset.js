// server/routes/passwordReset.js
import { Router } from 'express';
import crypto from 'crypto';
import bcrypt from 'bcrypt';
import { connection as db, TABLE_PREFIX } from '../config/database.js';
import { authLimiter } from '../middleware/rateLimit.js';
import { validate, resetRequestSchema, resetConfirmSchema } from '../middleware/validate.js';
import { sendEmailSafe as sendEmail } from '../utils/mailer.js';

const router = Router();

const APP_ORIGIN = process.env.APP_ORIGIN;
const TTL_MIN = Number(process.env.RESET_TOKEN_TTL_MINUTES || 60);

// Tables / columns
const CLUBS_TABLE = `${TABLE_PREFIX}clubs`;                       // fundraisely_clubs
const TOKENS_TABLE = `${TABLE_PREFIX}password_reset_tokens`;     // fundraisely_password_reset_tokens

// Where to actually write the new password hash:
const AUTH_TABLE = process.env.AUTH_TABLE || CLUBS_TABLE;         // points to fundraisely_clubs
const AUTH_USER_ID_COLUMN = process.env.AUTH_USER_ID_COLUMN || 'id';
const AUTH_PASSWORD_COLUMN = process.env.AUTH_PASSWORD_COLUMN || 'password_hash';

// ---- Step 1: request reset link (by club email) ----
router.post('/request', authLimiter, validate(resetRequestSchema), async (req, res) => {
  const { email } = req.body;
  console.log('🔐 Password reset request for:', email);

  // Find club by email
  const [rows] = await db.execute(
    `SELECT id, name, email FROM ${CLUBS_TABLE} WHERE email = ? LIMIT 1`,
    [email]
  );
  const club = Array.isArray(rows) && rows[0];

  if (!club) {
    console.log('🔐 No club found for email (still returning ok):', email);
    return res.json({ ok: true });
  }

  console.log('🔐 Found club for reset:', { id: club.id, name: club.name, email: club.email });

  // Invalidate previous tokens for this club id
  await db.execute(
    `UPDATE ${TOKENS_TABLE} SET used = 1 WHERE user_id = ?`,
    [club.id]
  );

  // Create raw token + store bcrypt hash
  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = await bcrypt.hash(rawToken, 12);
  const expiresAt = new Date(Date.now() + TTL_MIN * 60 * 1000);

  await db.execute(
    `INSERT INTO ${TOKENS_TABLE} (user_id, token_hash, expires_at) VALUES (?,?,?)`,
    [club.id, tokenHash, expiresAt]
  );

  const link = `${APP_ORIGIN}/reset-password?token=${encodeURIComponent(rawToken)}`;
  console.log('🔐 Reset link generated for club', club.id, '->', link);

  // Send email (safe; won’t crash)
  const mailResult = await sendEmail({
    to: email,
    subject: 'Reset your FundRaisely password',
    html: `
      <p>Hi${club.name ? ' ' + escapeHtml(club.name) : ''},</p>
      <p>Click the button below to reset your password. This link expires in ${TTL_MIN} minutes.</p>
      <p><a href="${link}" style="display:inline-block;padding:10px 16px;border-radius:8px;background:#4f46e5;color:#fff;text-decoration:none;">Reset password</a></p>
      <p>Or paste this link into your browser:<br>${link}</p>
    `,
  });

  console.log('📧 Reset email send result for', email, ':', mailResult);

  // Still don’t leak whether the email is real / delivery result
  res.json({ ok: true });
});


// ---- Step 2: confirm new password ----
router.post('/confirm', authLimiter, validate(resetConfirmSchema), async (req, res) => {
  const { token, password } = req.body;

  // Fetch non-used, non-expired tokens (most recent first)
  const [rows] = await db.execute(
    `SELECT id, user_id, token_hash, expires_at FROM ${TOKENS_TABLE}
     WHERE used = 0 AND expires_at > NOW()
     ORDER BY id DESC`
  );

  let match = null;
  for (const t of rows) {
    if (await bcrypt.compare(token, t.token_hash)) {
      match = t;
      break;
    }
  }

  if (!match) return res.status(400).json({ error: 'Invalid or expired token' });

  // Hash the new password
  const newHash = await bcrypt.hash(password, 12);

  // Update password in the AUTH_TABLE (fundraisely_clubs)
  await db.execute(
    `UPDATE ${AUTH_TABLE} SET ${AUTH_PASSWORD_COLUMN} = ? WHERE ${AUTH_USER_ID_COLUMN} = ?`,
    [newHash, match.user_id]
  );

  // Mark token used
  await db.execute(
    `UPDATE ${TOKENS_TABLE} SET used = 1 WHERE id = ?`,
    [match.id]
  );

  res.json({ ok: true });
});

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[c]));
}

export default router;

