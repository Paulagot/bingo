// server/tgb/api/create-deposit-address.js

import { getAccessToken, tgbBaseUrl } from '../auth.js';
import { loggers, logExternalApi, logError } from '../../config/logging.js';
import { saveIntent } from '../persistence.js';
import crypto from 'node:crypto';

// ✅ NEW: import token helpers from backend token config
import {
  assertSupportedToken,
  getTgbCode,
  meetsMinDonation,
} from '../../config/solana-tokens.js';

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

function assertPositiveNumber(name, val) {
  const n = parseFloat(val);
  if (isNaN(n) || n < 0) throw new Error(`Missing or invalid "${name}" — must be a non-negative number`);
}

function tryParse(s) {
  try { return JSON.parse(s); } catch { return s; }
}

// ---------- Network helpers ----------
function normalizeNetwork(n) {
  const s = String(n || '').toLowerCase().trim();

  if (['eth', 'ethereum', 'mainnet'].includes(s)) return 'ethereum';
  if (s.startsWith('base')) return 'base';
  if (s.startsWith('polygon') || s === 'matic') return 'polygon';
  if (s.startsWith('arbitrum')) return 'arbitrum';
  if (s.startsWith('optimism') || s === 'op') return 'optimism';
  if (s === 'bsc' || s.includes('binance')) return 'bsc';
  if (s.includes('sol')) return 'solana';
  if (s.includes('stellar') || s === 'xlm') return 'stellar';
  if (s.includes('xrp') || s.includes('ripple')) return 'xrp';

  return s;
}

function isEvmLike(n) {
  const s = normalizeNetwork(n);
  return ['ethereum', 'base', 'polygon', 'arbitrum', 'optimism', 'bsc'].includes(s);
}

// ---------- Address validators (soft) ----------
const looksEvm = (s) => /^0x[a-fA-F0-9]{40}$/.test(s);
const looksSol = (s) => /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(s);
const looksStellar = (s) => /^G[A-Z2-7]{55}$/.test(s);

// ---------- Mock address makers ----------
function mockEvmAddress() { return '0xb7ACd1159dBed96B955C4d856fc001De9be59844'; }
function mockSolAddress() { return '7koYv1dqqHWh4PQ5bVh8CyLBTxqAHeARPiuazzF2FhCY'; }
function mockStellarAddress() { return 'GCF3Z7C6WJ6QX5M3Q7C7J2E6YJ5N4M2Q1P8R7T6U5S4R3Q2P1O'; }
function mockXrpAddress() { return 'rPT1Sjq2YGrBMTttX4GZHjKu9dyfzbpAYe'; }

function isMockEnabled(req) {
  if (process.env.TGB_FORCE_MOCK === 'true') return true;
  if (req?.query?.mock === '1' || req?.query?.mock === 'true') return true;
  if (req?.body?.mock === true) return true;
  return false;
}

// ---------- FundRaisely donor identity ----------
// Sent to TGB on every donation so receipts and dashboards
// show "FundRaisely" rather than "Anonymous Donor".
const PLATFORM_DONOR = {
  donorFirstName: 'FundRaisely',
  donorLastName: '',
  donorEmail: 'donations@fundraisely.com', // ← update to your real contact email
};

export default async function createDepositAddress(req, res) {
  try {
    console.log('🔵 [TGB] ========== CREATE DEPOSIT ADDRESS START ==========');
    console.log('🔵 [TGB] env.TGB_FORCE_MOCK:', process.env.TGB_FORCE_MOCK);
    console.log('🔵 [TGB] Raw request body:', JSON.stringify(req.body, null, 2));

    const {
      organizationId,
      // ✅ UPDATED: frontend now sends 'tokenCode' (e.g. 'USDG', 'SOL', 'BONK')
      // We keep 'currency' as fallback for backward compatibility
      tokenCode,
      currency,
      network,          // still accepted for EVM routes — ignored for Solana
      pledgeAmount,
      amount,
      metadata
    } = req.body || {};

    // Resolve token code — prefer new tokenCode field, fall back to currency
    const resolvedTokenCode = (tokenCode ?? currency ?? '').toUpperCase().trim();

    const effectiveAmount = pledgeAmount ?? amount;

    console.log('🔵 [TGB] Destructured values:');
    console.log('  - organizationId:', organizationId, typeof organizationId);
    console.log('  - tokenCode (resolved):', resolvedTokenCode);
    console.log('  - network (frontend):', network, typeof network);
    console.log('  - effectiveAmount:', effectiveAmount, typeof effectiveAmount);
    console.log('  - metadata:', metadata);

    // --- Validation ---
    assertIntegerOrString('organizationId', organizationId);
    assertPositiveNumber('amount', effectiveAmount);

    // ✅ NEW: validate token is supported — throws 400 with structured error if not
    // For EVM tokens (not in our Solana list) this will throw, which is correct
    // because EVM rooms use a different flow and shouldn't hit this endpoint with
    // Solana token codes. If you need EVM support here too, add an isSolanaToken
    // check and skip assertSupportedToken for EVM routes.
    let pledgeCurrency;
    let isSolanaToken = false;

    try {
      assertSupportedToken(resolvedTokenCode);
      // ✅ Map our internal token code to TGB's currency code
      // e.g. 'USDG' → 'USDG', 'SOL' → 'SOL', 'BONK' → 'BONK'
      pledgeCurrency = getTgbCode(resolvedTokenCode);
      isSolanaToken = true;
      console.log('✅ [TGB] Solana token resolved:', resolvedTokenCode, '→ TGB code:', pledgeCurrency);
    } catch {
      // Not a Solana token — treat as EVM/other, use currency code directly
      pledgeCurrency = resolvedTokenCode || currency;
      isSolanaToken = false;
      console.log('ℹ️  [TGB] Non-Solana token, using currency directly:', pledgeCurrency);
    }

    if (!pledgeCurrency) {
      return res.status(400).json({ ok: false, error: 'Missing or invalid token/currency' });
    }

    // ✅ NEW: check min donation threshold before calling TGB (Solana tokens only)
    if (isSolanaToken) {
      const amountNum = parseFloat(effectiveAmount);
      if (!meetsMinDonation(amountNum, resolvedTokenCode)) {
        console.warn(`⚠️  [TGB] Charity amount ${effectiveAmount} ${resolvedTokenCode} is below TGB minimum`);
        return res.status(400).json({
          ok: false,
          error: `Charity amount is below TGB minimum for ${resolvedTokenCode}`,
          tokenCode: resolvedTokenCode,
          amount: effectiveAmount,
        });
      }
      console.log('✅ [TGB] Min donation check passed');
    }

    console.log('✅ [TGB] Basic assertions passed');

    // Network normalisation — still used for EVM routes and mock selection
    const netNorm = normalizeNetwork(network ?? (isSolanaToken ? 'solana' : ''));
    console.log('🔵 [TGB] Normalized network:', network, '->', netNorm);

    const offchainIntentId = `FR-${metadata?.roomId ?? 'nometa'}-${Date.now()}-${crypto.randomUUID()}`;
    console.log('🔵 [TGB] Generated offchainIntentId:', offchainIntentId);

    const metadataWithIntent = { ...(metadata || {}), offchainIntentId };
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
          tokenCode: resolvedTokenCode,
          pledgeCurrency,
          netNorm,
          pledgeAmount: effectiveAmount,
          mockMode: true,
          donor: PLATFORM_DONOR,
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
          tokenCode: resolvedTokenCode,
          pledgeCurrency,
          network,
          netNorm,
          pledgeAmount: effectiveAmount,
          isAnonymous: false,
          donor: PLATFORM_DONOR,
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
          tokenCode: resolvedTokenCode,
          pledgeCurrency,
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
      return res.status(500).json({ ok: false, error: 'Missing access token for TGB' });
    }
    console.log('🔵 [TGB] Access token retrieved (preview):', String(token).slice(0, 12) + '...');

    const url = `${tgbBaseUrl()}/v1/deposit-address`;
    console.log('🔵 [TGB] API URL:', url);

    // ✅ UPDATED: TGB payload
    // - isAnonymous is false so TGB labels this donation as "FundRaisely" in
    //   their dashboard and sends receipts to our platform email.
    // - 'network' field is REMOVED — TGB determines network from pledgeCurrency
    //   itself. Sending 'network' causes a validation error: '"network" is not allowed'
    const payload = {
      organizationId,
      pledgeCurrency,                    // ✅ correct TGB code e.g. 'USDG', 'SOL', 'BONK'
      pledgeAmount: String(effectiveAmount),
      isAnonymous: false,
      ...PLATFORM_DONOR,                 // donorFirstName, donorLastName, donorEmail
    };

    console.log('🔵 [TGB] Payload to send to TGB API:', JSON.stringify(payload, null, 2));

    const startTime = Date.now();
    tgbLogger.info(
      {
        requestId: req.requestId,
        method: 'POST',
        url,
        payload,
        tokenCode: resolvedTokenCode,
        pledgeCurrency,
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

      return res
        .status(tgbRes.status)
        .json({ ok: false, error: 'TGB create deposit address failed', status: tgbRes.status, details: tryParse(text) });
    }

    const data = tryParse(text);
    console.log('✅ [TGB] Parsed response data:', JSON.stringify(data, null, 2));

    const top = (data && typeof data === 'object') ? data : {};
    const nested = (top.data && typeof top.data === 'object') ? top.data : {};

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
      return res.status(502).json({ ok: false, error: 'No depositAddress returned by TGB.', details: data });
    }

    // Soft-validate returned address shape
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

    // Persist the canonical intent record
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
        tokenCode: resolvedTokenCode,   // ✅ store our internal code
        pledgeCurrency,                 // ✅ store TGB code
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
      {
        requestId: req.requestId,
        depositAddress: out.depositAddress,
        depositId: out.id,
        tokenCode: resolvedTokenCode,
        pledgeCurrency,
        network: netNorm,
      },
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

    return res.status(500).json({ ok: false, error: err?.message ?? 'Server error' });
  }
}









