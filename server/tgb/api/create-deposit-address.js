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

// ---------- Network helpers ----------
function normalizeNetwork(n) {
  const s = String(n || '').toLowerCase().trim();

  // common aliases
  if (['eth', 'ethereum', 'mainnet'].includes(s)) return 'ethereum';
  if (s.startsWith('base')) return 'base';               // base, base-sepolia
  if (s.startsWith('polygon') || s === 'matic') return 'polygon';
  if (s.startsWith('arbitrum')) return 'arbitrum';
  if (s.startsWith('optimism') || s === 'op') return 'optimism';
  if (s === 'bsc' || s.includes('binance')) return 'bsc';
  if (s.includes('sol')) return 'solana';
  if (s.includes('stellar') || s === 'xlm') return 'stellar';
  if (s.includes('xrp') || s.includes('ripple')) return 'xrp';

  return s; // fallback
}

function isEvmLike(n) {
  const s = normalizeNetwork(n);
  return ['ethereum', 'base', 'polygon', 'arbitrum', 'optimism', 'bsc'].includes(s);
}

// ---------- Address validators (soft) ----------
const looksEvm = (s) => /^0x[a-fA-F0-9]{40}$/.test(s);
const looksSol = (s) => /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(s);   // base58-ish
const looksStellar = (s) => /^G[A-Z2-7]{55}$/.test(s);

// ---------- Mock address makers ----------
function mockEvmAddress() {
  // deterministic-ish but obviously fake
  return '0xb7ACd1159dBed96B955C4d856fc001De9be59844';
}
function mockSolAddress() {
  // Valid Solana PublicKey format - System Program address (valid base58, 32-44 chars)
  // This is a valid test address that can be used for mock purposes
  return '11111111111111111111111111111111';
}
function mockStellarAddress() {
  return 'GCF3Z7C6WJ6QX5M3Q7C7J2E6YJ5N4M2Q1P8R7T6U5S4R3Q2P1O';
}
function mockXrpAddress() {
  // xrp classic address (not x-address), just for format
  return 'rPT1Sjq2YGrBMTttX4GZHjKu9dyfzbpAYe';
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
      currency,     // e.g. "USDC" | "SOL" | "XLM"
      network,      // e.g. "solana" | "ethereum" | "base" | "polygon" | "stellar"
      amount,       // decimal string, e.g. "25.00"
      donor,        // { email?, name? } optional
      metadata      // optional
      // mock?: true
    } = req.body || {};

    assertString('organizationId', organizationId);
    assertString('currency', currency);
    assertString('network', network);
    assertString('amount', amount);

    const netNorm = normalizeNetwork(network);

    // ---------- MOCK SHORT-CIRCUIT ----------
    if (isMockEnabled(req)) {
      tgbLogger.warn({
        requestId: req.requestId,
        organizationId,
        currency,
        network,
        netNorm,
        amount,
        mockMode: true
      }, 'TGB API call running in MOCK MODE');

      let depositAddress = '';
      let depositTag = null;

      if (isEvmLike(netNorm)) {
        depositAddress = mockEvmAddress();
      } else if (netNorm === 'solana') {
        depositAddress = mockSolAddress();
      } else if (netNorm === 'stellar') {
        depositAddress = mockStellarAddress();
      } else if (netNorm === 'xrp') {
        depositAddress = mockXrpAddress();
        depositTag = '123456'; // example for tag-based chains
      } else {
        // default to EVM style if unknown
        depositAddress = mockEvmAddress();
      }

      const mock = {
        ok: true,
        depositAddress,
        depositTag,
        id: 'tgb-mock-deposit-id',
        requestId: 'tgb-mock-req-1',
        _debug: { organizationId, currency, network, netNorm, amount, donor, metadata, source: 'mock' }
      };
      return res.json(mock);
    }
    // ---------- END MOCK SHORT-CIRCUIT ----------

    // REAL CALL
    const token = await getAccessToken();
    const url = `${tgbBaseUrl()}/v1/deposit-address`;

    const payload = { organizationId, currency, network: netNorm, amount };
    if (donor) payload.donor = donor;
    if (metadata) payload.metadata = metadata;

    const startTime = Date.now();
    tgbLogger.info({
      requestId: req.requestId,
      method: 'POST',
      url,
      payload: { ...payload, hasDonor: !!donor }
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
      depositTag: data?.depositTag ?? null,
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

    // Soft-validate returned address shape vs requested network & log if odd
    const addr = out.depositAddress;
    let valid = true, expect = 'any';
    if (isEvmLike(netNorm)) {
      valid = looksEvm(addr); expect = 'EVM 0x…';
    } else if (netNorm === 'solana') {
      valid = looksSol(addr); expect = 'Solana base58';
    } else if (netNorm === 'stellar') {
      valid = looksStellar(addr); expect = 'Stellar G…';
    }
    if (!valid) {
      tgbLogger.warn({
        requestId: req.requestId,
        networkRequested: netNorm,
        depositAddress: addr,
        expectedShape: expect
      }, 'TGB address shape mismatch with requested network');
    }

    tgbLogger.info({
      requestId: req.requestId,
      depositAddress: out.depositAddress,
      depositId: out.id,
      network: netNorm
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



