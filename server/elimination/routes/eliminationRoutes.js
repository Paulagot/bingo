import express from 'express';
import rateLimit from 'express-rate-limit';
import { syncEliminationImpactToDb } from '../services/syncEliminationImpactToDb.js';
import { insertPrizePayout, insertWeb3Transaction } from '../../mgtsystem/services/web3TransactionService.js';

const eliminationCreateLimiter = rateLimit({ windowMs: 60*60*1000, max: 10, message: { error: 'Too many rooms created. Try again later.' } });
const eliminationRoomLimiter = rateLimit({ windowMs: 60*1000, max: 60, message: { error: 'Too many requests.' } });

// Platform charity reserve wallet — used when TGB minimum not met
// Matches PLATFORM_CHARITY_RESERVE in src/chains/solana/config/solanaTokenConfig.ts
const PLATFORM_CHARITY_RESERVE = '4dBPGPU6tmsWSsGhHgNMK9QBADWLs9AxKL1Jh7hZeS6o';

import {
  createRoom,
  getRoom,
  getRoomSnapshot,
  getReconnectSnapshot,
  endRoom,
  deleteRoom,
} from '../services/eliminationRoomManager.js';
import { validateHost, validateStart } from '../services/eliminationValidationService.js';
import { generatePlayerId } from '../utils/eliminationHelpers.js';

const router = express.Router();

// ─── POST /api/elimination/rooms/web3 ─────────────────────────────────────────
// MUST be before POST /rooms and GET /rooms/:roomId to avoid route conflicts
router.post('/rooms/web3', eliminationCreateLimiter, async (req, res) => {
  try {
    const {
      hostName,
      hostId,
      hostWallet,
      web3Chain,
      solanaCluster,
      feeMint,
      entryFee,
      roomPda,
      charityOrgId,
      charityName,
      evmChain,
      evmContractAddress,
      onChainRoomId,
    } = req.body;

    if (!hostName || typeof hostName !== 'string') {
      return res.status(400).json({ success: false, error: 'hostName is required' });
    }
    if (!hostWallet || typeof hostWallet !== 'string') {
      return res.status(400).json({ success: false, error: 'hostWallet is required' });
    }
    if (!web3Chain || !['solana', 'evm'].includes(web3Chain)) {
      return res.status(400).json({ success: false, error: 'valid web3Chain is required' });
    }
    if (!feeMint || typeof feeMint !== 'string') {
      return res.status(400).json({ success: false, error: 'feeMint is required' });
    }
    if (!entryFee || typeof entryFee !== 'number' || entryFee <= 0) {
      return res.status(400).json({ success: false, error: 'entryFee must be a positive number' });
    }
    if (!roomPda || typeof roomPda !== 'string') {
      return res.status(400).json({ success: false, error: 'roomPda is required' });
    }

    const resolvedHostId = hostId ?? generatePlayerId();

    const room = createRoom({
      hostId: resolvedHostId,
      hostName: hostName.trim(),
      hostSocketId: null,
      paymentMode: 'web3',
      web3Chain,
      solanaCluster: solanaCluster ?? null,
      feeMint,
      entryFee,
      roomPda,
      hostWallet,
      charityOrgId: charityOrgId ?? null,
      charityName: charityName ?? null,
      evmChain: evmChain ?? null,
      evmContractAddress: evmContractAddress ?? null,
      onChainRoomId: onChainRoomId ?? null,
    });

    console.log(`[Elimination] Web3 room created: ${room.roomId} chain=${web3Chain} pda=${roomPda}`);

    return res.status(201).json({
      success: true,
      roomId: room.roomId,
      hostId: resolvedHostId,
      status: room.status,
      createdAt: room.createdAt,
      roomPda,
      feeMint,
      entryFee,
      web3Chain,
    });
  } catch (err) {
    console.error('[Elimination] POST /rooms/web3 error:', err);
    return res.status(500).json({ success: false, error: 'Failed to create web3 room' });
  }
});

// ─── POST /api/elimination/rooms ──────────────────────────────────────────────
router.post('/rooms', eliminationCreateLimiter, (req, res) => {
  try {
    const { hostName, hostId } = req.body;

    if (!hostName || typeof hostName !== 'string') {
      return res.status(400).json({ success: false, error: 'hostName is required' });
    }

    const resolvedHostId = hostId ?? generatePlayerId();

    const room = createRoom({
      hostId: resolvedHostId,
      hostName: hostName.trim(),
      hostSocketId: null,
    });

    return res.status(201).json({
      success: true,
      roomId: room.roomId,
      hostId: resolvedHostId,
      status: room.status,
      createdAt: room.createdAt,
    });
  } catch (err) {
    console.error('[Elimination] POST /rooms error:', err);
    return res.status(500).json({ success: false, error: 'Failed to create room' });
  }
});

// ─── POST /api/elimination/rooms/:roomId/finalize-prepare ─────────────────────
// MUST be before GET /rooms/:roomId
router.post('/rooms/:roomId/finalize-prepare', async (req, res) => {
  try {
    const { roomId } = req.params;
    const { hostId, winnerPlayerId, tokenCode, charityDisplayAmount } = req.body;

    const room = getRoom(roomId);
    if (!room) return res.status(404).json({ success: false, error: 'Room not found' });
    if (room.hostId !== hostId) return res.status(403).json({ success: false, error: 'Unauthorized' });
    if (room.paymentMode !== 'web3') return res.status(400).json({ success: false, error: 'Not a web3 room' });

    const winnerPlayer = Object.values(room.players).find(p => p.playerId === winnerPlayerId);
    if (!winnerPlayer) return res.status(400).json({ success: false, error: 'Winner not found' });
    if (!winnerPlayer.walletAddress) return res.status(400).json({ success: false, error: 'Winner wallet address not found. Player may not have joined via web3.' });

    const totalPlayers = Object.keys(room.players).length;
    const totalPoolRaw = totalPlayers * room.entryFee;
    const winnerRaw   = Math.floor(totalPoolRaw * 0.30);
    const charityRaw  = Math.floor(totalPoolRaw * 0.35);
    const hostRaw     = Math.floor(totalPoolRaw * 0.20);
    const platformRaw = Math.floor(totalPoolRaw * 0.15);

    // Store winner wallet on room so finalize-confirm can access it
    room.winnerWallet = winnerPlayer.walletAddress;
    room.winnerRaw    = winnerRaw;

    let charityWallet = null;
    let tgbDepositAddress = null;

    if (room.charityOrgId) {
      try {
        const charityDisplayAmount = req.body.charityDisplayAmount ?? '0';
        const tokenCode = req.body.tokenCode ?? 'USDC';

        const tgbResponse = await fetch(
          `${process.env.SERVER_URL ?? 'http://localhost:3001'}/api/tgb/create-deposit-address`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              organizationId: Number(room.charityOrgId),
              tokenCode,
              amount: charityDisplayAmount,
              metadata: { roomId, gameType: 'elimination' },
            }),
          }
        );

        const tgbData = await tgbResponse.json();

        if (tgbData.ok && tgbData.depositAddress) {
          charityWallet = tgbData.depositAddress;
          room.charityWallet = charityWallet;
          tgbDepositAddress = tgbData.depositAddress;
          console.log(`[Elimination] TGB charity wallet: ${charityWallet}`);
        } else {
          console.warn('[Elimination] TGB returned no address, using reserve:', tgbData);
          charityWallet = PLATFORM_CHARITY_RESERVE;
          room.charityWallet = charityWallet;  // ← ensure always saved on room
        }
      } catch (tgbErr) {
        console.warn('[Elimination] TGB fetch failed, using reserve:', tgbErr.message);
        charityWallet = PLATFORM_CHARITY_RESERVE;
        room.charityWallet = charityWallet;  // ← ensure always saved on room
      }
    } else {
      charityWallet = PLATFORM_CHARITY_RESERVE;
      room.charityWallet = charityWallet;
    }

    if (!charityWallet) {
      return res.status(500).json({ success: false, error: 'Could not resolve charity wallet.' });
    }

    console.log(`[Elimination] Finalize prepared for room ${roomId}:`, {
      winnerWallet: winnerPlayer.walletAddress,
      charityWallet,
      totalPoolRaw,
      charityRaw,
    });

    return res.json({
      success: true,
      winnerWallet:  winnerPlayer.walletAddress,
      charityWallet,
      tgbDepositAddress,
      totalPoolRaw,
      winnerRaw,
      charityRaw,
      hostRaw,
      platformRaw,
      feeMint:       room.feeMint,
      roomPda:       room.roomPda,
      onChainRoomId: room.onChainRoomId,
      solanaCluster: room.solanaCluster,
    });

  } catch (err) {
    console.error('[Elimination] POST /rooms/:roomId/finalize-prepare error:', err);
    return res.status(500).json({ success: false, error: 'Failed to prepare finalize' });
  }
});

// ─── POST /api/elimination/rooms/:roomId/finalize-confirm ─────────────────────
router.post('/rooms/:roomId/finalize-confirm', async (req, res) => {
  try {
    const { roomId } = req.params;
    const { hostId, txSignature, tokenCode } = req.body;

    const room = getRoom(roomId);
    if (!room) return res.status(404).json({ success: false, error: 'Room not found' });
    if (room.hostId !== hostId) return res.status(403).json({ success: false, error: 'Unauthorized' });

    // ── On-chain tx verification — Solana or EVM ─────────────────────────
    if (room.web3Chain === 'evm') {
      // EVM verification via public RPC
      const RPC_URLS = {
        base:         'https://mainnet.base.org',
        base_sepolia: 'https://sepolia.base.org',
        baseSepolia:  'https://sepolia.base.org',
        ethereum:     'https://eth.llamarpc.com',
        sepolia:      'https://rpc.sepolia.org',
      };
      const rpcUrl = RPC_URLS[room.evmChain] ?? RPC_URLS[room.solanaCluster] ?? null;

      if (!rpcUrl) {
        console.warn(`[Elimination] Unknown EVM network for verification: ${room.evmChain}`);
        // Unknown network — don't block finalize, just warn
      } else {
        const receiptRes = await fetch(rpcUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0', id: 1,
            method: 'eth_getTransactionReceipt',
            params: [txSignature],
          }),
        });
        const receiptData = await receiptRes.json();
        const receipt = receiptData?.result;

        if (!receipt || receipt.status !== '0x1') {
          return res.status(400).json({ success: false, error: 'Finalize transaction not confirmed on EVM' });
        }
      }
    } else {
      // Solana verification
      const { Connection } = await import('@solana/web3.js');
      const cluster = room.solanaCluster ?? 'devnet';
      const rpcUrl = cluster === 'mainnet'
        ? 'https://api.mainnet-beta.solana.com'
        : 'https://api.devnet.solana.com';

      const connection = new Connection(rpcUrl, 'confirmed');
      const tx = await connection.getTransaction(txSignature, {
        commitment: 'confirmed',
        maxSupportedTransactionVersion: 0,
      });

      if (!tx || tx.meta?.err) {
        return res.status(400).json({ success: false, error: 'Finalize transaction not confirmed on Solana' });
      }
    }

    room.settled = true;
    room.finalizeTxSignature = txSignature;
    room.settledAt = new Date().toISOString();

    const totalPool = Object.keys(room.players).length * room.entryFee;

    // ── Existing impact DB sync (unchanged) ───────────────────────────────
    syncEliminationImpactToDb({
      roomId,
      hostId:          room.hostId,
      hostName:        room.hostName,
      hostWallet:      room.hostWallet    ?? null,
      charityWallet:   room.charityWallet ?? null,
      charityName:     room.charityName   ?? null,
      feeMint:         room.feeMint,
      tokenCode:       tokenCode ?? 'UNKNOWN',
      chain:           room.web3Chain     ?? 'solana',
      network:         room.solanaCluster ?? 'devnet',
      totalRaised:     totalPool,
      charityAmount:   Math.floor(totalPool * 0.35),
      hostFeeAmount:   Math.floor(totalPool * 0.20),
      numberOfPlayers: Object.keys(room.players).length,
      txSignature,
    }).catch(err => console.error('[Elimination] DB sync failed (non-critical):', err));

    // ── NEW: Write prize payout to web3 transaction ledger ────────────────
    // winnerWallet and winnerRaw were stored on the room object in finalize-prepare.
    // The finalize tx is a single on-chain call that pays winner + charity + host,
    // so we record it once here as the winner's prize_payout row.
    insertPrizePayout({
      game_type:      'elimination',
      room_id:        roomId,
      campaign_id:    null,
      wallet_address: room.winnerWallet ?? 'unknown',
      chain:          room.web3Chain    ?? 'solana',
      network:        room.web3Chain === 'evm'
                        ? (room.evmChain ?? 'unknown')
                        : (room.solanaCluster ?? 'devnet'),
      tx_hash:        txSignature,
      fee_token:      tokenCode         ?? 'UNKNOWN',
      token_address:  room.feeMint      ?? null,
      amount:         room.winnerRaw    ?? Math.floor(totalPool * 0.30),
    }).catch(err =>
      console.error('[Elimination] Prize payout ledger write failed (non-critical):', err)
    );

    console.log(`[Elimination] Room ${roomId} finalized. tx: ${txSignature}`);

    return res.json({
      success: true,
      txSignature,
      message: 'Room finalized and prizes distributed',
    });

  } catch (err) {
    console.error('[Elimination] POST /rooms/:roomId/finalize-confirm error:', err);
    return res.status(500).json({ success: false, error: 'Failed to confirm finalize' });
  }
});

// ─── POST /api/elimination/rooms/:roomId/start ────────────────────────────────
router.post('/rooms/:roomId/start', (req, res) => {
  try {
    const { roomId } = req.params;
    const { hostId } = req.body;

    const { valid, error } = validateStart(roomId, hostId);
    if (!valid) {
      return res.status(400).json({ success: false, error });
    }

    return res.json({ success: true, message: 'Room ready to start. Emit start event via socket.' });
  } catch (err) {
    console.error('[Elimination] POST /rooms/:roomId/start error:', err);
    return res.status(500).json({ success: false, error: 'Failed to validate start' });
  }
});

// ─── POST /api/elimination/rooms/:roomId/end ──────────────────────────────────
router.post('/rooms/:roomId/end', (req, res) => {
  try {
    const { roomId } = req.params;
    const { hostId } = req.body;

    const room = getRoom(roomId);
    if (!room) return res.status(404).json({ success: false, error: 'Room not found' });

    const { valid, error } = validateHost(room, hostId);
    if (!valid) return res.status(403).json({ success: false, error });

    endRoom(roomId, null);

    return res.json({ success: true, message: 'Room ended' });
  } catch (err) {
    console.error('[Elimination] POST /rooms/:roomId/end error:', err);
    return res.status(500).json({ success: false, error: 'Failed to end room' });
  }
});

// ─── POST /api/elimination/rooms/:roomId/cancel-confirm ───────────────────────
router.post('/rooms/:roomId/cancel-confirm', async (req, res) => {
  try {
    const { roomId } = req.params;
    const { hostId, cancelTxHash, refundTxHash, tokenCode } = req.body;

    const room = getRoom(roomId);
    if (!room) return res.status(404).json({ success: false, error: 'Room not found' });
    if (room.hostId !== hostId) return res.status(403).json({ success: false, error: 'Unauthorized' });

    // ── Snapshot before marking cancelled ────────────────────────────────
    // The socket handler fires almost immediately after we respond and may
    // call deleteRoom. Snapshotting here means ledger writes don't race
    // against room deletion.
    const roomSnapshot = {
      paymentMode:   room.paymentMode,
      web3Chain:     room.web3Chain,
      evmChain:      room.evmChain,
      solanaCluster: room.solanaCluster,
      feeMint:       room.feeMint,
      entryFee:      room.entryFee,
      players:       Object.values(room.players ?? {}),
    };

    room.cancelled = true;
    room.cancelledAt = new Date().toISOString();
    room.cancelTxHash = cancelTxHash ?? null;
    room.refundTxHash = refundTxHash ?? null;
    room.status = 'cancelled';

    console.log(`[Elimination] Room ${roomId} marked cancelled. cancelTx: ${cancelTxHash} refundTx: ${refundTxHash ?? 'none'}`);

    // ── Write refund rows to web3 transaction ledger ──────────────────────
    // The refund tx is batched — one on-chain tx refunds all players.
    // One row per player wallet so we have a full per-wallet record.
    if (refundTxHash && roomSnapshot.paymentMode === 'web3') {
      const network = roomSnapshot.web3Chain === 'evm'
        ? (roomSnapshot.evmChain ?? 'unknown')
        : (roomSnapshot.solanaCluster ?? 'devnet');

      // tokenCode must come from the frontend body — feeMint is an address not a symbol
      const resolvedTokenCode = tokenCode ?? 'UNKNOWN';

      const playersWithWallets = roomSnapshot.players.filter(p => p.walletAddress);

      if (playersWithWallets.length === 0) {
        console.log(`[Elimination] No players with wallets to refund for room ${roomId}`);
      } else {
        const refundPromises = playersWithWallets.map(p =>
          insertWeb3Transaction({
            transaction_type: 'refund',
            direction:        'out',
            game_type:        'elimination',
            room_id:          roomId,
            campaign_id:      null,
            wallet_address:   p.walletAddress,
            chain:            roomSnapshot.web3Chain  ?? 'solana',
            network,
            tx_hash:          refundTxHash,
            fee_token:        resolvedTokenCode,
            token_address:    roomSnapshot.feeMint    ?? null,
            amount:           roomSnapshot.entryFee   ?? 0,
            entry_fee_amount: 0,
            extras_amount:    0,
            donation_amount:  0,
            metadata_json:    { cancelTxHash: cancelTxHash ?? null },
          }).catch(err =>
            console.warn(`[Elimination] Refund ledger write failed for wallet ${p.walletAddress}:`, err.message)
          )
        );

        await Promise.allSettled(refundPromises);
        console.log(`[Elimination] Refund ledger rows written for ${playersWithWallets.length} players, room ${roomId}`);
      }
    } else if (!refundTxHash) {
      console.log(`[Elimination] No refundTxHash received — skipping refund ledger write for room ${roomId}`);
    }

    setTimeout(() => deleteRoom(roomId), 10000);

    return res.json({ success: true, message: 'Room cancelled' });

  } catch (err) {
    console.error('[Elimination] POST /rooms/:roomId/cancel-confirm error:', err);
    return res.status(500).json({ success: false, error: 'Failed to confirm cancel' });
  }
});

// ─── GET /api/elimination/rooms/:roomId ───────────────────────────────────────
// Generic GET — must be AFTER all specific POST routes
router.get('/rooms/:roomId', eliminationRoomLimiter, (req, res) => {
  try {
    const { roomId } = req.params;
    const snapshot = getRoomSnapshot(roomId);

    if (!snapshot) {
      return res.status(404).json({ success: false, error: 'Room not found' });
    }

    return res.json({ success: true, room: snapshot });
  } catch (err) {
    console.error('[Elimination] GET /rooms/:roomId error:', err);
    return res.status(500).json({ success: false, error: 'Failed to fetch room' });
  }
});

// ─── GET /api/elimination/rooms/:roomId/player/:playerId ─────────────────────
router.get('/rooms/:roomId/player/:playerId', (req, res) => {
  try {
    const { roomId, playerId } = req.params;
    const snapshot = getReconnectSnapshot(roomId, playerId);

    if (!snapshot) {
      return res.status(404).json({ success: false, error: 'Room or player not found' });
    }

    return res.json({ success: true, ...snapshot });
  } catch (err) {
    console.error('[Elimination] GET /rooms/:roomId/player/:playerId error:', err);
    return res.status(500).json({ success: false, error: 'Failed to fetch reconnect snapshot' });
  }
});

export default router;