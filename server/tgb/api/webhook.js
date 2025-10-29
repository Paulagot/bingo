// server/tgb/api/webhook.js
import crypto from 'node:crypto';

/**
 * TGB webhooks are AES-256-CBC encrypted.
 * Expect base64-encoded env vars:
 *  - TGB_WEBHOOK_AES_KEY  (32 bytes after base64 decode)
 *  - TGB_WEBHOOK_AES_IV   (16 bytes after base64 decode)
 *
 * Request body should contain { encrypted: "<base64-ciphertext>" }
 * (Also accepts { payload: "<base64-ciphertext>" } or a raw string body.)
 */

function decryptAes256CbcBase64(cipherB64, key, iv) {
  const cipherBuf = Buffer.from(cipherB64, 'base64');
  const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
  const chunks = [decipher.update(cipherBuf), decipher.final()];
  return Buffer.concat(chunks).toString('utf8');
}

// Replace with your real DB logic
async function upsertDonationFromWebhook(event) {
  // Example mapping:
  // event.eventType: "deposit.detected" | "deposit.confirmed" | "deposit.converted"
  // event.depositAddress: correlate with the address you created for the room
  // event.metadata?.roomId: if you passed it when creating the address
  // event.txHash, event.status, etc.
  console.log('[TGB] Webhook event:', JSON.stringify(event, null, 2));
  await Promise.resolve();
}

export default async function tgbWebhookHandler(req, res) {
  try {
    const keyB64 = process.env.TGB_WEBHOOK_AES_KEY;
    const ivB64 = process.env.TGB_WEBHOOK_AES_IV;

    if (!keyB64 || !ivB64) {
      return res.status(500).json({ ok: false, error: 'Webhook AES key/iv not configured' });
    }

    const key = Buffer.from(keyB64, 'base64'); // 32 bytes
    const iv = Buffer.from(ivB64, 'base64');   // 16 bytes

    const cipherB64 =
      (req.body && req.body.encrypted) ||
      (req.body && req.body.payload) ||
      (typeof req.body === 'string' ? req.body : null);

    if (!cipherB64 || typeof cipherB64 !== 'string') {
      return res.status(400).json({ ok: false, error: 'Missing encrypted payload' });
    }

    const decrypted = decryptAes256CbcBase64(cipherB64, key, iv);

    let event;
    try {
      event = JSON.parse(decrypted);
    } catch {
      return res.status(400).json({ ok: false, error: 'Decrypted payload is not valid JSON' });
    }

    // Optional timestamp window check (if header provided)
    const tsHeader = req.header('X-TGB-Timestamp');
    if (tsHeader) {
      const now = Date.now();
      const ts = Date.parse(tsHeader);
      if (Number.isFinite(ts) && Math.abs(now - ts) > 5 * 60 * 1000) {
        console.warn('TGB webhook timestamp outside window:', tsHeader);
      }
    }

    // Optional signature verification if TGB provides one in headers
    // const sigHeader = req.header('X-TGB-Signature');
    // if (sigHeader) { /* verify HMAC over cipherB64 using your signing secret */ }

    await upsertDonationFromWebhook(event);
    return res.json({ ok: true });
  } catch (err) {
    console.error('tgbWebhookHandler error:', err);
    return res.status(500).json({ ok: false, error: err?.message ?? 'Server error' });
  }
}
