// server/web3/routes/web3AuthRoutes.js
//
// Wallet challenge / verify / logout routes for the Web3 fundraiser dashboard.
//
// Security model:
//   1. Rate limiting          — tight per-IP limits (web3AuthLimiter)
//   2. Challenge nonce        — one-time, expires in 5 minutes, stored server-side
//   3. Signature verification — server re-derives the message and verifies the
//                               signature against the submitted wallet address
//   4. Session token          — short-lived JWT signed with WEB3_SESSION_SECRET,
//                               sent back and stored in sessionStorage on client
//   5. No web2 JWT required   — this is a parallel auth path for wallets only

import express from 'express';
import { web3AuthLimiter } from '../../middleware/rateLimit.js';
import {
  createChallenge,
  verifyWalletSignature,
  invalidateSession,
  validateSessionToken,
} from '../services/web3AuthService.js';

const router = express.Router();

// ── POST /api/web3/auth/challenge ─────────────────────────────────────────────
//
// Returns a human-readable challenge message and a nonce.
// The frontend displays nothing — it just signs the message immediately.
//
// Body: { wallet_address: string, chain_family: 'evm' | 'solana' }

router.post('/challenge', web3AuthLimiter, async (req, res) => {
  try {
    const { wallet_address, chain_family } = req.body;

    if (!wallet_address || typeof wallet_address !== 'string' || wallet_address.length > 200) {
      return res.status(400).json({ success: false, error: 'wallet_address is required' });
    }
    if (!chain_family || !['evm', 'solana'].includes(chain_family)) {
      return res.status(400).json({ success: false, error: 'chain_family must be evm or solana' });
    }

    const { challenge, nonce } = await createChallenge(wallet_address, chain_family);

    return res.json({ success: true, challenge, nonce });
  } catch (err) {
    console.error('[web3AuthRoutes] POST /challenge error:', err);
    return res.status(500).json({ success: false, error: 'Failed to create challenge' });
  }
});

// ── POST /api/web3/auth/verify ────────────────────────────────────────────────
//
// Verifies the signed challenge. Returns a wallet session token on success.
//
// Body: { wallet_address, chain_family, nonce, signature }

router.post('/verify', web3AuthLimiter, async (req, res) => {
  try {
    const { wallet_address, chain_family, nonce, signature } = req.body;

    if (!wallet_address || typeof wallet_address !== 'string') {
      return res.status(400).json({ success: false, error: 'wallet_address is required' });
    }
    if (!chain_family || !['evm', 'solana'].includes(chain_family)) {
      return res.status(400).json({ success: false, error: 'chain_family must be evm or solana' });
    }
    if (!nonce || typeof nonce !== 'string') {
      return res.status(400).json({ success: false, error: 'nonce is required' });
    }
    if (!signature || typeof signature !== 'string') {
      return res.status(400).json({ success: false, error: 'signature is required' });
    }

    const result = await verifyWalletSignature({
      wallet_address,
      chain_family,
      nonce,
      signature,
    });

    if (!result.valid) {
      return res.status(401).json({ success: false, error: result.reason ?? 'Signature verification failed' });
    }

    return res.json({ success: true, token: result.token });
  } catch (err) {
    console.error('[web3AuthRoutes] POST /verify error:', err);
    return res.status(500).json({ success: false, error: 'Verification failed' });
  }
});

// ── POST /api/web3/auth/logout ────────────────────────────────────────────────
//
// Invalidates the wallet session token server-side.
// Best-effort — client clears sessionStorage regardless of response.

router.post('/logout', async (req, res) => {
  try {
    const token = req.headers['x-wallet-session'];
    if (token && typeof token === 'string') {
      await invalidateSession(token);
    }
    return res.json({ success: true });
  } catch (err) {
    // Non-critical — always return success so client clears its state
    return res.json({ success: true });
  }
});

// ── GET /api/web3/auth/me ─────────────────────────────────────────────────────
//
// Lightweight session check — used by the dashboard guard on mount.

router.get('/me', async (req, res) => {
  try {
    const token = req.headers['x-wallet-session'];
    if (!token || typeof token !== 'string') {
      return res.status(401).json({ success: false, error: 'No session token' });
    }
    const session = await validateSessionToken(token);
    if (!session) {
      return res.status(401).json({ success: false, error: 'Invalid or expired session' });
    }
    return res.json({ success: true, wallet_address: session.wallet_address, chain_family: session.chain_family });
  } catch (err) {
    return res.status(401).json({ success: false, error: 'Session validation failed' });
  }
});

export default router;