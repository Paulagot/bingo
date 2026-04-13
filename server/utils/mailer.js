// server/utils/mailer.js
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function verifyMailer() {
  if (!process.env.RESEND_API_KEY) {
    console.warn('📧 RESEND_API_KEY not set');
    return;
  }
  console.log('📧 Resend mailer ready');
}

export async function sendEmailSafe({ to, subject, html, text }) {
  const from = process.env.MAIL_FROM || 'support@fundraisely.co.uk';
  if (!process.env.RESEND_API_KEY) return { ok: false, error: 'RESEND_API_KEY not set' };
  try {
    const { data, error } = await resend.emails.send({
      from,
      to,
      subject,
      html,
      text: text || html.replace(/<[^>]+>/g, ''),
    });
    if (error) {
      console.error('📧 Resend error:', error);
      return { ok: false, error: error.message };
    }
    console.log('📧 Email sent:', data?.id);
    return { ok: true };
  } catch (e) {
    console.error('📧 sendEmailSafe error:', e?.message || e);
    return { ok: false, error: e?.message || 'send failed' };
  }
}

// Back-compat alias
export const sendEmail = sendEmailSafe;
