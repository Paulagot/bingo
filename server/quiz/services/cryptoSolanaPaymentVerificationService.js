// server/quiz/services/cryptoSolanaPaymentVerificationService.js

import { Connection, PublicKey } from '@solana/web3.js';
import { getAssociatedTokenAddress } from '@solana/spl-token';

import { connection as db, TABLE_PREFIX } from '../../config/database.js';
import { insertJoinPayment } from '../../mgtsystem/services/web3TransactionService.js';

const DEBUG = true;

/**
 * Backend Solana RPC resolution.
 *
 * Preferred envs:
 * - SOLANA_MAINNET_RPC_URL / SOLANA_DEVNET_RPC_URL for fully custom RPC URLs
 * - SOLANA_RPC_URL as a generic mainnet fallback
 * - SOLANA_ALCHEMY_KEY / ALCHEMY_KEY / VITE_ALCHEMY_KEY to build Alchemy URLs
 *
 * NOTE:
 * VITE_ALCHEMY_KEY is normally a frontend env name, but if it exists in Railway
 * for the backend service too, Node can still read it through process.env.
 */
function buildAlchemySolanaRpc(network) {
  const key =
    process.env.SOLANA_ALCHEMY_KEY ||
    process.env.ALCHEMY_KEY ||
    process.env.VITE_ALCHEMY_KEY ||
    null;

  if (!key) return null;

  if (network === 'devnet') {
    return `https://solana-devnet.g.alchemy.com/v2/${key}`;
  }

  return `https://solana-mainnet.g.alchemy.com/v2/${key}`;
}

function maskRpcUrl(url) {
  return String(url || '').replace(/\/v2\/[^/?#]+/, '/v2/***');
}

export function getSolanaRpcUrl(network) {
  const resolved = normalizeNetwork(network);

  if (resolved === 'devnet') {
    return (
      process.env.SOLANA_DEVNET_RPC_URL ||
      buildAlchemySolanaRpc('devnet') ||
      'https://api.devnet.solana.com'
    );
  }

  return (
    process.env.SOLANA_MAINNET_RPC_URL ||
    process.env.SOLANA_RPC_URL ||
    buildAlchemySolanaRpc('mainnet') ||
    'https://api.mainnet-beta.solana.com'
  );
}

if (DEBUG) {
  console.log('[CryptoSolanaVerify] RPC env check:', {
    hasSolanaMainnetRpc: !!process.env.SOLANA_MAINNET_RPC_URL,
    hasSolanaDevnetRpc: !!process.env.SOLANA_DEVNET_RPC_URL,
    hasGenericSolanaRpc: !!process.env.SOLANA_RPC_URL,
    hasSolanaAlchemyKey: !!process.env.SOLANA_ALCHEMY_KEY,
    hasAlchemyKey: !!process.env.ALCHEMY_KEY,
    hasViteAlchemyKey: !!process.env.VITE_ALCHEMY_KEY,
    resolvedMainnetRpc: maskRpcUrl(getSolanaRpcUrl('mainnet')),
    resolvedDevnetRpc: maskRpcUrl(getSolanaRpcUrl('devnet')),
  });
}

export function normalizeNetwork(value) {
  return value === 'devnet' ? 'devnet' : 'mainnet';
}

export function normalizeWallet(value) {
  return String(value || '').trim();
}

export function asNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export function parseJsonMaybe(value, fallback = null) {
  if (!value) return fallback;
  if (typeof value === 'object') return value;

  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

export function getRoomCurrencyFromConfig(config) {
  return (
    config?.currency ||
    config?.currencyCode ||
    config?.currency_type ||
    'EUR'
  );
}

export function getRoomCurrencySymbolFromConfig(config) {
  return config?.currencySymbol || config?.currency_symbol || '€';
}

export async function getRoomForCryptoPayment(roomId) {
  const [rows] = await db.execute(
    `SELECT 
       room_id,
       club_id,
       config_json,
       linked_payment_methods_json
     FROM ${TABLE_PREFIX}web2_quiz_rooms
     WHERE room_id = ?
     LIMIT 1`,
    [roomId]
  );

  return rows?.[0] || null;
}

export async function getLinkedSolanaCryptoPaymentMethod({
  roomId,
  clubId,
  clubPaymentMethodId,
}) {
  const room = await getRoomForCryptoPayment(roomId);

  if (!room) {
    throw new Error('Quiz room not found');
  }

  if (String(room.club_id) !== String(clubId)) {
    throw new Error('Room club mismatch');
  }

  const linked = parseJsonMaybe(room.linked_payment_methods_json, {});
  const linkedIds = Array.isArray(linked?.payment_method_ids)
    ? linked.payment_method_ids.map((id) => String(id))
    : [];

  if (!linkedIds.includes(String(clubPaymentMethodId))) {
    throw new Error('Payment method is not linked to this quiz room');
  }

  const [methodRows] = await db.execute(
    `SELECT 
       id,
       club_id,
       method_category,
       provider_name,
       method_label,
       method_config,
       is_enabled
     FROM ${TABLE_PREFIX}club_payment_methods
     WHERE id = ?
       AND club_id = ?
       AND is_enabled = 1
     LIMIT 1`,
    [clubPaymentMethodId, clubId]
  );

  const method = methodRows?.[0] || null;

  if (!method) {
    throw new Error('Crypto payment method not found or disabled');
  }

  if (method.method_category !== 'crypto' || method.provider_name !== 'solana_wallet') {
    throw new Error('Selected payment method is not a Solana crypto wallet');
  }

  return {
    room,
    method,
    methodConfig: parseJsonMaybe(method.method_config, {}),
  };
}

async function tryParseSystemTransferInstruction({ accountKeys, instruction }) {
  try {
    const data = Buffer.from(instruction.data);

    // SystemInstruction::Transfer layout:
    // u32 instruction enum = 2, little endian
    // u64 lamports, little endian
    if (data.length < 12) return null;

    const instructionType = data.readUInt32LE(0);
    if (instructionType !== 2) return null;

    const lamports = data.readBigUInt64LE(4);

    const fromIndex = instruction.accountKeyIndexes?.[0] ?? instruction.accounts?.[0];
    const toIndex = instruction.accountKeyIndexes?.[1] ?? instruction.accounts?.[1];

    const from = accountKeys[fromIndex]?.toBase58?.();
    const to = accountKeys[toIndex]?.toBase58?.();

    if (!from || !to) return null;

    return {
      from,
      to,
      lamports: lamports.toString(),
    };
  } catch (err) {
    if (DEBUG) {
      console.warn('[CryptoSolanaVerify] Failed to parse system transfer ix:', err.message);
    }
    return null;
  }
}

async function getTransactionWithRetry({
  conn,
  txHash,
  commitment = 'confirmed',
  maxAttempts = 8,
  delayMs = 1500,
}) {
  let lastNull = false;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const tx = await conn.getTransaction(txHash, {
        commitment,
        maxSupportedTransactionVersion: 0,
      });

      if (tx) {
        if (DEBUG) {
          console.log('[CryptoSolanaVerify] ✅ Transaction found:', {
            txHash: `${txHash.slice(0, 12)}...`,
            attempt,
            commitment,
          });
        }

        return tx;
      }

      lastNull = true;

      if (DEBUG) {
        console.log('[CryptoSolanaVerify] ⏳ Transaction not found yet, retrying:', {
          txHash: `${txHash.slice(0, 12)}...`,
          attempt,
          maxAttempts,
          commitment,
        });
      }
    } catch (err) {
      if (DEBUG) {
        console.warn('[CryptoSolanaVerify] getTransaction attempt failed:', {
          txHash: `${txHash.slice(0, 12)}...`,
          attempt,
          maxAttempts,
          message: err?.message,
        });
      }
    }

    if (attempt < maxAttempts) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  if (DEBUG && lastNull) {
    console.warn('[CryptoSolanaVerify] ❌ Transaction still not found after retries:', {
      txHash: `${txHash.slice(0, 12)}...`,
      maxAttempts,
      commitment,
    });
  }

  return null;
}

export async function verifyNativeSolTransfer({
  txHash,
  network,
  senderWallet,
  recipientWallet,
  rawAmount,
}) {
  const resolvedNetwork = normalizeNetwork(network);
  const rpcUrl = getSolanaRpcUrl(resolvedNetwork);

  if (DEBUG) {
    console.log('[CryptoSolanaVerify] Verifying native SOL transfer:', {
      txHash: `${String(txHash).slice(0, 12)}...`,
      network: resolvedNetwork,
      rpcUrl: maskRpcUrl(rpcUrl),
      senderWallet,
      recipientWallet,
      rawAmount,
    });
  }

  const conn = new Connection(rpcUrl, 'confirmed');

  const tx = await getTransactionWithRetry({
    conn,
    txHash,
    commitment: 'confirmed',
    maxAttempts: 8,
    delayMs: 1500,
  });

  if (!tx) {
    return { ok: false, error: 'Transaction not found on Solana' };
  }

  if (tx.meta?.err) {
    return { ok: false, error: 'Transaction failed on-chain' };
  }

  const sender = normalizeWallet(senderWallet);
  const recipient = normalizeWallet(recipientWallet);
  const requiredLamports = BigInt(String(rawAmount));

  const accountKeys =
    tx.transaction.message.staticAccountKeys ||
    tx.transaction.message.accountKeys ||
    [];

  for (const ix of tx.transaction.message.compiledInstructions || []) {
    const programId = accountKeys[ix.programIdIndex]?.toBase58?.();

    if (programId !== '11111111111111111111111111111111') continue;

    const parsed = await tryParseSystemTransferInstruction({
      accountKeys,
      instruction: ix,
    });

    if (!parsed) continue;

    if (DEBUG) {
      console.log('[CryptoSolanaVerify] Parsed SOL transfer ix:', {
        from: parsed.from,
        to: parsed.to,
        lamports: parsed.lamports,
        requiredLamports: requiredLamports.toString(),
      });
    }

    if (
      parsed.from === sender &&
      parsed.to === recipient &&
      BigInt(String(parsed.lamports)) >= requiredLamports
    ) {
      return { ok: true, tx };
    }
  }

  return {
    ok: false,
    error: 'Could not verify SOL transfer recipient and amount',
  };
}

export async function verifySplTokenTransfer({
  txHash,
  network,
  senderWallet,
  recipientWallet,
  tokenMint,
  rawAmount,
}) {
  const resolvedNetwork = normalizeNetwork(network);
  const rpcUrl = getSolanaRpcUrl(resolvedNetwork);

  if (DEBUG) {
    console.log('[CryptoSolanaVerify] Verifying SPL token transfer:', {
      txHash: `${String(txHash).slice(0, 12)}...`,
      network: resolvedNetwork,
      rpcUrl: maskRpcUrl(rpcUrl),
      senderWallet,
      recipientWallet,
      tokenMint,
      rawAmount,
    });
  }

  const conn = new Connection(rpcUrl, 'confirmed');

  const tx = await getTransactionWithRetry({
    conn,
    txHash,
    commitment: 'confirmed',
    maxAttempts: 8,
    delayMs: 1500,
  });

  if (!tx) {
    return { ok: false, error: 'Transaction not found on Solana' };
  }

  if (tx.meta?.err) {
    return { ok: false, error: 'Transaction failed on-chain' };
  }

  const mintPk = new PublicKey(tokenMint);
  const senderPk = new PublicKey(senderWallet);
  const recipientPk = new PublicKey(recipientWallet);

  const senderAta = await getAssociatedTokenAddress(mintPk, senderPk);
  const recipientAta = await getAssociatedTokenAddress(mintPk, recipientPk);

  const requiredRaw = BigInt(String(rawAmount));

  const preBalances = tx.meta?.preTokenBalances || [];
  const postBalances = tx.meta?.postTokenBalances || [];

  const accountKeys =
    tx.transaction.message.staticAccountKeys ||
    tx.transaction.message.accountKeys ||
    [];

  const findBalance = (balances, ata) => {
    const ataString = ata.toBase58();

    return balances.find((b) => {
      const key = accountKeys?.[b.accountIndex]?.toBase58?.();
      return key === ataString && b.mint === tokenMint;
    });
  };

  const preRecipient = findBalance(preBalances, recipientAta);
  const postRecipient = findBalance(postBalances, recipientAta);

  const preAmount = BigInt(preRecipient?.uiTokenAmount?.amount || '0');
  const postAmount = BigInt(postRecipient?.uiTokenAmount?.amount || '0');
  const delta = postAmount - preAmount;

  if (DEBUG) {
    console.log('[CryptoSolanaVerify] SPL recipient balance delta:', {
      senderAta: senderAta.toBase58(),
      recipientAta: recipientAta.toBase58(),
      preAmount: preAmount.toString(),
      postAmount: postAmount.toString(),
      delta: delta.toString(),
      requiredRaw: requiredRaw.toString(),
    });
  }

  if (delta >= requiredRaw) {
    return { ok: true, tx };
  }

  // Token account may not exist before tx, so pre balance can be absent.
  if (!preRecipient && postAmount >= requiredRaw) {
    return { ok: true, tx };
  }

  return {
    ok: false,
    error: 'Could not verify SPL token transfer recipient and amount',
  };
}

export async function verifySolanaTransfer({
  txHash,
  network,
  senderWallet,
  recipientWallet,
  tokenMint,
  rawAmount,
}) {
  if (!tokenMint) {
    return verifyNativeSolTransfer({
      txHash,
      network,
      senderWallet,
      recipientWallet,
      rawAmount,
    });
  }

  return verifySplTokenTransfer({
    txHash,
    network,
    senderWallet,
    recipientWallet,
    tokenMint,
    rawAmount,
  });
}

export async function verifyAndRecordSolanaCryptoDonation({
  roomId,
  playerId,
  playerName,
  clubPaymentMethodId,

  network = 'mainnet',
  txHash,
  senderWallet,
  recipientWallet,

  tokenCode,
  tokenMint = null,
  rawAmount,
  displayAmount,

  metadataSource = 'web2_donation_room_crypto',
  metadataJson = {},
}) {
  if (!roomId || !playerId || !playerName) {
    throw new Error('roomId, playerId and playerName are required');
  }

  if (!clubPaymentMethodId) {
    throw new Error('clubPaymentMethodId is required');
  }

  if (!txHash || !senderWallet || !recipientWallet) {
    throw new Error('txHash, senderWallet and recipientWallet are required');
  }

  if (!tokenCode || !rawAmount || Number(rawAmount) <= 0) {
    throw new Error('tokenCode and positive rawAmount are required');
  }

  const resolvedNetwork = normalizeNetwork(network);

  if (DEBUG) {
    console.log('[CryptoSolanaVerify] Starting verification:', {
      roomId,
      playerId,
      playerName,
      clubPaymentMethodId,
      network: resolvedNetwork,
      txHash: `${String(txHash).slice(0, 12)}...`,
      senderWallet,
      recipientWallet,
      tokenCode,
      tokenMint,
      rawAmount,
      displayAmount,
      rpcUrl: maskRpcUrl(getSolanaRpcUrl(resolvedNetwork)),
    });
  }

  const room = await getRoomForCryptoPayment(roomId);

  if (!room) {
    const err = new Error('Quiz room not found');
    err.statusCode = 404;
    throw err;
  }

  const config = parseJsonMaybe(room.config_json, {});
  const fundraisingMode = config?.fundraisingMode === 'donation' ? 'donation' : 'fixed_fee';

  if (fundraisingMode !== 'donation') {
    const err = new Error('Crypto donations are only enabled for donation quiz rooms');
    err.statusCode = 400;
    throw err;
  }

  const roomCurrency = getRoomCurrencyFromConfig(config);
  const roomCurrencySymbol = getRoomCurrencySymbolFromConfig(config);

  if (roomCurrency !== 'EUR') {
    const err = new Error('Crypto donations currently support EUR rooms only.');
    err.statusCode = 400;
    throw err;
  }

  const { method, methodConfig } = await getLinkedSolanaCryptoPaymentMethod({
    roomId,
    clubId: room.club_id,
    clubPaymentMethodId,
  });

  const savedWallet = normalizeWallet(methodConfig.walletAddress);

  if (!savedWallet) {
    const err = new Error('The club Solana wallet is not configured');
    err.statusCode = 400;
    throw err;
  }

  if (normalizeWallet(recipientWallet) !== savedWallet) {
    const err = new Error('Recipient wallet does not match the club payment method wallet');
    err.statusCode = 400;
    throw err;
  }

  const verified = await verifySolanaTransfer({
    txHash,
    network: resolvedNetwork,
    senderWallet,
    recipientWallet: savedWallet,
    tokenMint,
    rawAmount,
  });

  if (!verified.ok) {
    const err = new Error(verified.error || 'Solana transaction verification failed');
    err.statusCode = 400;
    throw err;
  }

  const web3Result = await insertJoinPayment({
    game_type: 'quiz',
    room_id: roomId,
    campaign_id: null,
    wallet_address: senderWallet,
    chain: 'solana',
    network: resolvedNetwork,
    tx_hash: txHash,
    fee_token: tokenCode,
    token_address: tokenMint || null,
    amount: Number(rawAmount),
    entry_fee_amount: 0,
    extras_amount: 0,
    donation_amount: Number(rawAmount),
    metadata_json: {
      source: metadataSource,
      playerId,
      playerName,
      clubPaymentMethodId,
      recipientWallet: savedWallet,
      displayAmount,
      ...metadataJson,
    },
  });

  const donationEur = asNumber(web3Result.donationEur, 0);

  if (donationEur <= 0) {
    console.warn('[CryptoSolanaVerify] ⚠️ Crypto donation converted to less than €0.01; returning €0.00', {
      roomId,
      playerId,
      txHash,
      tokenCode,
      displayAmount,
      rawAmount,
      web3TransactionId: web3Result.id,
      donationEur,
    });
  }

  if (DEBUG) {
    console.log('[CryptoSolanaVerify] ✅ Verification and web3 record complete:', {
      roomId,
      playerId,
      txHash: `${String(txHash).slice(0, 12)}...`,
      web3TransactionId: web3Result.id,
      duplicate: !!web3Result.duplicate,
      donationEur,
    });
  }

  return {
    room,
    config,
    method,
    methodConfig,
    savedWallet,
    resolvedNetwork,
    roomCurrency,
    roomCurrencySymbol,
    web3Result,
    donationEur,
    verifiedTx: verified.tx,
  };
}