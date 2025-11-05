// server/utils/mailer.js
import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 465),
  secure: process.env.SMTP_SECURE === 'true',
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  pool: true, maxConnections: 2, maxMessages: 50,
});

export async function verifyMailer() {
  try { await transporter.verify(); console.log('📧 SMTP OK'); }
  catch (e) { console.warn('📧 SMTP verify failed (will try on send):', e.message); }
}

export async function sendEmailSafe({ to, subject, html, text }) {
  const from = process.env.MAIL_FROM;
  if (!from) return { ok: false, error: 'MAIL_FROM not set' };
  try {
    await transporter.sendMail({
      from, to, subject, html, text: text || html.replace(/<[^>]+>/g, '')
    });
    return { ok: true };
  } catch (e) {
    console.error('sendEmailSafe error:', e?.message || e);
    return { ok: false, error: e?.message || 'send failed' };
  }
}

// Back-compat alias
export const sendEmail = sendEmailSafe;


