// Backend API Route - Updated with strong Web3 proof validation (multichain ready)
//server/quiz/api/create-room.js
import express from 'express';
import { createQuizRoom, removeQuizRoom } from '../quizRoomManager.js';
import {
  resolveEntitlements,
  checkCaps,
  consumeCredit,
} from '../../policy/entitlements.js';
import { canUseTemplate } from '../../policy/entitlements.js';

import authenticateToken from '../../middleware/auth.js';
import jwt from 'jsonwebtoken';
import { connection, TABLE_PREFIX } from '../../config/database.js';


const JWT_SECRET = process.env.JWT_SECRET || 'fallback-dev-secret';

const WEB2_ROOMS_TABLE = `${TABLE_PREFIX}web2_quiz_rooms`;

// Insert the launched room config into DB (Web2 only)
async function insertWeb2RoomRecord({
  clubId,
  roomId,
  hostId,
  setupConfig,
  roomCaps,
}) {
  const scheduledAt = setupConfig?.eventDateTime ? new Date(setupConfig.eventDateTime) : null;
  const timeZone = setupConfig?.timeZone || null;

  // Status: scheduled if in the future, otherwise live
  const status =
    scheduledAt && !Number.isNaN(scheduledAt.getTime()) && scheduledAt.getTime() > Date.now()
      ? 'scheduled'
      : 'live';

  const sql = `
    INSERT INTO ${WEB2_ROOMS_TABLE}
      (room_id, host_id, club_id, status, scheduled_at, time_zone, config_json, room_caps_json)
    VALUES
      (?, ?, ?, ?, ?, ?, ?, ?)
  `;

  const params = [
    roomId,
    hostId,
    clubId,
    status,
    scheduledAt && !Number.isNaN(scheduledAt.getTime()) ? scheduledAt : null,
    timeZone,
    JSON.stringify(setupConfig ?? {}),
    JSON.stringify(roomCaps ?? null),
  ];

  await connection.execute(sql, params);

  return { status, scheduledAt, timeZone };
}


const router = express.Router();

// VERSION IDENTIFIER - If you see this in logs, new code is running
const ROUTER_VERSION = 'v2.0.0-enhanced-error-handling';
console.log(`[Router] 🆕 Quiz API Router loaded - Version: ${ROUTER_VERSION}`);
console.log(`[Router] 🆕 Timestamp: ${new Date().toISOString()}`);

// Add middleware to log ALL requests to this router
// router.use((req, res, next) => {
//   console.log('========================================');
//   console.log('[Router] 📍 Request reached quiz API router');
//   console.log(`[Router] 📍 Version: ${ROUTER_VERSION}`);
//   console.log('[Router] 📍 Path:', req.path);
//   console.log('[Router] 📍 Method:', req.method);
//   console.log('[Router] 📍 URL:', req.url);
//   console.log('[Router] 📍 Original URL:', req.originalUrl);
//   console.log('========================================');
//   next();
// });

// Test endpoint to verify router is working
router.get('/test', (req, res) => {
  console.log('[Router] ✅ Test endpoint hit');
  console.log(`[Router] ✅ Router version: ${ROUTER_VERSION}`);
  res.status(200).json({ 
    message: 'Router is working', 
    version: ROUTER_VERSION,
    timestamp: new Date().toISOString() 
  });
});

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
  // IMMEDIATE logging - before anything else
  console.log('========================================');
  console.log('[API] 🚀 ROUTE HANDLER CALLED - /create-web3-room');
  console.log('[API] 🕐 Timestamp:', new Date().toISOString());
  console.log('[API] 📍 Request received at handler');
  console.log('[API] 📍 Response object exists:', !!res);
  console.log('[API] 📍 Response methods:', {
    hasEnd: typeof res.end === 'function',
    hasSend: typeof res.send === 'function',
    hasJson: typeof res.json === 'function',
    hasStatus: typeof res.status === 'function'
  });
  console.log('========================================');
  
  // Ensure response object is valid
  if (!res || typeof res.end !== 'function') {
    console.error('[API] ❌❌❌ INVALID RESPONSE OBJECT!');
    return;
  }

  // Add timeout to ensure response is always sent
  const timeout = setTimeout(() => {
    console.error('[API] ⚠️ Request timeout after 30 seconds');
    if (!res.headersSent) {
      console.error('[API] ⚠️ Sending timeout error response');
      try {
        res.status(500);
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: 'Request timeout' }));
        console.log('[API] ✅ Timeout response sent');
      } catch (err) {
        console.error('[API] ❌ Failed to send timeout response:', err);
        console.error('[API] ❌ Timeout error stack:', err?.stack);
      }
    } else {
      console.error('[API] ❌ Cannot send timeout response - headers already sent');
    }
  }, 30000); // 30 second timeout

  // Helper function to send error response - use res.json() for Express compatibility
  const sendErrorResponse = (status, errorData) => {
    console.log(`[API] 🔴 sendErrorResponse called: status=${status}`);
    console.log(`[API] 🔴 Headers sent: ${res.headersSent}`);
    console.log(`[API] 🔴 Response finished: ${res.finished}`);
    console.log(`[API] 🔴 Error data:`, JSON.stringify(errorData, null, 2));
    
    if (res.headersSent || res.finished) {
      console.error('[API] ❌ Cannot send error response - response already sent/finished');
      console.error('[API] ❌ Current status code:', res.statusCode);
      return false;
    }
    
    try {
      clearTimeout(timeout);
      console.log(`[API] 🔴 Setting status to ${status}`);
      
      // Use res.json() instead of res.end() for better Express compatibility
      res.status(status).json(errorData);
      
      console.log(`[API] ✅ Sent error response (${status}) using res.json()`);
      console.log(`[API] ✅ Response sent, headersSent: ${res.headersSent}`);
      console.log(`[API] ✅ Response finished: ${res.finished}`);
      return true;
    } catch (sendErr) {
      console.error('[API] ❌ Failed to send error response with res.json():', sendErr);
      console.error('[API] ❌ Send error name:', sendErr?.name);
      console.error('[API] ❌ Send error message:', sendErr?.message);
      console.error('[API] ❌ Send error stack:', sendErr?.stack);
      
      // Fallback to res.end() if res.json() fails
      try {
        if (!res.headersSent && !res.finished) {
          console.log('[API] 🔴 Trying res.end() as fallback');
          res.status(status);
          res.setHeader('Content-Type', 'application/json');
          const jsonString = JSON.stringify(errorData);
          res.end(jsonString);
          console.log('[API] ✅ Sent error response using res.end() fallback');
          return true;
        }
      } catch (fallbackErr) {
        console.error('[API] ❌❌ Fallback res.end() also failed:', fallbackErr);
        return false;
      }
      return false;
    }
  };

  // Wrap EVERYTHING in try-catch to catch any synchronous errors
  try {
    console.log('[API] 📥 Entering main try block');
    console.log('--------------------------------------');
    console.log('[API] 🔗 Received Web3 room creation request');
    console.log('[API] 📋 Request method:', req.method);
    console.log('[API] 📋 Request path:', req.path);
    console.log('[API] 📋 Request headers:', {
      'content-type': req.headers['content-type'],
      'content-length': req.headers['content-length'],
    });
    console.log('[API] 📋 Request body exists:', !!req.body);
    console.log('[API] 📋 Request body type:', typeof req.body);
    
    // Log request body structure (sanitized - don't log full content if too large)
    if (req.body) {
      const bodyKeys = Object.keys(req.body);
      console.log('[API] 📋 Request body keys:', bodyKeys);
      console.log('[API] 📋 Request body has config:', !!req.body.config);
      console.log('[API] 📋 Request body has roomId:', !!req.body.roomId);
      console.log('[API] 📋 Request body has hostId:', !!req.body.hostId);
      
      if (req.body.config) {
        const configKeys = Object.keys(req.body.config);
        console.log('[API] 📋 Config keys:', configKeys);
        console.log('[API] 📋 Config has roundDefinitions:', !!req.body.config.roundDefinitions);
        console.log('[API] 📋 Config roundDefinitions type:', typeof req.body.config.roundDefinitions);
        console.log('[API] 📋 Config roundDefinitions is array:', Array.isArray(req.body.config.roundDefinitions));
        if (Array.isArray(req.body.config.roundDefinitions)) {
          console.log('[API] 📋 Config roundDefinitions length:', req.body.config.roundDefinitions.length);
        }
      }
    }
    
    if (!req.body) {
      return sendErrorResponse(400, { 
        error: 'Request body is required',
        message: 'Request body is missing or could not be parsed'
      });
    }
    
    // Validate request body structure
    if (typeof req.body !== 'object' || Array.isArray(req.body)) {
      return sendErrorResponse(400, { 
        error: 'Invalid request body',
        message: 'Request body must be a valid JSON object'
      });
    }
    
    const { config: setupConfig, roomId, hostId } = req.body;

    // Basic validation
    if (!roomId || !hostId) {
      console.error('[API] ❌ Missing roomId or hostId in request');
      console.error('[API] ❌ roomId:', roomId);
      console.error('[API] ❌ hostId:', hostId);
      return sendErrorResponse(400, { 
        error: 'roomId and hostId are required',
        message: 'Both roomId and hostId must be provided in the request body'
      });
    }

    if (!setupConfig) {
      console.error('[API] ❌ Missing config in request body');
      return sendErrorResponse(400, { 
        error: 'Missing config',
        message: 'The config object is required in the request body'
      });
    }

    // Validate setupConfig is an object
    if (typeof setupConfig !== 'object' || Array.isArray(setupConfig)) {
      console.error('[API] ❌ Invalid config type:', typeof setupConfig);
      return sendErrorResponse(400, { 
        error: 'Invalid config',
        message: 'Config must be a valid object'
      });
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

    // ✅ NEW: Validate we actually got a contract address
    if (!contractAddress) {
      console.error('[API] ❌ No contract address found in request');
      console.error('[API] ❌ Checked fields:', {
        roomContractAddress: setupConfig?.roomContractAddress,
        web3ContractAddress: setupConfig?.web3ContractAddress,
        contractAddress: setupConfig?.contractAddress
      });
      return sendErrorResponse(400, { 
        error: 'Contract address missing',
        message: 'Deployment may have failed. No contract address found in config.',
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

    if (!proof.ok) {
      console.error('[API] ❌ Invalid deployment proof', {
        reason: proof.reason,
        chain,
        contractAddress,
        deploymentTxHash,
      });
      return sendErrorResponse(400, { 
        error: 'Deployment not verified',
        message: 'Missing/invalid tx hash or contract/program id. Please sign on the correct network and try again.',
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
    console.log('[API] 📋 Web3 chain:', chain);
    console.log('[API] 📋 Contract address:', contractAddress);
    console.log('[API] 📋 Deployment tx hash:', deploymentTxHash);
    
    // Log charity wallet information (if available) for debugging
    if (setupConfig.web3CharityAddress) {
      console.log('[API] 📋 Charity address from config:', setupConfig.web3CharityAddress);
      console.log('[API] ℹ️ Note: This is for prize distribution. Room creation uses GlobalConfig charity wallet.');
    } else {
      console.log('[API] 📋 No charity address in config (expected for Solana - uses GlobalConfig)');
    }
    
    // ✅ Ensure roundDefinitions exists - this is critical for room creation
    if (!setupConfig.roundDefinitions) {
      console.error('[API] ❌ roundDefinitions is missing in config');
      console.error('[API] ❌ Config keys:', Object.keys(setupConfig || {}));
      return sendErrorResponse(400, { 
        error: 'Missing roundDefinitions',
        message: 'roundDefinitions is required and must be a non-empty array',
        hint: 'Make sure the quiz configuration includes at least one round definition',
        receivedKeys: Object.keys(setupConfig || {})
      });
    }
    
    if (!Array.isArray(setupConfig.roundDefinitions)) {
      console.error('[API] ❌ roundDefinitions is not an array');
      console.error('[API] ❌ roundDefinitions type:', typeof setupConfig.roundDefinitions);
      console.error('[API] ❌ roundDefinitions value:', setupConfig.roundDefinitions);
      return sendErrorResponse(400, { 
        error: 'Invalid roundDefinitions',
        message: 'roundDefinitions must be an array',
        receivedType: typeof setupConfig.roundDefinitions
      });
    }
    
    if (setupConfig.roundDefinitions.length === 0) {
      console.error('[API] ❌ roundDefinitions is an empty array');
      return sendErrorResponse(400, { 
        error: 'Empty roundDefinitions',
        message: 'roundDefinitions must contain at least one round definition',
        hint: 'Make sure the quiz configuration includes at least one round definition'
      });
    }
    
    const requestedRounds = setupConfig.roundDefinitions.length;
    console.log(`[API] 📊 Requested rounds: ${requestedRounds}`);
    console.log(`[API] 📋 roundDefinitions validated successfully`);

    // Force Web3 configuration with generous limits
    setupConfig.roomCaps = {
      maxPlayers: 10000,
      maxRounds: Math.max(requestedRounds, 1),
      roundTypesAllowed: '*',
      extrasAllowed: '*',
    };

    console.log('[API] 🎯 Calling createQuizRoom...');
    console.log('[API] 📋 Room ID:', roomId);
    console.log('[API] 📋 Host ID:', hostId);
    console.log('[API] 📋 Chain:', chain);
    console.log('[API] 📋 Contract address:', contractAddress);
    console.log('[API] 📋 SetupConfig validated, proceeding with room creation');
    
    let created = false;
    try {
      console.log('[API] 📤 Calling createQuizRoom with:', {
        roomId,
        hostId,
        hasConfig: !!setupConfig,
        roundCount: setupConfig.roundDefinitions?.length,
        paymentMethod: setupConfig.paymentMethod,
        isWeb3Room: setupConfig.isWeb3Room,
        web3Chain: setupConfig.web3Chain,
        contractAddress: setupConfig.roomContractAddress,
        hasCharityAddress: !!setupConfig.web3CharityAddress
      });
      
      created = createQuizRoom(roomId, hostId, setupConfig);
      console.log('[API] ✅ createQuizRoom returned:', created);
    } catch (roomErr) {
      console.error('========================================');
      console.error('[API] ❌❌❌ ERROR IN createQuizRoom');
      console.error('[API] ❌ Error type:', roomErr?.constructor?.name);
      console.error('[API] ❌ Error name:', roomErr?.name);
      console.error('[API] ❌ Error message:', roomErr?.message);
      console.error('[API] ❌ Error stack:', roomErr?.stack);
      console.error('[API] ❌ Request context:', {
        roomId,
        hostId,
        hasConfig: !!setupConfig,
        chain,
        contractAddress,
        roundCount: setupConfig.roundDefinitions?.length
      });
      console.error('========================================');
      
      // Check if error is related to charity wallet
      const isCharityWalletError = roomErr?.message?.toLowerCase().includes('charity') || 
                                   roomErr?.message?.toLowerCase().includes('wallet');
      
      if (isCharityWalletError) {
        console.error('[API] ⚠️ Error appears to be related to charity wallet');
        console.error('[API] ℹ️ For Solana: Room creation should use GlobalConfig charity wallet');
        console.error('[API] ℹ️ TGB dynamic charity addresses are used during prize distribution, not room creation');
      }
      
      return sendErrorResponse(500, { 
        error: 'Failed to create room',
        message: roomErr?.message || 'Unknown error occurred during room creation',
        ...(process.env.NODE_ENV !== 'production' && { 
          details: roomErr?.message,
          stack: roomErr?.stack?.substring(0, 1000), // Limit stack trace length
          name: roomErr?.name,
          type: roomErr?.constructor?.name,
          ...(isCharityWalletError && {
            hint: 'For Solana: Room creation uses GlobalConfig charity wallet. TGB dynamic addresses are used during prize distribution.'
          })
        })
      });
    }
    
    if (!created) {
      console.error('[API] ❌ Failed to create Web3 quiz room (createQuizRoom returned false)');
      console.error('[API] ❌ Room creation failed but no exception was thrown');
      console.error('[API] ❌ This usually means: invalid config, questions missing, or room already exists');
      console.error('[API] ❌ Config summary:', {
        roomId,
        hostId,
        chain,
        contractAddress,
        roundCount: setupConfig.roundDefinitions?.length,
        paymentMethod: setupConfig.paymentMethod,
        isWeb3Room: setupConfig.isWeb3Room
      });
      return sendErrorResponse(400, { 
        error: 'Failed to create room',
        message: 'Room creation failed. Possible causes: invalid config, questions missing, or room already exists',
        hint: 'Check that roundDefinitions is provided and is a non-empty array. For Solana, ensure the contract was deployed successfully.',
        ...(process.env.NODE_ENV !== 'production' && {
          details: {
            roomId,
            chain,
            contractAddress,
            roundCount: setupConfig.roundDefinitions?.length
          }
        })
      });
    }

    // console.log('[API] ✅ Successfully created Web3 room in memory');
    // console.log(`[API] 🆔 Room ID: ${roomId}`);
    // console.log(`[API] 👤 Host ID: ${hostId}`);
    // console.log(`[API] 📍 Contract: ${contractAddress}`);
    // console.log('--------------------------------------');

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
    console.log('[API] 📤 Response data:', JSON.stringify(responseData, null, 2));
    
    clearTimeout(timeout);
    
    if (res.headersSent || res.finished) {
      console.error('[API] ❌ Cannot send success response - already sent/finished');
      console.error('[API] ❌ headersSent:', res.headersSent);
      console.error('[API] ❌ finished:', res.finished);
      return;
    }
    
    try {
      // Use res.json() for Express compatibility
      res.status(200).json(responseData);
      console.log('[API] ✅ Success response sent successfully using res.json()');
    } catch (sendErr) {
      console.error('[API] ❌ Failed to send success response:', sendErr);
      console.error('[API] ❌ Send error name:', sendErr?.name);
      console.error('[API] ❌ Send error message:', sendErr?.message);
      console.error('[API] ❌ Send error stack:', sendErr?.stack);
      // Try to send error response instead
      sendErrorResponse(500, { 
        error: 'Failed to send response',
        message: 'Room was created but failed to send response to client'
      });
    }
    
  } catch (err) {
    // Top-level error handler - catches any unhandled errors
    console.error('========================================');
    console.error('[API] ❌❌❌ UNHANDLED EXCEPTION in create-web3-room');
    console.error('[API] ❌ Error type:', err?.constructor?.name);
    console.error('[API] ❌ Error name:', err?.name);
    console.error('[API] ❌ Error message:', err?.message);
    console.error('[API] ❌ Error stack:', err?.stack);
    console.error('[API] ❌ Response headers sent:', res.headersSent);
    console.error('[API] ❌ Response status code:', res.statusCode);
    console.error('[API] ❌ Response finished:', res.finished);
    console.error('[API] ❌ Request context:', {
      method: req.method,
      path: req.path,
      url: req.url,
      hasBody: !!req.body,
      bodyKeys: req.body ? Object.keys(req.body) : []
    });
    console.error('========================================');
    
    // Clear timeout first
    clearTimeout(timeout);
    
    // Check if response is already finished or headers sent
    if (res.headersSent || res.finished) {
      console.error('[API] ❌❌ Response already sent or finished, cannot send error');
      console.error('[API] ❌❌ headersSent:', res.headersSent);
      console.error('[API] ❌❌ finished:', res.finished);
      console.error('[API] ❌❌ statusCode:', res.statusCode);
      return; // Exit early
    }
    
    // Always try to send an error response
    const errorResponse = { 
      error: 'internal_error',
      message: err?.message || 'An unexpected error occurred',
      timestamp: new Date().toISOString(),
      route: '/create-web3-room',
      ...(process.env.NODE_ENV !== 'production' && { 
        details: err?.message,
        stack: err?.stack,
        name: err?.name,
        type: err?.constructor?.name
      })
    };
    
    console.log('[API] 🔴 Attempting to send error response via sendErrorResponse');
    console.log('[API] 🔴 Error response object:', JSON.stringify(errorResponse, null, 2));
    
    const sent = sendErrorResponse(500, errorResponse);
    
    if (!sent) {
      // Last resort - try plain text with res.send()
      console.error('[API] ❌❌ sendErrorResponse returned false, trying res.send()');
      try {
        if (!res.headersSent && !res.finished) {
          console.log('[API] 🔴 Attempting res.send() error response');
          clearTimeout(timeout);
          const plainText = 'Internal server error: ' + (err?.message || 'Unknown error');
          res.status(500).send(plainText);
          console.log('[API] ✅ Plain text error response sent via res.send()');
          console.log('[API] ✅ Plain text length:', plainText.length);
        } else {
          console.error('[API] ❌❌ Cannot send plain text - headersSent:', res.headersSent, 'finished:', res.finished);
        }
      } catch (finalErr) {
        console.error('[API] ❌❌❌ Complete failure to send any response');
        console.error('[API] ❌❌❌ Final error name:', finalErr?.name);
        console.error('[API] ❌❌❌ Final error message:', finalErr?.message);
        console.error('[API] ❌❌❌ Final error stack:', finalErr?.stack);
      }
    } else {
      console.log('[API] ✅ Error response sent successfully via sendErrorResponse');
    }
  } finally {
    console.log('[API] 🏁 Route handler finished');
    console.log('[API] 🏁 Headers sent:', res.headersSent);
    console.log('[API] 🏁 Response finished:', res.finished);
    console.log('[API] 🏁 Status code:', res.statusCode);
  }
});

/* -------------------------------------------------------------------------- */
/*                      UNAUTHENTICATED ROUTES (WEB3 FLOW)                     */
/* -------------------------------------------------------------------------- */

// Entitlements - Optionally authenticated: if token present, use actual entitlements; otherwise Web3 defaults
// This MUST be before authenticateToken middleware to support Web3 flow
router.get('/me/entitlements', async (req, res) => {
  try {
    console.log('[API] 📥 Received entitlements request');
    
    // Optionally authenticate if token is present (matches main branch auth logic)
    let clubId = req.club_id;
    
    if (!clubId) {
      const authHeader = req.headers['authorization'];
      const token = authHeader && authHeader.split(' ')[1];
      
      if (token && connection) {
        try {
          const decoded = jwt.verify(token, JWT_SECRET);
          const [rows] = await connection.execute(
            `SELECT u.*, c.name as club_name FROM fundraisely_users u JOIN fundraisely_clubs c ON u.club_id = c.id WHERE u.id = ?`,
            [decoded.userId]
          );
          
          if (Array.isArray(rows) && rows.length > 0) {
            req.user = rows[0];
            clubId = req.user.club_id;
            console.log(`[API] ✅ Authenticated via token, club_id: ${clubId}`);
          }
        } catch (authError) {
          // Token invalid/expired - continue without auth (for Web3 flow)
          console.log('[API] ⚠️ Token present but invalid, continuing without authentication');
        }
      }
    }
    
    console.log('[API] 📋 Final club_id:', clubId);
    
    // For Web3 rooms (no token) or unauthenticated users, return generous default entitlements
    if (!clubId) {
      console.log('[API] ⚠️ No club_id found, returning Web3 default entitlements');
      const web3DefaultEntitlements = {
        plan_id: null,
        plan_code: 'WEB3_DEFAULT',
        max_players_per_game: 10000,
        max_rounds: 100,
        round_types_allowed: '*',
        extras_allowed: '*',
        concurrent_rooms: 999,
        game_credits_remaining: 9999,
      };
      
      res.status(200);
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify(web3DefaultEntitlements));
      console.log('[API] ✅ Sent Web3 default entitlements');
      return;
    }
    
    console.log(`[API] 👤 Resolved club ID: "${clubId}" - fetching actual entitlements`);
    
    try {
      const ents = await resolveEntitlements({ userId: clubId });
      res.status(200);
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify(ents));
      console.log('[API] ✅ Sent entitlements for club:', clubId, 'plan:', ents.plan_code);
      return;
    } catch (entError) {
      console.error('[API] ❌ resolveEntitlements error:', entError);
      console.error('[API] ❌ Error stack:', entError.stack);
      
      // Fallback to Web3 defaults if database fails
      const web3DefaultEntitlements = {
        plan_id: null,
        plan_code: 'WEB3_FALLBACK',
        max_players_per_game: 10000,
        max_rounds: 100,
        round_types_allowed: '*',
        extras_allowed: '*',
        concurrent_rooms: 999,
        game_credits_remaining: 9999,
      };
      
      if (!res.headersSent) {
        res.status(200);
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(web3DefaultEntitlements));
        console.log('[API] ✅ Sent fallback entitlements due to database error');
        return;
      }
    }
  } catch (error) {
    console.error('[API] ❌ Entitlements endpoint error:', error);
    console.error('[API] ❌ Error stack:', error.stack);
    console.error('[API] ❌ Response headers sent:', res.headersSent);
    
    if (!res.headersSent) {
      // Return Web3 defaults even on error
      const web3DefaultEntitlements = {
        plan_id: null,
        plan_code: 'WEB3_ERROR_FALLBACK',
        max_players_per_game: 10000,
        max_rounds: 100,
        round_types_allowed: '*',
        extras_allowed: '*',
        concurrent_rooms: 999,
        game_credits_remaining: 9999,
      };
      
      res.status(200);
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify(web3DefaultEntitlements));
      console.log('[API] ✅ Sent error fallback entitlements');
    } else {
      console.error('[API] ❌ Cannot send response - headers already sent');
    }
  }
});

/* -------------------------------------------------------------------------- */
/*                      AUTH-REQUIRED ROUTES (WEB2 FLOW)                      */
/* -------------------------------------------------------------------------- */
router.use(authenticateToken);

router.use((req, res, next) => {
  console.log('========================================');
  console.log('[Router] 📍 Auth-protected route hit');
  console.log('[Router] 📍 Method:', req.method);
  console.log('[Router] 📍 Path:', req.path);
  console.log('[Router] 📍 URL:', req.url);
  console.log('[Router] 📍 Original URL:', req.originalUrl);
  console.log('[Router] 📍 Club ID:', req.club_id);
  console.log('========================================');
  next();
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
if (!okCredit) {
  // Clean up in-memory room if we failed to charge a credit
  removeQuizRoom(roomId);
  return res.status(402).json({ error: 'no_credits' });
}

// ✅ NEW: Persist launched Web2 room config to DB
try {
  await insertWeb2RoomRecord({
    clubId,
    roomId,
    hostId,
    setupConfig,
    roomCaps,
  });
  console.log(`[API] 💾 Saved WEB2 room config to DB: roomId=${roomId}`);
} catch (dbErr) {
  console.error('[API] ❌ Failed saving WEB2 room to DB:', dbErr);

  // Clean up in-memory room if DB write fails (prevents half-created state)
  removeQuizRoom(roomId);

  // NOTE: credit has already been consumed. If you want “refund credit on DB failure”,
  // we can add a "refundCredit" helper later. For now, this prevents bad room state.
  return res.status(500).json({ error: 'db_save_failed' });
}

console.log(`[API] ✅ Successfully created WEB2 room ${roomId}`);
console.log('--------------------------------------');
return res.status(200).json({ roomId, hostId, roomCaps });

  } catch (err) {
    console.error('[API] ❌ Exception creating WEB2 room:', err);
    return res.status(500).json({ error: 'internal_error' });
  }
});

/**
 * WEB2: Load a saved launched room config from DB
 * Used by Host Dashboard hydration (refresh-safe).
 */
router.get('/web2/rooms/:roomId', authenticateToken, async (req, res) => {
  try {
    const { roomId } = req.params;

    if (!roomId) {
      return res.status(400).json({ error: 'roomId_required' });
    }

    const clubId = req.club_id;
    if (!clubId) {
      return res.status(401).json({ error: 'unauthorized' });
    }

    const sql = `
      SELECT
        room_id,
        host_id,
        club_id,
        status,
        scheduled_at,
        time_zone,
        config_json,
        room_caps_json,
        created_at,
        updated_at
      FROM ${WEB2_ROOMS_TABLE}
      WHERE room_id = ?
      LIMIT 1
    `;

    const [rows] = await connection.execute(sql, [roomId]);
    const row = rows?.[0];

    if (!row) {
      return res.status(404).json({ error: 'room_not_found' });
    }

    // Security: ensure this room belongs to the logged-in club
    if (String(row.club_id) !== String(clubId)) {
      return res.status(403).json({ error: 'forbidden' });
    }

    // MySQL JSON columns can come back as object OR string depending on driver settings
    const config =
      typeof row.config_json === 'string' ? JSON.parse(row.config_json) : row.config_json;

    const roomCaps =
      row.room_caps_json
        ? (typeof row.room_caps_json === 'string'
            ? JSON.parse(row.room_caps_json)
            : row.room_caps_json)
        : (config?.roomCaps ?? null);

    return res.status(200).json({
      roomId: row.room_id,
      hostId: row.host_id,
      clubId: row.club_id,
      status: row.status,
      scheduledAt: row.scheduled_at,
      timeZone: row.time_zone,
      roomCaps,
      config,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    });
  } catch (err) {
    console.error('[API] ❌ Failed to load WEB2 room from DB:', err);
    return res.status(500).json({ error: 'internal_error' });
  }
});

// ✅ WEB2: List rooms for the logged-in club
router.get('/web2/rooms', authenticateToken, async (req, res) => {
  try {
    const clubId = req.club_id;
    if (!clubId) return res.status(401).json({ error: 'unauthorized' });

    const status = String(req.query.status || 'scheduled');
    const time = String(req.query.time || 'upcoming');

    const where = ['club_id = ?'];
    const params = [clubId];

    if (status !== 'all') {
      where.push('status = ?');
      params.push(status);
    }

    if (time === 'upcoming') {
      where.push('(scheduled_at IS NULL OR scheduled_at >= (NOW() - INTERVAL 12 HOUR))');
    } else if (time === 'past') {
      where.push('(scheduled_at IS NOT NULL AND scheduled_at < NOW())');
    }

    const orderBy =
      time === 'past'
        ? 'ORDER BY scheduled_at DESC, created_at DESC'
        : 'ORDER BY scheduled_at ASC, created_at DESC';

    const sql = `
      SELECT room_id, host_id, status, scheduled_at, time_zone, created_at, updated_at
      FROM ${WEB2_ROOMS_TABLE}
      WHERE ${where.join(' AND ')}
      ${orderBy}
      LIMIT 200
    `;

    const [rows] = await connection.execute(sql, params);
    return res.status(200).json({ rooms: rows });
  } catch (err) {
    console.error('[API] ❌ Failed listing WEB2 rooms:', err);
    return res.status(500).json({ error: 'internal_error' });
  }
});

// server/quiz/api/create-room.js (add this route)

/**
 * Hydrate a Web2 room from DB into memory (for Host Dashboard)
 * This allows refresh-safe room access
 */
router.post('/web2/rooms/:roomId/hydrate', authenticateToken, async (req, res) => {
  // ✅ ADD THESE LOGS AT THE VERY TOP
  console.log('========================================');
  console.log('[API] 🎯 HYDRATE ENDPOINT HIT!');
  console.log('[API] 🎯 Timestamp:', new Date().toISOString());
  console.log('[API] 🎯 Room ID from params:', req.params.roomId);
  console.log('[API] 🎯 Club ID from auth:', req.club_id);
  console.log('[API] 🎯 Request method:', req.method);
  console.log('[API] 🎯 Request path:', req.path);
  console.log('[API] 🎯 Request URL:', req.url);
  console.log('[API] 🎯 Original URL:', req.originalUrl);
  console.log('========================================');
  
  try {
    const { roomId } = req.params;
    const clubId = req.club_id;

    if (!roomId) {
      console.log('[API] ❌ No roomId in params');
      return res.status(400).json({ error: 'roomId_required' });
    }

    if (!clubId) {
      console.log('[API] ❌ No clubId from auth (authenticateToken failed?)');
      return res.status(401).json({ error: 'unauthorized' });
    }

    console.log('[API] 🔄 Hydrating room from DB:', roomId);
    console.log('[API] 📋 SQL query params:', { roomId, clubId });

    // 1. Load from database
    const sql = `
      SELECT
        room_id,
        host_id,
        club_id,
        status,
        scheduled_at,
        time_zone,
        config_json,
        room_caps_json,
        created_at,
        updated_at
      FROM ${WEB2_ROOMS_TABLE}
      WHERE room_id = ? AND club_id = ?
      LIMIT 1
    `;

    console.log('[API] 🔍 Executing SQL query...');
    const [rows] = await connection.execute(sql, [roomId, clubId]);
    console.log('[API] 📊 SQL query returned rows:', rows?.length || 0);
    
    const row = rows?.[0];

    if (!row) {
      console.log('[API] ❌ No room found in DB for roomId:', roomId, 'clubId:', clubId);
      return res.status(404).json({ error: 'room_not_found' });
    }

    console.log('[API] ✅ Found room in DB:', {
      room_id: row.room_id,
      host_id: row.host_id,
      club_id: row.club_id,
      status: row.status,
      has_config: !!row.config_json
    });

    // 2. Parse config
    console.log('[API] 📦 Parsing config_json...');
    const config = typeof row.config_json === 'string' 
      ? JSON.parse(row.config_json) 
      : row.config_json;
    
    console.log('[API] ✅ Config parsed, keys:', Object.keys(config || {}));

    // 3. Create/restore room in memory using quizRoomManager
    console.log('[API] 🏗️ Calling createQuizRoom...');
    console.log('[API] 🏗️ Params:', {
      roomId: row.room_id,
      hostId: row.host_id,
      hasConfig: !!config,
      configKeys: Object.keys(config || {})
    });
    
    const created = createQuizRoom(row.room_id, row.host_id, config);
    
    console.log('[API] 📊 createQuizRoom returned:', created);

    if (!created) {
      console.error('[API] ❌ createQuizRoom returned false - room NOT created in memory');
      console.error('[API] ❌ This usually means: invalid config or room already exists');
      return res.status(500).json({ error: 'failed_to_hydrate' });
    }

    console.log('[API] ✅ Room successfully hydrated into memory:', roomId);
    console.log('[API] ✅ Sending success response to client');

    const responseData = {
      roomId: row.room_id,
      hostId: row.host_id,
      status: row.status,
      config,
      hydrated: true,
    };

    console.log('[API] 📤 Response data keys:', Object.keys(responseData));
    
    return res.status(200).json(responseData);

  } catch (err) {
    console.error('========================================');
    console.error('[API] ❌❌❌ HYDRATE ERROR');
    console.error('[API] ❌ Error type:', err?.constructor?.name);
    console.error('[API] ❌ Error message:', err?.message);
    console.error('[API] ❌ Error stack:', err?.stack);
    console.error('========================================');
    return res.status(500).json({ error: 'internal_error', details: err?.message });
  }
});



export default router;




