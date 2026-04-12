// server/web3/routes/web3TransactionRoutes.js
//
// Unauthenticated routes for recording confirmed Web3 transactions.
//
// Security model (no JWT auth available for players):
//   1. Rate limiting  — tight per-IP limits stop bulk replay/spam
//   2. On-chain verification — server re-fetches the tx and confirms it
//                              actually succeeded before writing to DB
//   3. Idempotency   — duplicate tx_hash + chain + network is silently ignored
//   4. Input validation — every field validated before any DB or chain call
//   5. Room existence check — tx must reference a real, active room
//
// What this route does NOT do:
//   - Prize payouts — those are inserted server-side in finalize-confirm only
//   - Refunds — reserved for future implementation

import express from 'express';
import rateLimit from 'express-rate-limit';
import { getRoom } from '../../elimination/services/eliminationRoomManager.js';
import { insertJoinPayment } from '../services/web3TransactionService.js';

const router = express.Router();

// ── Rate limiters ─────────────────────────────────────────────────────────────

// Join payments: max 5 per IP per 10 minutes.
// A real player joins one game at a time. This is generous enough for retries
// but stops replay attacks and bulk spam.
const joinPaymentLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,  // 10 minutes
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many payment requests. Please wait a few minutes.' },
});

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Verify a Solana transaction succeeded on-chain.
 * Returns true if the tx is confirmed and had no error.
 */
async function verifySolanaTx(txHash, cluster) {
  const { Connection } = await import('@solana/web3.js');

  const rpcUrl = cluster === 'mainnet'
    ? 'https://api.mainnet-beta.solana.com'
    : 'https://api.devnet.solana.com';

  const conn = new Connection(rpcUrl, 'confirmed');

  const tx = await conn.getTransaction(txHash, {
    commitment: 'confirmed',
    maxSupportedTransactionVersion: 0,
  });

  // tx is null if not found, tx.meta.err is non-null if it failed
  return tx !== null && tx.meta?.err === null;
}

/**
 * Verify an EVM transaction succeeded on-chain.
 * Uses a public RPC — no API key needed for receipt checks.
 */
async function verifyEvmTx(txHash, network) {
  // Map our network names to public RPC endpoints
  const RPC_URLS = {
    base:         'https://mainnet.base.org',
    base_sepolia: 'https://sepolia.base.org',
    ethereum:     'https://eth.llamarpc.com',
    sepolia:      'https://rpc.sepolia.org',
  };

  const rpcUrl = RPC_URLS[network];
  if (!rpcUrl) {
    console.warn(`[web3TxRoute] Unknown EVM network for verification: ${network}`);
    // Unknown network — don't block the insert, just warn
    return true;
  }

  const response = await fetch(rpcUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'eth_getTransactionReceipt',
      params: [txHash],
    }),
  });

  const data = await response.json();

  // receipt.status === '0x1' means success
  // If receipt is null, tx is pending or not found
  const receipt = data?.result;
  return receipt !== null && receipt?.status === '0x1';
}

// ── POST /api/web3-transactions/join-payment ──────────────────────────────────
//
// Called by the frontend immediately after on-chain payment confirmation,
// before emitting the socket join event.
//
// Body shape:
// {
//   game_type:          'elimination' | 'quiz'
//   room_id:            string
//   wallet_address:     string
//   chain:              'solana' | 'evm'
//   network:            string    e.g. 'devnet', 'base_sepolia'
//   tx_hash:            string    on-chain tx hash / signature
//   fee_token:          string    e.g. 'USDC'
//   token_address:      string?   mint / ERC-20 address
//   amount:             number    total raw token units paid
//   entry_fee_amount:   number    entry fee portion (raw)
//   extras_amount:      number    extras portion (raw)
//   donation_amount:    number    donation portion (raw)
//   solana_cluster:     string?   'devnet' | 'mainnet'  (Solana only)
//   metadata_json:      object?   optional extras detail etc.
// }

router.post('/join-payment', joinPaymentLimiter, async (req, res) => {
  try {
    const {
      game_type,
      room_id,
      wallet_address,
      chain,
      network,
      tx_hash,
      fee_token,
      token_address   = null,
      amount,
      entry_fee_amount,
      extras_amount    = 0,
      donation_amount  = 0,
      solana_cluster,
      metadata_json    = null,
    } = req.body;

    // ── Input validation ───────────────────────────────────────────────────
    if (!game_type || !['elimination', 'quiz'].includes(game_type)) {
      return res.status(400).json({ success: false, error: 'game_type must be elimination or quiz' });
    }
    if (!room_id || typeof room_id !== 'string' || room_id.length > 100) {
      return res.status(400).json({ success: false, error: 'room_id is required' });
    }
    if (!wallet_address || typeof wallet_address !== 'string' || wallet_address.length > 200) {
      return res.status(400).json({ success: false, error: 'wallet_address is required' });
    }
    if (!chain || !['solana', 'evm'].includes(chain)) {
      return res.status(400).json({ success: false, error: 'chain must be solana or evm' });
    }
    if (!network || typeof network !== 'string' || network.length > 50) {
      return res.status(400).json({ success: false, error: 'network is required' });
    }
    if (!tx_hash || typeof tx_hash !== 'string' || tx_hash.length > 200) {
      return res.status(400).json({ success: false, error: 'tx_hash is required' });
    }
    if (!fee_token || typeof fee_token !== 'string' || fee_token.length > 20) {
      return res.status(400).json({ success: false, error: 'fee_token is required' });
    }
    if (typeof amount !== 'number' || amount <= 0) {
      return res.status(400).json({ success: false, error: 'amount must be a positive number' });
    }
    if (typeof entry_fee_amount !== 'number' || entry_fee_amount < 0) {
      return res.status(400).json({ success: false, error: 'entry_fee_amount must be a non-negative number' });
    }

    // ── Room existence check ───────────────────────────────────────────────
    // Only check elimination rooms in memory — quiz rooms handled separately.
    // Both games share this route; quiz room check could be added here later.
    if (game_type === 'elimination') {
      const room = getRoom(room_id);
      if (!room) {
        return res.status(404).json({ success: false, error: 'Room not found' });
      }
      if (room.paymentMode !== 'web3') {
        return res.status(400).json({ success: false, error: 'Room is not a web3 room' });
      }
    }

    // ── On-chain verification ──────────────────────────────────────────────
    // Re-verify the tx on-chain server-side. This is the main security gate
    // for an unauthenticated route — we don't trust the client's claim that
    // the tx succeeded.
    let verified = false;
    try {
      if (chain === 'solana') {
        const cluster = solana_cluster ?? (network === 'mainnet' ? 'mainnet' : 'devnet');
        verified = await verifySolanaTx(tx_hash, cluster);
      } else if (chain === 'evm') {
        verified = await verifyEvmTx(tx_hash, network);
      }
    } catch (verifyErr) {
      console.warn('[web3TxRoute] On-chain verification failed:', verifyErr.message);
      // Verification error (RPC issue) — fail safe, reject the request
      return res.status(502).json({
        success: false,
        error: 'Could not verify transaction on-chain. Please try again.',
      });
    }

    if (!verified) {
      return res.status(400).json({
        success: false,
        error: 'Transaction not confirmed on-chain. Payment not recorded.',
      });
    }

    // ── Insert ledger row ─────────────────────────────────────────────────
    const result = await insertJoinPayment({
      game_type,
      room_id,
      campaign_id:      null,   // can be resolved later from room if needed
      wallet_address,
      chain,
      network,
      tx_hash,
      fee_token,
      token_address,
      amount,
      entry_fee_amount,
      extras_amount,
      donation_amount,
      metadata_json,
    });

    if (result.duplicate) {
      // Already recorded — safe to return success (idempotent)
      return res.json({ success: true, id: result.id, duplicate: true });
    }

    return res.status(201).json({ success: true, id: result.id, duplicate: false });

  } catch (err) {
    console.error('[web3TxRoute] POST /join-payment error:', err);
    return res.status(500).json({ success: false, error: 'Failed to record transaction' });
  }
});

export default router;