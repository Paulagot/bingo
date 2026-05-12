// server/utils/resolve-charity-wallet.js
//
// POST /api/charities/resolve-wallet
//
// Called by:
//   - useSolanaEndRoom.ts  (quiz, Solana)  — replaces /api/tgb/create-deposit-address
//   - useEvmDistributePrizes.ts (quiz, EVM) — replaces /api/tgb/create-deposit-address
//   - elimination finalize-prepare route   — replaces its internal TGB fetch
//
// Request body mirrors what the hooks already send to /api/tgb/create-deposit-address,
// plus charityName so we can do the DB lookup:
//   {
//     organizationId:  12345,           // TGB org id — used if no direct wallet found
//     charityName:     'ISPCC',         // used for DB lookup
//     tokenCode:       'USDC',
//     amount:          '12.500000',
//     network:         'solana',        // optional — passed through to TGB if needed
//     metadata:        { roomId: '...' }
//   }
//
// Response (same shape as /api/tgb/create-deposit-address so hooks need no other changes):
//   {
//     ok:             true,
//     depositAddress: '...wallet...',
//     source:         'direct' | 'tgb',   // extra field — useful for your logs
//     // tgb fields only present when source === 'tgb':
//     depositTag, id, requestId, offchainIntentId, expectedAmountDecimal
//   }

import express from 'express';
import { connection, TABLE_PREFIX } from '../config/database.js';
import { getAccessToken, tgbBaseUrl } from '../tgb/auth.js';
import { saveIntent } from '../tgb/persistence.js';
import {
  assertSupportedToken,
  getTgbCode,
  meetsMinDonation,
} from '../config/solana-tokens.js';
import crypto from 'node:crypto';

const router = express.Router();

const DIRECT_WALLETS_TABLE = `${TABLE_PREFIX}direct_charity_wallets`;

// Platform reserve — used when TGB minimum not met (same constant used in elimination)
const PLATFORM_CHARITY_RESERVE = '4dBPGPU6tmsWSsGhHgNMK9QBADWLs9AxKL1Jh7hZeS6o';

function tryParse(s) {
  try { return JSON.parse(s); } catch { return s; }
}

// ── DB lookup ─────────────────────────────────────────────────────────────────
async function lookupDirectWallet(charityName, chain) {
  if (!charityName) return null;

  try {
    const [rows] = await connection.execute(
      `SELECT wallet_address
         FROM ${DIRECT_WALLETS_TABLE}
        WHERE charity_name = ?
          AND chain        = ?
          AND is_active    = 1
        LIMIT 1`,
      // utf8mb4_general_ci makes this case-insensitive — 'ISPCC' matches 'ispcc'
      [charityName.trim(), chain.toLowerCase()]
    );

    if (rows.length > 0) {
      console.log(`[resolve-charity-wallet] ✅ Direct wallet found for "${charityName}" on ${chain}`);
      return rows[0].wallet_address;
    }

    console.log(`[resolve-charity-wallet] No direct wallet for "${charityName}" on ${chain} — trying TGB`);
    return null;
  } catch (err) {
    // Non-fatal: log and fall through to TGB
    console.error('[resolve-charity-wallet] DB lookup error:', err.message);
    return null;
  }
}

// ── Normalise network (matches create-deposit-address.js) ─────────────────────
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
  return s;
}

// ── TGB call (mirrors create-deposit-address.js) ──────────────────────────────
async function callTgb({ organizationId, pledgeCurrency, pledgeAmount, metadata, offchainIntentId, tokenCode, netNorm }) {
  const token = await getAccessToken();
  if (!token || String(token).trim() === '') {
    throw new Error('getAccessToken returned empty token');
  }

  const url = `${tgbBaseUrl()}/v1/deposit-address`;

  const payload = {
    organizationId,
    pledgeCurrency,
    pledgeAmount: String(pledgeAmount),
    isAnonymous: true,
  };

  console.log('[resolve-charity-wallet] Calling TGB:', { organizationId, pledgeCurrency, pledgeAmount });

  const tgbRes = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: token.startsWith('Bearer ') ? token : `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const text = await tgbRes.text();

  if (!tgbRes.ok) {
    throw new Error(`TGB API error ${tgbRes.status}: ${text}`);
  }

  const data = tryParse(text);
  const top    = (data && typeof data === 'object') ? data : {};
  const nested = (top.data && typeof top.data === 'object') ? top.data : {};

  const depositAddress = top.depositAddress ?? nested.depositAddress ?? top.address ?? nested.address ?? '';
  const depositTag     = top.depositTag ?? nested.depositTag ?? null;
  const id             = top.id ?? nested.id ?? undefined;
  const requestId      = top.requestId ?? nested.requestId ?? undefined;

  if (!depositAddress) {
    throw new Error(`TGB returned no depositAddress for org ${organizationId}: ${text}`);
  }

  // Persist intent — same as create-deposit-address.js
  try {
    saveIntent({
      depositAddress,
      depositTag: depositTag ?? null,
      offchainIntentId,
      roomId: metadata?.roomId ?? null,
      expectedAmountDecimal: String(pledgeAmount),
      tgbDepositId: id ?? undefined,
      tgbRequestId: requestId ?? undefined,
      organizationId,
      tokenCode,
      pledgeCurrency,
      network: netNorm,
      metadata: { ...metadata, offchainIntentId },
      status: 'pending',
      createdAt: new Date().toISOString(),
    });
  } catch (e) {
    console.error('[resolve-charity-wallet] Failed to persist TGB intent:', e.message);
  }

  return { depositAddress, depositTag, id, requestId };
}

// ── Route ──────────────────────────────────────────────────────────────────────
router.post('/resolve-wallet', async (req, res) => {
  try {
    const {
      organizationId,
      charityName,       // NEW field — used for DB lookup
      tokenCode,
      currency,          // legacy fallback
      network,
      amount,
      pledgeAmount,
      metadata,
    } = req.body || {};

    const resolvedTokenCode = (tokenCode ?? currency ?? '').toUpperCase().trim();
    const effectiveAmount   = pledgeAmount ?? amount;

    // Derive chain from network for DB lookup
    const netNorm = normalizeNetwork(network ?? (resolvedTokenCode ? 'solana' : ''));
    const chain   = netNorm === 'solana' ? 'solana'
                  : ['ethereum', 'base', 'polygon', 'arbitrum', 'optimism', 'bsc'].includes(netNorm) ? 'evm'
                  : netNorm === 'stellar' ? 'stellar'
                  : 'solana'; // default

    // ── Step 1: DB lookup ─────────────────────────────────────────────────
    const directWallet = await lookupDirectWallet(charityName, chain);

    if (directWallet) {
      return res.json({
        ok: true,
        depositAddress: directWallet,
        source: 'direct',
        expectedAmountDecimal: String(effectiveAmount ?? '0'),
      });
    }

    // ── Step 2: TGB fallback ──────────────────────────────────────────────
    if (!organizationId) {
      // No direct wallet AND no TGB org id — use platform reserve
      console.warn(
        `[resolve-charity-wallet] No direct wallet for "${charityName ?? '(none)'}" on ${chain} ` +
        `and no organizationId supplied — using platform reserve`
      );
      return res.json({
        ok: true,
        depositAddress: PLATFORM_CHARITY_RESERVE,
        source: 'reserve',
        expectedAmountDecimal: String(effectiveAmount ?? '0'),
      });
    }

    // Validate + map token code (same logic as create-deposit-address.js)
    let pledgeCurrency;
    let isSolanaToken = false;

    try {
      assertSupportedToken(resolvedTokenCode);
      pledgeCurrency  = getTgbCode(resolvedTokenCode);
      isSolanaToken   = true;
    } catch {
      pledgeCurrency  = resolvedTokenCode || currency;
      isSolanaToken   = false;
    }

    if (!pledgeCurrency) {
      return res.status(400).json({ ok: false, error: 'Missing or invalid token/currency' });
    }

    // Check TGB minimum (Solana tokens only) — fall back to reserve if below
    if (isSolanaToken && effectiveAmount !== undefined) {
      if (!meetsMinDonation(parseFloat(effectiveAmount), resolvedTokenCode)) {
        console.warn(`[resolve-charity-wallet] Below TGB minimum — using reserve wallet`);
        return res.json({
          ok: true,
          depositAddress: PLATFORM_CHARITY_RESERVE,
          source: 'reserve',
          expectedAmountDecimal: String(effectiveAmount),
        });
      }
    }

    const offchainIntentId = `FR-${metadata?.roomId ?? 'nometa'}-${Date.now()}-${crypto.randomUUID()}`;

    const tgb = await callTgb({
      organizationId: Number(organizationId),
      pledgeCurrency,
      pledgeAmount: effectiveAmount,
      metadata,
      offchainIntentId,
      tokenCode: resolvedTokenCode,
      netNorm,
    });

    return res.json({
      ok:                     true,
      depositAddress:         tgb.depositAddress,
      depositTag:             tgb.depositTag,
      id:                     tgb.id,
      requestId:              tgb.requestId,
      offchainIntentId,
      expectedAmountDecimal:  String(effectiveAmount ?? '0'),
      source:                 'tgb',
    });

  } catch (err) {
    console.error('[resolve-charity-wallet] Error:', err.message);
    return res.status(500).json({ ok: false, error: err.message ?? 'Server error' });
  }
});

export default router;