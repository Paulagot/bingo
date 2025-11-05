// Backend API Route - Updated with strong Web3 proof validation (multichain ready)
import express from 'express';
import { createQuizRoom } from '../quizRoomManager.js';
import {
  resolveEntitlements,
  checkCaps,
  consumeCredit,
} from '../../policy/entitlements.js';
import { canUseTemplate } from '../../policy/entitlements.js';

import authenticateToken from '../../middleware/auth.js';

const router = express.Router();

/* -------------------------------------------------------------------------- */
/*                                WEB3 HELPERS                                */
/* -------------------------------------------------------------------------- */
/**
 * We validate the contract/program ID and deployment tx/signature based on chain.
 * This prevents rooms from being created if the host didn't actually sign or
 * signed on the wrong network. These are *format* checks; you can add optional
 * RPC verification later.
 */

// Treat these as placeholders / non-signed results coming from the client
const isPlaceholder = (v) =>
  !v ||
  v === 'pending' ||
  v === 'transaction-submitted' ||
  v === 'not-signed' ||
  v === 'N/A';

// ---- Stellar / Soroban (Stellar/Soroban testnet & mainnet) ----
// Soroban contract IDs: Base32, start with "C", 56 chars total (C + 55)
// We accept uppercase A-Z and digits 2-7.
const looksLikeSorobanContractId = (cid) =>
  typeof cid === 'string' && /^C[A-Z2-7]{55}$/.test(cid);

// Stellar/Soroban tx hash is 64 hex chars (no 0x). We'll accept with or without 0x.
const looksLikeStellarTxHash = (h) =>
  typeof h === 'string' &&
  (/^[0-9a-fA-F]{64}$/.test(h) ||
    /^0x[0-9a-fA-F]{64}$/.test(h)); // normalize later if you want

// ---- EVM (Ethereum & EVM compatibles) ----
const looksLikeEvmAddress = (addr) =>
  typeof addr === 'string' && /^0x[0-9a-fA-F]{40}$/.test(addr);

const looksLikeEvmTxHash = (h) =>
  typeof h === 'string' && /^0x[0-9a-fA-F]{64}$/.test(h);

// ---- Solana ----
// Program IDs are base58, typically 32-44 chars (can be a little longer for some)
// We'll accept 32–64 chars base58.
const looksLikeSolanaProgramId = (pid) =>
  typeof pid === 'string' && /^[1-9A-HJ-NP-Za-km-z]{32,64}$/.test(pid);

// Transaction signatures are base58, can be 43–88 chars (varies)
// We accept 43–96 to be safe.
const looksLikeSolanaSignature = (sig) =>
  typeof sig === 'string' && /^[1-9A-HJ-NP-Za-km-z]{43,96}$/.test(sig);

/**
 * Validate a (contract/program) address + tx (hash/signature) according to chain.
 * NOTE: This is format-level validation only.
 * @returns {{ ok: boolean, reason?: string }}
 */
const validateWeb3Proof = ({ chain, contractAddress, deploymentTxHash }) => {
  const c = (chain || '').toLowerCase();

  if (isPlaceholder(contractAddress) || isPlaceholder(deploymentTxHash)) {
    return {
      ok: false,
      reason: 'placeholder-values',
    };
  }

  switch (c) {
    case 'stellar':
    case 'soroban':
      if (!looksLikeSorobanContractId(contractAddress)) {
        return { ok: false, reason: 'invalid-soroban-contract-id' };
      }
      if (!looksLikeStellarTxHash(deploymentTxHash)) {
        return { ok: false, reason: 'invalid-stellar-tx-hash' };
      }
      return { ok: true };

    case 'evm':
    case 'ethereum':
      if (!looksLikeEvmAddress(contractAddress)) {
        return { ok: false, reason: 'invalid-evm-contract-address' };
      }
      if (!looksLikeEvmTxHash(deploymentTxHash)) {
        return { ok: false, reason: 'invalid-evm-tx-hash' };
      }
      return { ok: true };

    case 'solana':
      if (!looksLikeSolanaProgramId(contractAddress)) {
        return { ok: false, reason: 'invalid-solana-program-id' };
      }
      if (!looksLikeSolanaSignature(deploymentTxHash)) {
        return { ok: false, reason: 'invalid-solana-signature' };
      }
      return { ok: true };

    // Default to Stellar/Soroban rules to be conservative
    default:
      if (!looksLikeSorobanContractId(contractAddress)) {
        return { ok: false, reason: 'unknown-chain-invalid-contract' };
      }
      if (!looksLikeStellarTxHash(deploymentTxHash)) {
        return { ok: false, reason: 'unknown-chain-invalid-tx' };
      }
      return { ok: true };
  }
};

/* -------------------------------------------------------------------------- */
/*                             UNAUTH WEB3 ENDPOINT                            */
/* -------------------------------------------------------------------------- */
/**
 * This route is intentionally unauthenticated so hosts that are not logged in
 * to the management system can still create on-chain rooms.
 *
 * SECURITY: We enforce a *strong* validation of the deployment proof, so you
 * can't create a Web3 room unless the client provides a plausible on-chain
 * contract/program id and a plausible deployment tx/signature for the selected
 * chain.
 *
 * For production: you may also perform an RPC call here to verify the tx exists
 * on the right network (Soroban RPC, EVM JSON-RPC, Solana RPC).
 */
router.post('/create-web3-room', async (req, res) => {
  // Add timeout to ensure response is always sent
  const timeout = setTimeout(() => {
    if (!res.headersSent) {
      console.error('[API] ⚠️ Request timeout - sending error response');
      res.status(500).json({ error: 'Request timeout' });
    }
  }, 30000); // 30 second timeout

  try {
    console.log('--------------------------------------');
    console.log('[API] 🔗 Received Web3 room creation request');
    console.log('[API] 📋 Request body exists:', !!req.body);
    
    if (!req.body) {
      clearTimeout(timeout);
      return res.status(400).json({ error: 'Request body is required' });
    }
    
    const { config: setupConfig, roomId, hostId } = req.body;

    // Basic validation
    if (!roomId || !hostId) {
      console.error('[API] ❌ Missing roomId or hostId in request');
      clearTimeout(timeout);
      return res.status(400).json({ error: 'roomId and hostId are required' });
    }

    if (!setupConfig) {
      console.error('[API] ❌ Missing config');
      clearTimeout(timeout);
      return res.status(400).json({ error: 'Missing config' });
    }

    // ✅ CHANGED: Accept all three possible field names for contract address
    const contractAddress = 
      setupConfig?.roomContractAddress ||      // ✅ Canonical field (NEW)
      setupConfig?.web3ContractAddress ||      // Legacy field
      setupConfig?.contractAddress;            // Old field

    const deploymentTxHash = setupConfig?.deploymentTxHash;

    const chain =
      setupConfig?.web3ChainConfirmed ||
      setupConfig?.web3Chain ||
      'stellar'; // default to Stellar/Soroban

    console.log('[API] 🔗 Chain detection:', {
      web3ChainConfirmed: setupConfig?.web3ChainConfirmed,
      web3Chain: setupConfig?.web3Chain,
      resolved: chain,
      contractAddress,
      deploymentTxHash
    });

    // ✅ NEW: Validate we actually got a contract address
    if (!contractAddress) {
      console.error('[API] ❌ No contract address found in request');
      clearTimeout(timeout);
      return res.status(400).json({ 
        error: 'Contract address missing. Deployment may have failed.',
        hint: 'Check that roomContractAddress is being sent in the config'
      });
    }

    // Set/force Web3 flags
    setupConfig.isWeb3Room = true;
    setupConfig.paymentMethod = 'web3';

    // Strong format validation for on-chain proof
    const proof = validateWeb3Proof({
      chain,
      contractAddress,
      deploymentTxHash,
    });
    
    console.log('[API] ✅ Validation result:', {
      ok: proof.ok,
      reason: proof.reason,
      chain,
      contractAddressLength: contractAddress?.length,
      txHashLength: deploymentTxHash?.length
    });

    if (!proof.ok) {
      console.error('[API] ❌ Invalid deployment proof', {
        reason: proof.reason,
        chain,
        contractAddress,
        deploymentTxHash,
      });
      clearTimeout(timeout);
      return res.status(400).json({ 
        error: 'Deployment not verified: missing/invalid tx hash or contract/program id. Please sign on the correct network and try again.',
        details: {
          chain,
          reason: proof.reason,
        },
      });
    }

    // --- Normalize & persist canonical Web3 fields ---
    setupConfig.roomContractAddress = contractAddress;
    setupConfig.web3ContractAddress = contractAddress;
    setupConfig.contractAddress = contractAddress;
    setupConfig.deploymentTxHash = deploymentTxHash;
    setupConfig.web3Chain = setupConfig.web3ChainConfirmed || setupConfig.web3Chain || chain;
    
    if (setupConfig.web3Chain === 'evm') {
      setupConfig.evmNetwork = setupConfig.evmNetwork || req.body?.config?.evmNetwork || null;
    }

    console.log('[API] 🔄 Starting room creation process...');
    const requestedRounds = (setupConfig?.roundDefinitions || []).length;
    console.log(`[API] 📊 Requested rounds: ${requestedRounds}`);

    // Force Web3 configuration with generous limits
    setupConfig.roomCaps = {
      maxPlayers: 10000,
      maxRounds: Math.max(requestedRounds, 1),
      roundTypesAllowed: '*',
      extrasAllowed: '*',
    };

    console.log('[API] 🎯 Calling createQuizRoom...');
    
    let created = false;
    try {
      created = createQuizRoom(roomId, hostId, setupConfig);
    } catch (roomErr) {
      console.error('[API] ❌ Error in createQuizRoom:', roomErr);
      console.error('[API] ❌ Error stack:', roomErr?.stack);
      clearTimeout(timeout);
      return res.status(500).json({ 
        error: 'Failed to create room',
        ...(process.env.NODE_ENV !== 'production' && { details: roomErr?.message })
      });
    }
    
    if (!created) {
      console.error('[API] ❌ Failed to create Web3 quiz room');
      clearTimeout(timeout);
      return res.status(400).json({ 
        error: 'Failed to create room (invalid config, questions missing, or room already exists)' 
      });
    }

    console.log('[API] ✅ Successfully created Web3 room in memory');
    console.log(`[API] 🆔 Room ID: ${roomId}`);
    console.log(`[API] 👤 Host ID: ${hostId}`);
    console.log(`[API] 📍 Contract: ${contractAddress}`);
    console.log('--------------------------------------');

    // Return both field names for backward compatibility
    const responseData = {
      roomId,
      hostId,
      contractAddress,                       // Legacy field
      roomContractAddress: contractAddress,  // ✅ Canonical field
      deploymentTxHash,
      roomCaps: setupConfig.roomCaps,
      verified: true,
    };

    console.log('[API] 📤 Sending success response to client');
    clearTimeout(timeout);
    res.status(200).json(responseData);
    
  } catch (err) {
    clearTimeout(timeout);
    console.error('[API] ❌ Exception creating Web3 room:', err);
    console.error('[API] ❌ Error name:', err?.name);
    console.error('[API] ❌ Error message:', err?.message);
    console.error('[API] ❌ Error stack:', err?.stack);
    
    if (!res.headersSent) {
      try {
        res.status(500).json({ 
          error: 'internal_error',
          ...(process.env.NODE_ENV !== 'production' && { 
            details: err?.message,
            stack: err?.stack 
          })
        });
      } catch (sendErr) {
        console.error('[API] ❌ Failed to send error response:', sendErr);
        // Last resort
        try {
          res.status(500).send('Internal server error');
        } catch {
          console.error('[API] ❌❌ Complete failure to send response');
        }
      }
    }
  }
});

/* -------------------------------------------------------------------------- */
/*                      AUTH-REQUIRED ROUTES (WEB2 FLOW)                      */
/* -------------------------------------------------------------------------- */
router.use(authenticateToken);

// Entitlements
router.get('/me/entitlements', async (req, res) => {
  try {
    const clubId = req.club_id;
    
    if (!clubId) {
      console.error('[API] ❌ Missing club_id in request');
      return res.status(401).json({ 
        error: 'Authentication required',
        details: 'club_id not found in request'
      });
    }
    
    console.log(`[API] 👤 Resolved club ID: "${clubId}"`);
    
    try {
      const ents = await resolveEntitlements({ userId: clubId });
      return res.json(ents);
    } catch (entError) {
      console.error('[API] ❌ resolveEntitlements error:', entError);
      console.error('[API] ❌ Error stack:', entError.stack);
      return res.status(500).json({ 
        error: 'Failed to resolve entitlements',
        ...(process.env.NODE_ENV !== 'production' && { 
          details: entError.message,
          stack: entError.stack 
        })
      });
    }
  } catch (error) {
    console.error('[API] ❌ Entitlements endpoint error:', error);
    console.error('[API] ❌ Error stack:', error.stack);
    
    if (!res.headersSent) {
      return res.status(500).json({ 
        error: 'Internal server error',
        ...(process.env.NODE_ENV !== 'production' && { 
          details: error.message,
          stack: error.stack 
        })
      });
    }
  }
});

// Standard Web2 room creation (credits, caps, etc.)
router.post('/create-room', async (req, res) => {
  const { config: setupConfig, roomId, hostId } = req.body;

  console.log('--------------------------------------');
  console.log('[API] 🟢 Received create-room request');
  console.log(`[API] 🆔 Using provided roomId=${roomId} hostId=${hostId}`);

  // Basic validation
  if (!roomId || !hostId) {
    console.error('[API] ❌ Missing roomId or hostId in request');
    return res.status(400).json({ error: 'roomId and hostId are required' });
  }

  // WEB2 PATH: entitlements + credits flow
  try {
    console.log('[API] 🌐 Using WEB2 path (entitlements & credits enforced)');

    const clubId = req.club_id;
    console.log(`[API] 👤 Resolved club ID: "${clubId}"`);

    const ents = await resolveEntitlements({ userId: clubId });

    // ── Identify the selected template (support both shapes) ────────────────
    const templateId =
      setupConfig?.templateId ||
      setupConfig?.template?.id ||
      null;

    // ── Dev-only guard for "demo-quiz" ─────────────────────────────────────
    if (templateId && !canUseTemplate(ents, templateId)) {
      return res.status(403).json({
        error: 'TEMPLATE_NOT_ALLOWED',
        reason: 'The "demo-quiz" template is available on the Dev plan only.',
        templateId,
      });
    }
    const requestedPlayers =
      setupConfig?.maxPlayers ??
      setupConfig?.playerLimit ??
      setupConfig?.expectedPlayers ??
      (ents.max_players_per_game ?? 20);

    const requestedRounds = (setupConfig?.roundDefinitions || []).length;
    const roundTypes = (setupConfig?.roundDefinitions || []).map((r) => r.roundType);

    console.log(
      `[API] 🎯 User "${clubId}" requests ${requestedPlayers} players, ${requestedRounds} rounds (${roundTypes.join(
        ', '
      )})`
    );

    const capCheck = checkCaps(ents, { requestedPlayers, requestedRounds, roundTypes });
    if (!capCheck.ok) {
      return res.status(403).json({ error: 'PLAN_NOT_ALLOWED', reason: capCheck.reason });
    }

    if ((ents.game_credits_remaining ?? 0) <= 0) {
      return res.status(402).json({ error: 'no_credits' });
    }

    const roomCaps = {
      maxPlayers: Math.min(requestedPlayers, ents.max_players_per_game ?? 20),
      maxRounds: Math.min(requestedRounds, ents.max_rounds ?? 6),
      roundTypesAllowed: ents.round_types_allowed ?? [],
      extrasAllowed: ents.extras_allowed ?? [],
    };
    setupConfig.roomCaps = roomCaps;

    // Sanitize extras against plan
    const allowedExtras = ents.extras_allowed ?? [];
    const enabledExtras = Object.entries(setupConfig?.fundraisingOptions || {})
      .filter(([, enabled]) => !!enabled)
      .map(([k]) => k);

    const disallowedExtras =
      allowedExtras === '*'
        ? []
        : enabledExtras.filter((x) => !allowedExtras.includes(x));

    if (disallowedExtras.length) {
      console.warn(`[API] 🧹 Removing disallowed extras: ${disallowedExtras.join(', ')}`);
      for (const key of disallowedExtras) {
        if (setupConfig.fundraisingOptions) setupConfig.fundraisingOptions[key] = false;
        if (setupConfig.fundraisingPrices) delete setupConfig.fundraisingPrices[key];
      }
    }

    const created = createQuizRoom(roomId, hostId, setupConfig);
    if (!created) {
      console.error('[API] ❌ Failed to create quiz room (WEB2)');
      return res.status(400).json({
        error:
          'Failed to create room (invalid config, questions missing, or room already exists)',
      });
    }

    const okCredit = await consumeCredit(clubId);
    if (!okCredit) return res.status(402).json({ error: 'no_credits' });

    console.log(`[API] ✅ Successfully created WEB2 room ${roomId}`);
    console.log('--------------------------------------');
    return res.status(200).json({ roomId, hostId, roomCaps });
  } catch (err) {
    console.error('[API] ❌ Exception creating WEB2 room:', err);
    return res.status(500).json({ error: 'internal_error' });
  }
});

export default router;




