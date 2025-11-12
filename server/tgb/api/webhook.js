// server/tgb/api/webhook.js
import crypto from 'node:crypto';
import { loggers, logError } from '../../config/logging.js';
import { findIntentByAddress, findIntentById, saveIntent } from '../persistence.js';

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

    const key = Buffer.from(keyB64, 'hex'); // 32 bytes
    const iv = Buffer.from(ivB64, 'hex');   // 16 bytes

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

    webhookLogger.info({
      requestId: req.requestId,
      eventType: event.eventType,
      depositAddress: event.depositAddress,
      depositId: event.depositId ?? event.id,
      metadata: event.metadata ?? null
    }, 'TGB webhook decrypted and parsed');

    // Try to find persisted intent: by address, then by offchainIntentId or requestId
    let intent = null;
    if (event.depositAddress) {
      intent = findIntentByAddress(event.depositAddress);
    }
    if (!intent && event.metadata && event.metadata.offchainIntentId) {
      intent = findIntentById(event.metadata.offchainIntentId);
    }
    if (!intent && event.requestId) {
      intent = findIntentById(event.requestId);
    }
    if (!intent && (event.depositId || event.id)) {
      intent = findIntentById(event.depositId || event.id);
    }

    if (!intent) {
      webhookLogger.warn({
        requestId: req.requestId,
        depositAddress: event.depositAddress,
        metadata: event.metadata
      }, 'No matching intent found for TGB webhook — saving as orphaned event');

      // Save a minimal orphan record so ops can inspect
      const orphan = {
        depositAddress: event.depositAddress ?? null,
        depositTag: event.depositTag ?? null,
        offchainIntentId: event.metadata?.offchainIntentId ?? null,
        roomId: event.metadata?.roomId ?? null,
        expectedAmountDecimal: null,
        tgbDepositId: event.depositId ?? event.id ?? null,
        tgbRequestId: event.requestId ?? null,
        organizationId: event.organizationId ?? null,
        currency: event.currency ?? null,
        network: event.network ?? null,
        status: 'orphaned',
        tgbWebhookEvent: event,
      };
      try {
        saveIntent(orphan);
      } catch (e) {
        webhookLogger.error({ requestId: req.requestId, err: e }, 'Failed to persist orphaned intent');
      }
      return res.json({ ok: true }); // acknowledge
    }

    // Update the found intent with webhook information
    const updated = {
      ...intent,
      status: event.eventType ?? intent.status ?? 'updated',
      tgbWebhookEvent: event,
      tgbDepositId: event.depositId ?? event.id ?? intent.tgbDepositId,
      tgbRequestId: event.requestId ?? intent.tgbRequestId,
      txHash: event.txHash ?? intent.txHash ?? null,
      confirmedAt: new Date().toISOString(),
      actualAmountDecimal: event.amount ?? intent.actualAmountDecimal ?? null,
      currency: event.currency ?? intent.currency ?? null,
      network: event.network ?? intent.network ?? null
    };

    try {
      saveIntent(updated);
    } catch (e) {
      webhookLogger.error({ requestId: req.requestId, err: e, intentId: intent.offchainIntentId }, 'Failed to persist updated intent from webhook');
    }

    webhookLogger.info({
      requestId: req.requestId,
      offchainIntentId: intent.offchainIntentId,
      depositAddress: event.depositAddress,
      eventType: event.eventType
    }, 'TGB webhook processed and intent updated');

    return res.json({ ok: true });
  } catch (err) {
    logError(webhookLogger, err, {
      requestId: req.requestId,
      endpoint: 'tgb-webhook'
    });
    return res.status(500).json({ ok: false, error: err?.message ?? 'Server error' });
  }
}

