// server/routes/contact.js
import { Router } from 'express';
import { contactLimiter } from '../middleware/rateLimit.js';
import { validate, contactSchema } from '../middleware/validate.js';
import { sendEmailSafe } from '../utils/mailer.js';
import dns from 'node:dns/promises';

const router = Router();
const MAIL_TO_CONTACT = process.env.MAIL_TO_CONTACT;

router.post('/', contactLimiter, validate(contactSchema), async (req, res) => {
  const { name, email, message } = req.body;

  const adminHtml = `
    <h2>Contact Form</h2>
    <p><strong>Name:</strong> ${escapeHtml(name)}</p>
    <p><strong>Email:</strong> ${escapeHtml(email)}</p>
    <p><strong>Message:</strong><br>${escapeHtml(message).replace(/\n/g, '<br>')}</p>
  `;

  // Always try to notify you (admin)
  const adminSend = await sendEmailSafe({
    to: MAIL_TO_CONTACT, subject: `New contact: ${name}`, html: adminHtml
  });

  // Ack to user: only if their domain seems deliverable (has MX)
  const domain = (email.split('@')[1] || '').trim();
  let hasMx = false;
  if (domain) {
    try { const mx = await dns.resolveMx(domain); hasMx = Array.isArray(mx) && mx.length > 0; }
    catch { hasMx = false; }
  }
  if (hasMx) {
    await sendEmailSafe({
      to: email,
      subject: 'We received your message',
      html: `<p>Hi ${escapeHtml(name)},</p><p>Thanks for reaching out — we’ll reply soon.</p>`
    });
  }

  // Never crash / never leak SMTP errors to the user
  res.json({ ok: true, delivered: adminSend.ok });
});

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[c]));
}

export default router;

