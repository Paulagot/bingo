// Backend API Route - Updated with separate Web3 endpoint
import express from 'express';
import { createQuizRoom } from '../quizRoomManager.js';
import {
  resolveEntitlements,
  checkCaps,
  consumeCredit,
} from '../../policy/entitlements.js';

import authenticateToken from '../../middleware/auth.js'

const router = express.Router();

// WEB3 ENDPOINT - NO AUTHENTICATION REQUIRED
router.post('/create-web3-room', async (req, res) => {
  const { config: setupConfig, roomId, hostId } = req.body;

  console.log('--------------------------------------');
  console.log('[API] 🔗 Received Web3 room creation request');
  console.log(`[API] 🆔 Using provided roomId=${roomId} hostId=${hostId}`);
  console.log('[API] 📦 Contract details:', {
    contractAddress: setupConfig?.contractAddress,
    deploymentTxHash: setupConfig?.deploymentTxHash,
    chain: setupConfig?.web3ChainConfirmed
  });

  // Basic validation
  if (!roomId || !hostId) {
    console.error('[API] ❌ Missing roomId or hostId in request');
    return res.status(400).json({ error: 'roomId and hostId are required' });
  }

  // Validate Web3 deployment proof
  if (!setupConfig?.contractAddress || !setupConfig?.deploymentTxHash) {
    console.error('[API] ❌ Missing Web3 deployment proof');
    return res.status(400).json({ 
      error: 'Missing contract deployment data - contractAddress and deploymentTxHash required' 
    });
  }

  try {
    const requestedRounds = (setupConfig?.roundDefinitions || []).length;
    
    // Force Web3 configuration with generous limits
    setupConfig.isWeb3Room = true;
    setupConfig.paymentMethod = 'web3';
    setupConfig.roomCaps = {
      maxPlayers: setupConfig?.maxPlayers || 10000,
      maxRounds: Math.max(requestedRounds, 1),
      roundTypesAllowed: '*',
      extrasAllowed: '*',
    };

    const created = createQuizRoom(roomId, hostId, setupConfig);
    if (!created) {
      console.error('[API] ❌ Failed to create Web3 quiz room');
      return res.status(400).json({
        error: 'Failed to create room (invalid config, questions missing, or room already exists)',
      });
    }

    console.log(`[API] ✅ Successfully created Web3 room ${roomId}`);
    console.log('--------------------------------------');
    
    return res.status(200).json({ 
      roomId, 
      hostId, 
      contractAddress: setupConfig.contractAddress,
      deploymentTxHash: setupConfig.deploymentTxHash,
      roomCaps: setupConfig.roomCaps,
      verified: true
    });
  } catch (err) {
    console.error('[API] ❌ Exception creating Web3 room:', err);
    return res.status(500).json({ error: 'internal_error' });
  }
});

// Apply authentication to all other routes
router.use(authenticateToken);

// Existing authenticated routes below...
router.get('/me/entitlements', async (req, res) => {
  const clubId = req.club_id;
  console.log(`[API] 👤 Resolved club ID: "${clubId}"`);
  const ents = await resolveEntitlements({ userId: clubId });
  res.json(ents);
});

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

    const requestedPlayers =
      setupConfig?.maxPlayers ??
      setupConfig?.playerLimit ??
      setupConfig?.expectedPlayers ??
      (ents.max_players_per_game ?? 20);

    const requestedRounds = (setupConfig?.roundDefinitions || []).length;
    const roundTypes = (setupConfig?.roundDefinitions || []).map(r => r.roundType);

    console.log(`[API] 🎯 User "${clubId}" requests ${requestedPlayers} players, ${requestedRounds} rounds (${roundTypes.join(', ')})`);

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
        error: 'Failed to create room (invalid config, questions missing, or room already exists)',
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



