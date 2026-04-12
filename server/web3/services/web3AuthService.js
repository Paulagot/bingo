// server/web3/services/web3AuthService.js
//
// Nonce management, signature verification (EVM + Solana), and session tokens.
//
// Nonces are stored in a simple in-memory Map with expiry.
// For a multi-instance deployment these would move to Redis — noted below.
//
// Session tokens are short-lived JWTs signed with WEB3_SESSION_SECRET.
// Add WEB3_SESSION_SECRET to your .env file.

import crypto from 'crypto';
import jwt from 'jsonwebtoken';

const SESSION_SECRET = process.env.WEB3_SESSION_SECRET ?? 'change-me-in-env';
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days
const NONCE_TTL_MS = 5 * 60 * 1000;      // 5 minutes

// ── Address normalisation ─────────────────────────────────────────────────────
// EVM addresses are case-insensitive — normalise to lowercase for comparison.
// Solana addresses are base58 and CASE-SENSITIVE — never lowercase them.

function normaliseAddress(address, chainFamily) {
  if (chainFamily === 'evm') return address.toLowerCase();
  return address; // solana, and any future chains — preserve original casing
}

// ── Nonce store ───────────────────────────────────────────────────────────────
// Map key: nonce  value: { wallet_address, chain_family, expires_at, used }
// NOTE: swap this for a Redis SET in production multi-instance environments.

const nonceStore = new Map();

// Prune expired nonces every 10 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of nonceStore.entries()) {
    if (value.expires_at < now) nonceStore.delete(key);
  }
}, 10 * 60 * 1000);

// ── Invalidated sessions store ────────────────────────────────────────────────
// Lightweight blocklist — JWT handles expiry, this handles explicit logout.
// Same note: move to Redis for multi-instance.

const invalidatedTokens = new Set();

// ── createChallenge ───────────────────────────────────────────────────────────

export async function createChallenge(walletAddress, chainFamily) {
  const nonce = crypto.randomBytes(16).toString('hex');
  const challenge = buildChallengeMessage(walletAddress, nonce);

  // Store the normalised address — EVM lowercased, Solana preserved
  const normalisedAddress = normaliseAddress(walletAddress, chainFamily);

  nonceStore.set(nonce, {
    wallet_address: normalisedAddress,
    chain_family: chainFamily,
    expires_at: Date.now() + NONCE_TTL_MS,
    used: false,
    message: challenge,
  });

  return { challenge, nonce };
}

function buildChallengeMessage(walletAddress, nonce) {
  return [
    'FundRaisely Web3 Dashboard',
    '',
    'Sign this message to verify your wallet and access your fundraiser dashboard.',
    'This does not trigger any blockchain transaction or cost any fees.',
    '',
    `Wallet: ${walletAddress}`,
    `Nonce: ${nonce}`,
    `Issued at: ${new Date().toISOString()}`,
  ].join('\n');
}

// ── verifyWalletSignature ─────────────────────────────────────────────────────

export async function verifyWalletSignature({ wallet_address, chain_family, nonce, signature }) {
  // 1. Look up nonce
  const stored = nonceStore.get(nonce);
  if (!stored) {
    return { valid: false, reason: 'Nonce not found or already used' };
  }
  if (stored.expires_at < Date.now()) {
    nonceStore.delete(nonce);
    return { valid: false, reason: 'Challenge expired. Please try again.' };
  }
  if (stored.used) {
    return { valid: false, reason: 'Nonce already used' };
  }

  // Normalise the incoming address the same way we stored it
  const normalisedIncoming = normaliseAddress(wallet_address, chain_family);
  if (stored.wallet_address !== normalisedIncoming) {
    return { valid: false, reason: 'Wallet address mismatch' };
  }

  // 2. Use the exact message that was stored at challenge time
  const message = stored.message;

  console.log('[web3AuthService] verifying signature for:', normalisedIncoming, '(', chain_family, ')');

  // 3. Verify the signature
  let signatureValid = false;
  try {
    if (chain_family === 'evm') {
      signatureValid = await verifyEvmSignature(message, signature, wallet_address);
    } else if (chain_family === 'solana') {
      signatureValid = await verifySolanaSignature(message, signature, wallet_address);
    }
  } catch (err) {
    console.error('[web3AuthService] signature verification threw:', err.message);
    return { valid: false, reason: 'Signature verification error' };
  }

  if (!signatureValid) {
    return { valid: false, reason: 'Signature does not match wallet address' };
  }

  // 4. Mark nonce as used (one-time)
  stored.used = true;

  // 5. Issue session token with the correctly normalised address
  const token = jwt.sign(
    { wallet_address: normalisedIncoming, chain_family },
    SESSION_SECRET,
    { expiresIn: SESSION_TTL_SECONDS }
  );

  return { valid: true, token };
}

// ── verifyEvmSignature ────────────────────────────────────────────────────────

async function verifyEvmSignature(message, signature, expectedAddress) {
  const { ethers } = await import('ethers');
  try {
    const recovered = ethers.verifyMessage(message, signature);
    return recovered.toLowerCase() === expectedAddress.toLowerCase();
  } catch {
    return false;
  }
}

// ── verifySolanaSignature ─────────────────────────────────────────────────────

async function verifySolanaSignature(message, signatureBase58, expectedAddress) {
  const { PublicKey } = await import('@solana/web3.js');
  const nacl = (await import('tweetnacl')).default;
  const bs58 = (await import('bs58')).default;

  try {
    const messageBytes = new TextEncoder().encode(message);
    const signatureBytes = bs58.decode(signatureBase58);
    const publicKeyBytes = new PublicKey(expectedAddress).toBytes();

    console.log('[verifySolana] signatureBytes length:', signatureBytes.length); // must be 64

    return nacl.sign.detached.verify(messageBytes, signatureBytes, publicKeyBytes);
  } catch (err) {
    console.error('[verifySolana] error:', err);
    return false;
  }
}

// ── validateSessionToken ──────────────────────────────────────────────────────

export async function validateSessionToken(token) {
  if (invalidatedTokens.has(token)) return null;
  try {
    const payload = jwt.verify(token, SESSION_SECRET);
    return { wallet_address: payload.wallet_address, chain_family: payload.chain_family };
  } catch {
    return null;
  }
}

// ── invalidateSession ─────────────────────────────────────────────────────────

export async function invalidateSession(token) {
  invalidatedTokens.add(token);
}