// server/api/tgb/webhook.js
import crypto from 'node:crypto';
import { loggers, logError } from '../../config/logging.js';
const webhookLogger = loggers.webhook;

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
async function upsertDonationFromWebhook(event, requestId) {
  // Example mapping:
  // event.eventType: "deposit.detected" | "deposit.confirmed" | "deposit.converted"
  // event.depositAddress: correlate with the address you created for the room
  // event.metadata?.roomId: if you passed it when creating the address
  // event.txHash, event.status, etc.

  webhookLogger.info({
    requestId,
    eventType: event.eventType,
    depositAddress: event.depositAddress,
    txHash: event.txHash,
    status: event.status,
    roomId: event.metadata?.roomId,
    amount: event.amount,
    currency: event.currency
  }, `TGB webhook event: ${event.eventType}`);

  await Promise.resolve();
}

export default async function tgbWebhookHandler(req, res) {
  try {
    webhookLogger.info({
      requestId: req.requestId,
      headers: {
        timestamp: req.header('X-TGB-Timestamp'),
        hasSignature: !!req.header('X-TGB-Signature')
      }
    }, 'TGB webhook received');

    const keyB64 = process.env.TGB_WEBHOOK_AES_KEY;
    const ivB64 = process.env.TGB_WEBHOOK_AES_IV;

    if (!keyB64 || !ivB64) {
      webhookLogger.error({ requestId: req.requestId }, 'Webhook AES key/iv not configured');
      return res.status(500).json({ ok: false, error: 'Webhook AES key/iv not configured' });
      }

    const key = Buffer.from(keyB64, 'base64'); // 32 bytes
    const iv = Buffer.from(ivB64, 'base64');   // 16 bytes

    const cipherB64 =
      (req.body && req.body.encrypted) ||
      (req.body && req.body.payload) ||
      (typeof req.body === 'string' ? req.body : null);

    if (!cipherB64 || typeof cipherB64 !== 'string') {
      webhookLogger.warn({ requestId: req.requestId }, 'Missing encrypted payload in webhook');
      return res.status(400).json({ ok: false, error: 'Missing encrypted payload' });
    }

    let decrypted;
    try {
      decrypted = decryptAes256CbcBase64(cipherB64, key, iv);
    } catch (decryptErr) {
      webhookLogger.error({
        requestId: req.requestId,
        error: {
          message: decryptErr.message,
          stack: decryptErr.stack
        }
      }, 'Failed to decrypt webhook payload');
      return res.status(400).json({ ok: false, error: 'Decryption failed' });
    }

    let event;
    try {
      event = JSON.parse(decrypted);
    } catch (parseErr) {
      webhookLogger.error({
        requestId: req.requestId,
        decryptedLength: decrypted?.length
      }, 'Decrypted payload is not valid JSON');
      return res.status(400).json({ ok: false, error: 'Decrypted payload is not valid JSON' });
    }

    // Optional timestamp window check (if header provided)
    const tsHeader = req.header('X-TGB-Timestamp');
    if (tsHeader) {
      const now = Date.now();
      const ts = Date.parse(tsHeader);
      if (Number.isFinite(ts) && Math.abs(now - ts) > 5 * 60 * 1000) {
        webhookLogger.warn({
          requestId: req.requestId,
          timestamp: tsHeader,
          diff: Math.abs(now - ts)
        }, 'TGB webhook timestamp outside 5-minute window');
      }
    }

    // Optional signature verification if TGB provides one in headers
    // const sigHeader = req.header('X-TGB-Signature');
    // if (sigHeader) { /* verify HMAC over cipherB64 using your signing secret */ }

    await upsertDonationFromWebhook(event, req.requestId);

    webhookLogger.info({
      requestId: req.requestId,
      eventType: event.eventType
    }, 'TGB webhook processed successfully');

    return res.json({ ok: true });
  } catch (err) {
    logError(webhookLogger, err, {
      requestId: req.requestId,
      endpoint: 'tgb-webhook'
    });
    return res.status(500).json({ ok: false, error: err?.message ?? 'Server error' });
  }
}
