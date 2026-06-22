// Summer Quest — Auth Utilities
// Small, shared helpers used by the auth service files. Kept separate
// from the service files themselves so each service stays short.

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { randomBytes } from 'crypto';

const SQ_JWT_SECRET = process.env.SQ_JWT_SECRET;
const SQ_JWT_EXPIRES_IN = process.env.SQ_JWT_EXPIRES_IN || '30d';

if (!SQ_JWT_SECRET) {
  // Fail loudly at boot rather than silently signing tokens with `undefined`.
  console.warn('[summer-quest] WARNING: SQ_JWT_SECRET is not set. Set it in your .env.');
}

export async function hashSecret(plain) {
  return bcrypt.hash(plain, 10);
}

export async function compareSecret(plain, hash) {
  return bcrypt.compare(plain, hash);
}

// Summer Quest JWT payloads always carry { sqRole, sqId, ...extra }.
// sqRole distinguishes 'super_admin' | 'coach_admin' | 'parent' | 'player'.
export function signSummerQuestToken(payload) {
  return jwt.sign(payload, SQ_JWT_SECRET, { expiresIn: SQ_JWT_EXPIRES_IN });
}

export function verifySummerQuestToken(token) {
  return jwt.verify(token, SQ_JWT_SECRET);
}

// Invite tokens — long, URL-safe, single use.
export function generateInviteToken() {
  return randomBytes(24).toString('hex');
}

// Player codes — short, kid-friendly. Format: 4 uppercase letters/digits,
// avoiding ambiguous characters (0/O, 1/I/L).
const PLAYER_CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

export function generatePlayerCode(length = 4) {
  let code = '';
  for (let i = 0; i < length; i++) {
    code += PLAYER_CODE_ALPHABET[Math.floor(Math.random() * PLAYER_CODE_ALPHABET.length)];
  }
  return code;
}
