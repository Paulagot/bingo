// server/tgb/api/create-deposit-address.js

import { getAccessToken, tgbBaseUrl } from '../auth.js';
import { loggers, logExternalApi, logError } from '../../config/logging.js';
import { saveIntent } from '../persistence.js';
import crypto from 'node:crypto';

const tgbLogger = loggers.tgb;

function assertString(name, val) {
  if (typeof val !== 'string' || !val.trim()) {
    throw new Error(`Missing or invalid "${name}"`);
  }
}

function assertIntegerOrString(name, val) {
  if (typeof val === 'number' && Number.isInteger(val)) return;
  if (typeof val === 'string' && val.trim()) return;
  throw new Error(`Missing or invalid "${name}"`);
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
  return '0xb7ACd1159dBed96B955C4d856fc001De9be59844';
}
function mockSolAddress() {
  return '7koYv1dqqHWh4PQ5bVh8CyLBTxqAHeARPiuazzF2FhCY';
}
function mockStellarAddress() {
  return 'GCF3Z7C6WJ6QX5M3Q7C7J2E6YJ5N4M2Q1P8R7T6U5S4R3Q2P1O';
}
function mockXrpAddress() {
  return 'rPT1Sjq2YGrBMTttX4GZHjKu9dyfzbpAYe';
}

function isMockEnabled(req) {
  if (process.env.TGB_FORCE_MOCK === 'true') return true;
  if (req?.query?.mock === '1' || req?.query?.mock === 'true') return true;
  if (req?.body?.mock === true) return true;
  return false;
}

export default async function createDepositAddress(req, res) {
  try {
    console.log('🔵 [TGB] ========== CREATE DEPOSIT ADDRESS START ==========');
    console.log('🔵 [TGB] env.TGB_FORCE_MOCK:', process.env.TGB_FORCE_MOCK);
    console.log('🔵 [TGB] Raw request body:', JSON.stringify(req.body, null, 2));

    const {
      organizationId,
      currency,      // maps to pledgeCurrency for TGB
      network,       // your internal reference (base, solana, etc.)
      pledgeAmount,  // preferred, but...
      amount,        // ...we also accept `amount` for backward compatibility
      isAnonymous = true,
      metadata
    } = req.body || {};

    // Normalise amount field so FE can send either `pledgeAmount` or `amount`
    const effectiveAmount = pledgeAmount ?? amount;

    console.log('🔵 [TGB] Destructured values:');
    console.log('  - organizationId:', organizationId, typeof organizationId);
    console.log('  - currency (maps to pledgeCurrency):', currency, typeof currency);
    console.log('  - network (frontend):', network, typeof network);
    console.log('  - pledgeAmount:', pledgeAmount, typeof pledgeAmount);
    console.log('  - amount:', amount, typeof amount);
    console.log('  - effectiveAmount:', effectiveAmount, typeof effectiveAmount);
    console.log('  - isAnonymous:', isAnonymous, typeof isAnonymous);
    console.log('  - metadata:', metadata);

    // --- Basic validation of what we EXPECT from frontend (anonymous-only) ---
    assertIntegerOrString('organizationId', organizationId);
    assertString('currency', currency);
    assertString('pledgeAmount', String(effectiveAmount));

    console.log('✅ [TGB] Basic assertions passed (anonymous flow)');

    const netNorm = normalizeNetwork(network);
    console.log('🔵 [TGB] Normalized network:', network, '->', netNorm);

    const offchainIntentId = `FR-${metadata?.roomId ?? 'nometa'}-${Date.now()}-${crypto.randomUUID()}`;
    console.log('🔵 [TGB] Generated offchainIntentId:', offchainIntentId);

    const metadataWithIntent = {
      ...(metadata || {}),
      offchainIntentId
    };
    console.log('🔵 [TGB] Metadata with intent:', JSON.stringify(metadataWithIntent, null, 2));

    const mockEnabled = isMockEnabled(req);
    console.log('🔵 [TGB] isMockEnabled(req):', mockEnabled);

    // ---------- MOCK SHORT-CIRCUIT ----------
    if (mockEnabled) {
      console.log('⚠️  [TGB] MOCK MODE ENABLED');
      tgbLogger.warn(
        {
          requestId: req.requestId,
          organizationId,
          currency,
          network,
          netNorm,
          pledgeAmount: effectiveAmount,
          isAnonymous,
          mockMode: true
        },
        'TGB API call running in MOCK MODE'
      );

      let depositAddress = '';
      let depositTag = null;

      if (isEvmLike(netNorm)) depositAddress = mockEvmAddress();
      else if (netNorm === 'solana') depositAddress = mockSolAddress();
      else if (netNorm === 'stellar') depositAddress = mockStellarAddress();
      else if (netNorm === 'xrp') { depositAddress = mockXrpAddress(); depositTag = '123456'; }
      else depositAddress = mockEvmAddress();

      const mock = {
        ok: true,
        depositAddress,
        depositTag,
        id: 'tgb-mock-deposit-id',
        requestId: 'tgb-mock-req-1',
        offchainIntentId,
        expectedAmountDecimal: String(effectiveAmount),
        _debug: {
          organizationId,
          currency,
          network,
          netNorm,
          pledgeAmount: effectiveAmount,
          isAnonymous,
          metadata: metadataWithIntent,
          source: 'mock'
        }
      };

      console.log('✅ [TGB] Mock response:', JSON.stringify(mock, null, 2));

      try {
        saveIntent({
          depositAddress,
          depositTag: depositTag ?? null,
          offchainIntentId,
          roomId: metadata?.roomId ?? null,
          expectedAmountDecimal: String(effectiveAmount),
          tgbDepositId: mock.id,
          tgbRequestId: mock.requestId,
          organizationId,
          currency,
          network: netNorm,
          metadata: metadataWithIntent ?? null,
          status: 'mocked',
          createdAt: new Date().toISOString()
        });
        console.log('✅ [TGB] Mock intent saved to persistence');
      } catch (e) {
        console.error('❌ [TGB] Failed to persist mocked TGB intent:', e);
        tgbLogger.error({ requestId: req.requestId, err: e }, 'Failed to persist mocked TGB intent');
      }

      console.log('🔵 [TGB] ========== CREATE DEPOSIT ADDRESS END (MOCK) ==========');
      return res.json(mock);
    }
    // ---------- END MOCK SHORT-CIRCUIT ----------

    // REAL CALL
    console.log('🚀 [TGB] Starting REAL API call to The Giving Block');

    const token = await getAccessToken();
    if (!token || String(token).trim() === '') {
      console.error('[TGB] getAccessToken returned empty token');
      console.log('🔵 [TGB] ========== CREATE DEPOSIT ADDRESS END (NO TOKEN) ==========');
      return res.status(500).json({ ok: false, error: 'Missing access token for TGB' });
    }
    console.log('🔵 [TGB] Access token retrieved (preview):', String(token).slice(0, 12) + '...');

    const url = `${tgbBaseUrl()}/v1/deposit-address`;
    console.log('🔵 [TGB] API URL:', url);

    // Build payload for TGB API according to their spec (anonymous-only)
    const payload = {
      organizationId,
      pledgeCurrency: currency,
      pledgeAmount: String(effectiveAmount),
      isAnonymous: true
    };

    console.log('🔵 [TGB] Payload to send to TGB API:', JSON.stringify(payload, null, 2));

    const startTime = Date.now();
    tgbLogger.info(
      {
        requestId: req.requestId,
        method: 'POST',
        url,
        payload: {
          organizationId,
          pledgeCurrency: currency,
          pledgeAmount: String(effectiveAmount),
          isAnonymous: true
        }
      },
      'TGB API request: create deposit address'
    );

    console.log('📤 [TGB] Sending POST request to TGB...');
    const tgbRes = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: token.startsWith('Bearer ') ? token : `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const duration = Date.now() - startTime;
    console.log(`📥 [TGB] Response received in ${duration}ms, status: ${tgbRes.status}`);

    const text = await tgbRes.text();
    console.log('🔵 [TGB] Raw response text:', text);

    if (!tgbRes.ok) {
      console.error('❌ [TGB] API call failed with status:', tgbRes.status);
      console.error('❌ [TGB] Error response:', text);

      logExternalApi(tgbLogger, {
        method: 'POST',
        url,
        duration,
        statusCode: tgbRes.status,
        requestId: req.requestId,
        error: { message: 'TGB API failed', code: tgbRes.status }
      });

      tgbLogger.error(
        { requestId: req.requestId, endpoint: 'create-deposit-address', status: tgbRes.status, body: tryParse(text) },
        'TGB create deposit-address returned non-OK'
      );

      console.log('🔵 [TGB] ========== CREATE DEPOSIT ADDRESS END (ERROR) ==========');
      return res
        .status(tgbRes.status)
        .json({ ok: false, error: 'TGB create deposit address failed', status: tgbRes.status, details: tryParse(text) });
    }

    const data = tryParse(text);
    console.log('✅ [TGB] Parsed response data:', JSON.stringify(data, null, 2));

    // helper to safely access nested values if response is wrapped in { data: { ... } }
    const top = (data && typeof data === 'object') ? data : {};
    const nested = (top.data && typeof top.data === 'object') ? top.data : {};

    // prefer top-level keys, then nested.keys
    const depositAddressVal = top.depositAddress ?? nested.depositAddress ?? top.address ?? nested.address ?? '';
    const depositTagVal     = top.depositTag ?? nested.depositTag ?? null;
    const idVal             = top.id ?? nested.id ?? top.depositId ?? nested.depositId ?? undefined;
    const requestIdVal      = top.requestId ?? nested.requestId ?? undefined;
    const qrCodeVal         = top.qrCodeBase64 ?? top.qrCode ?? nested.qrCodeBase64 ?? nested.qrCode ?? undefined;

    logExternalApi(tgbLogger, {
      method: 'POST',
      url,
      duration,
      statusCode: tgbRes.status,
      requestId: req.requestId
    });

    const out = {
      ok: true,
      depositAddress: depositAddressVal,
      depositTag: depositTagVal,
      id: idVal,
      requestId: requestIdVal,
      qrCodeImageBase64: qrCodeVal
    };

    console.log('🔵 [TGB] Mapped output object:', JSON.stringify(out, null, 2));

    if (!out.depositAddress) {
      console.error('❌ [TGB] No deposit address in response!');
      tgbLogger.error(
        { requestId: req.requestId, error: 'No depositAddress in TGB response', tgbResponse: data },
        'TGB API returned invalid response'
      );

      console.log('🔵 [TGB] ========== CREATE DEPOSIT ADDRESS END (NO ADDRESS) ==========');
      return res.status(502).json({ ok: false, error: 'No depositAddress returned by TGB.', details: data });
    }

    // Soft-validate returned address shape vs requested network & log if odd.
    // Sandbox can return simulated addresses (prefix 'tgb-sim-') so skip validation for those.
    const addr = out.depositAddress || '';
    if (typeof addr === 'string' && addr.startsWith('tgb-sim-')) {
      console.log('ℹ️  [TGB] Sandbox simulated deposit address received; skipping shape validation.');
    } else {
      let valid = true, expect = 'any';
      if (isEvmLike(netNorm)) { valid = looksEvm(addr); expect = 'EVM 0x…'; }
      else if (netNorm === 'solana') { valid = looksSol(addr); expect = 'Solana base58'; }
      else if (netNorm === 'stellar') { valid = looksStellar(addr); expect = 'Stellar G…'; }

      if (!valid) {
        console.warn(`⚠️  [TGB] Address shape mismatch! Expected ${expect}, got:`, addr);
        tgbLogger.warn(
          { requestId: req.requestId, networkRequested: netNorm, depositAddress: addr, expectedShape: expect },
          'TGB address shape mismatch with requested network'
        );
      } else {
        console.log(`✅ [TGB] Address validation passed for ${netNorm}`);
      }
    }

    // persist the canonical intent record
    console.log('💾 [TGB] Persisting intent to database...');
    try {
      saveIntent({
        depositAddress: out.depositAddress,
        depositTag: out.depositTag ?? null,
        offchainIntentId,
        roomId: metadata?.roomId ?? null,
        expectedAmountDecimal: String(effectiveAmount),
        tgbDepositId: out.id ?? undefined,
        tgbRequestId: out.requestId ?? undefined,
        organizationId,
        currency,
        network: netNorm,
        metadata: metadataWithIntent ?? null,
        qrCode: out.qrCodeImageBase64 ?? null,
        status: 'pending',
        createdAt: new Date().toISOString()
      });
      console.log('✅ [TGB] Intent saved successfully');
    } catch (e) {
      console.error('❌ [TGB] Failed to persist TGB intent:', e);
      tgbLogger.error({ requestId: req.requestId, err: e }, 'Failed to persist TGB intent');
    }

    tgbLogger.info(
      { requestId: req.requestId, depositAddress: out.depositAddress, depositId: out.id, network: netNorm },
      'TGB deposit address created successfully'
    );

    out.offchainIntentId = offchainIntentId;
    out.expectedAmountDecimal = String(effectiveAmount);

    console.log('✅ [TGB] Final response:', JSON.stringify(out, null, 2));
    console.log('🔵 [TGB] ========== CREATE DEPOSIT ADDRESS END (SUCCESS) ==========');

    return res.json(out);
  } catch (err) {
    console.error('❌ [TGB] FATAL ERROR:', err);
    console.error('❌ [TGB] Stack trace:', err?.stack);

    logError(tgbLogger, err, {
      requestId: req.requestId,
      endpoint: 'create-deposit-address',
      organizationId: req.body?.organizationId
    });

    console.log('🔵 [TGB] ========== CREATE DEPOSIT ADDRESS END (EXCEPTION) ==========');
    return res.status(500).json({ ok: false, error: err?.message ?? 'Server error' });
  }
}









