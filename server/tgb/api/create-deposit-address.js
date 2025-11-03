// server/api/tgb/create-deposit-address.js
import { getAccessToken, tgbBaseUrl } from '../auth.js';
import { loggers, logExternalApi, logError } from '../../config/logging.js';
const tgbLogger = loggers.tgb;

function assertString(name, val) {
  if (typeof val !== 'string' || !val.trim()) {
    throw new Error(`Missing or invalid "${name}"`);
  }
}

function tryParse(s) {
  try { return JSON.parse(s); } catch { return s; }
}

// Small helper: check multiple ways to enable mock mode
function isMockEnabled(req) {
  if (process.env.TGB_FORCE_MOCK === 'true') return true;
  if (req?.query?.mock === '1' || req?.query?.mock === 'true') return true;
  if (req?.body?.mock === true) return true;
  return false;
}

export default async function createDepositAddress(req, res) {
  try {
    const {
      organizationId,
      currency,     // e.g. "USDC" | "SOL"
      network,      // e.g. "solana" | "ethereum" | "base" | "polygon"
      amount,       // decimal string, e.g. "25.00"
      donor,        // { email?, name? } optional
      metadata      // optional
      // mock?: true  // optional flag if you want to drive mock per-request
    } = req.body || {};

    assertString('organizationId', organizationId);
    assertString('currency', currency);
    assertString('network', network);
    assertString('amount', amount);

    // ---------- MOCK SHORT-CIRCUIT (safe for testing) ----------
    // If mock mode is enabled, we skip all external calls and return a stable shape.
    if (isMockEnabled(req)) {
      tgbLogger.warn({
        requestId: req.requestId,
        organizationId,
        currency,
        network,
        amount,
        mockMode: true
      }, 'TGB API call running in MOCK MODE');

      // Feel free to tweak the address format to match your EVM/Solana testing needs
      // Example returns an EVM-like address; uncomment the Solana example if you prefer.
      const mock = {
        ok: true,
        // EVM-looking test address:
        depositAddress: '0xb7ACd1159dBed96B955C4d856fc001De9be59844',
        // Or Solana-looking test address for SPL testing:
        depositAddress: '7q1Z6dQexV9HcZ7q1Z6dQexV9HcZ7q1Z6dQexV9HcZ7',
        depositTag: null,
        id: 'tgb-mock-deposit-id',
        requestId: 'tgb-mock-req-1',
        // qrCodeImageBase64: '<optional base64 png>',
        // Echo back a bit of context for your logs/UI while testing:
        _debug: { organizationId, currency, network, amount, donor, metadata, source: 'mock' }
      };
      return res.json(mock);
    }
    // ---------- END MOCK SHORT-CIRCUIT ----------

    // REAL CALL (kept intact but only runs when mock is off)
    const token = await getAccessToken();
    const url = `${tgbBaseUrl()}/v1/deposit-address`; // endpoint name per mapping

    const payload = { organizationId, currency, network, amount };
    if (donor) payload.donor = donor;
    if (metadata) payload.metadata = metadata;

    // NOTE: If you want to avoid *any* network traffic while testing, you can
    // comment out the fetch block below. Keeping it here but behind the mock flag
    // means you won't need to toggle code later—just switch env/param.

    const startTime = Date.now();
    tgbLogger.info({
      requestId: req.requestId,
      method: 'POST',
      url,
      payload: { organizationId, currency, network, amount, hasDonor: !!donor }
    }, 'TGB API request: create deposit address');

    const tgbRes = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: token.startsWith('Bearer ') ? token : `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const duration = Date.now() - startTime;
    const text = await tgbRes.text();

    if (!tgbRes.ok) {
      logExternalApi(tgbLogger, {
        method: 'POST',
        url,
        duration,
        statusCode: tgbRes.status,
        requestId: req.requestId,
        error: { message: 'TGB API failed', code: tgbRes.status }
      });

      return res.status(tgbRes.status).json({
        ok: false,
        error: 'TGB create deposit address failed',
        status: tgbRes.status,
        details: tryParse(text)
      });
    }

    const data = tryParse(text);

    logExternalApi(tgbLogger, {
      method: 'POST',
      url,
      duration,
      statusCode: tgbRes.status,
      requestId: req.requestId
    });

    const out = {
      ok: true,
      depositAddress: data?.depositAddress ?? data?.address ?? '',
      depositTag: data?.depositTag ?? null,          // only for tag-based chains (e.g. XRP)
      id: data?.id ?? data?.depositId ?? undefined,
      requestId: data?.requestId ?? undefined,
      qrCodeImageBase64: data?.qrCodeBase64 ?? undefined
    };

    if (!out.depositAddress) {
      tgbLogger.error({
        requestId: req.requestId,
        error: 'No depositAddress in TGB response',
        tgbResponse: data
      }, 'TGB API returned invalid response');

      return res.status(502).json({
        ok: false,
        error: 'No depositAddress returned by TGB.',
        details: data
      });
    }

    tgbLogger.info({
      requestId: req.requestId,
      depositAddress: out.depositAddress,
      depositId: out.id
    }, 'TGB deposit address created successfully');

    return res.json(out);
  } catch (err) {
    logError(tgbLogger, err, {
      requestId: req.requestId,
      endpoint: 'create-deposit-address',
      organizationId: req.body?.organizationId
    });
    return res.status(500).json({ ok: false, error: err?.message ?? 'Server error' });
  }
}


