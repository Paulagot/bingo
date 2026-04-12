// src/hooks/useWeb3FundraiserAuth.ts

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  useAppKitAccount,
  useAppKitNetwork,
  useAppKit,
  useDisconnect,
  useAppKitProvider,
} from '@reown/appkit/react';
import { ConnectorController } from '@reown/appkit-controllers'; // ← new import
import { requestChallenge, verifySignature, logoutWalletSession } from '../services/web3FundraiserApi';
import bs58 from 'bs58';

const SESSION_KEY = 'web3_fundraiser_session';

export type WalletAuthStage =
  | 'idle'
  | 'connecting'
  | 'signing'
  | 'verifying'
  | 'verified'
  | 'error';

export interface WalletAuthState {
  stage: WalletAuthStage;
  walletAddress: string | null;
  chainFamily: 'evm' | 'solana' | null;
  error: string | null;
  startConnect: () => Promise<void>;
  startDisconnect: () => Promise<void>;
}

export function useWeb3FundraiserAuth(callbacks?: {
  onVerified?: (address: string) => void;
  onDisconnected?: () => void;
}): WalletAuthState {
  const [stage, setStage] = useState<WalletAuthStage>('idle');
  const [error, setError] = useState<string | null>(null);

  const userInitiatedRef = useRef(false);
  const signingAttempted = useRef(false);
  const renderCount = useRef(0);
  renderCount.current += 1;

  const callbacksRef = useRef(callbacks);
  useEffect(() => { callbacksRef.current = callbacks; }, [callbacks]);

  const { address, isConnected, status: accountStatus } = useAppKitAccount();
  const { caipNetwork } = useAppKitNetwork();
  const { open: openModal } = useAppKit();
  const { disconnect } = useDisconnect();
  const { walletProvider: evmProvider } = useAppKitProvider('eip155');
  const { walletProvider: solanaProvider } = useAppKitProvider('solana');

  const chainFamily: 'evm' | 'solana' | null = (() => {
    if (!isConnected || !address) return null;
    if (address.startsWith('0x') && address.length === 42) return 'evm';
    if (!address.startsWith('0x') && address.length >= 32) return 'solana';
    const caipId = caipNetwork?.caipNetworkId ?? '';
    if (caipId.startsWith('eip155:')) return 'evm';
    if (caipId.startsWith('solana:')) return 'solana';
    return null;
  })();

  // ── Log every render ──────────────────────────────────────────────────────
  console.log(`[FundraiserAuth] 🔄 render #${renderCount.current}`, {
    stage,
    isConnected,
    accountStatus,
    address: address ?? 'none',
    chainFamily,
    caipNetworkId: caipNetwork?.caipNetworkId ?? 'none',
    caipNetworkName: caipNetwork?.name ?? 'none',
    userInitiated: userInitiatedRef.current,
    signingAttempted: signingAttempted.current,
    hasSession: !!sessionStorage.getItem(SESSION_KEY),
    hasEvmProvider: !!(evmProvider as any),
    hasSolanaProvider: !!(solanaProvider as any),
    error,
  });

  // ── Mount ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    console.log('[FundraiserAuth] 🟢 MOUNT');
    console.log('[FundraiserAuth] isConnected at mount:', isConnected);
    console.log('[FundraiserAuth] address at mount:', address ?? 'none');
    console.log('[FundraiserAuth] chainFamily at mount:', chainFamily);

    const session = sessionStorage.getItem(SESSION_KEY);
    console.log('[FundraiserAuth] existing session found:', !!session);
    if (session) {
      console.log('[FundraiserAuth] ✅ restoring verified state from session');
      setStage('verified');
    } else {
      console.log('[FundraiserAuth] no session — staying idle, waiting for user action');
    }

    return () => console.log('[FundraiserAuth] 🔴 UNMOUNT');
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Address change ────────────────────────────────────────────────────────
  useEffect(() => {
    console.log('[FundraiserAuth] 📍 address changed:', {
      newAddress: address ?? 'none',
      wasSigningAttempted: signingAttempted.current,
    });
    signingAttempted.current = false;
  }, [address]);

  // ── Main connection effect ────────────────────────────────────────────────
  useEffect(() => {
    console.log('[FundraiserAuth] 🔌 connection effect fired:', {
      isConnected,
      address: address ?? 'none',
      chainFamily,
      userInitiated: userInitiatedRef.current,
      signingAttempted: signingAttempted.current,
      hasSession: !!sessionStorage.getItem(SESSION_KEY),
    });

    if (!userInitiatedRef.current) {
      console.log('[FundraiserAuth] ⛔ userInitiated is false — skipping (page load protection)');
      return;
    }
    if (!isConnected || !address) {
      console.log('[FundraiserAuth] ⛔ not connected or no address yet — waiting');
      return;
    }
    if (signingAttempted.current) {
      console.log('[FundraiserAuth] ⛔ signing already attempted — skipping');
      return;
    }

    const session = sessionStorage.getItem(SESSION_KEY);
    if (session) {
      console.log('[FundraiserAuth] ✅ session exists — setting verified');
      setStage('verified');
      return;
    }

    if (!chainFamily) {
      console.log('[FundraiserAuth] ⛔ chainFamily null — waiting', {
        caipNetworkId: caipNetwork?.caipNetworkId ?? 'none',
        addressStartsWith0x: address?.startsWith('0x'),
        addressLength: address?.length,
      });
      return;
    }

    console.log('[FundraiserAuth] ✅ starting sign flow:', { address, chainFamily });
    signingAttempted.current = true;
    runSignFlow(address, chainFamily);
  }, [isConnected, address, chainFamily]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── External disconnect ───────────────────────────────────────────────────
  useEffect(() => {
    console.log('[FundraiserAuth] 🔗 isConnected changed:', isConnected, '| stage:', stage);
    if (!isConnected && stage === 'verified') {
      console.log('[FundraiserAuth] 🔌 external disconnect detected — clearing session');
      handleSessionClear();
    }
  }, [isConnected]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Stuck connecting timeout ──────────────────────────────────────────────
  useEffect(() => {
    if (stage !== 'connecting') return;
    if (isConnected) return;

    console.log('[FundraiserAuth] ⏱ starting 30s timeout for stuck connecting state');
    const timer = setTimeout(() => {
      console.log('[FundraiserAuth] ⏱ 30s timeout fired — resetting to idle');
      setStage((current) => {
        if (current === 'connecting') {
          userInitiatedRef.current = false;
          return 'idle';
        }
        return current;
      });
    }, 30000);

    return () => {
      console.log('[FundraiserAuth] ⏱ clearing connecting timeout');
      clearTimeout(timer);
    };
  }, [stage, isConnected]);

  // ── Sign flow ─────────────────────────────────────────────────────────────
  const runSignFlow = useCallback(async (
    walletAddress: string,
    family: 'evm' | 'solana'
  ) => {
    console.log('[FundraiserAuth] 🖊 runSignFlow started:', { walletAddress, family });
    console.log('[FundraiserAuth] evmProvider available:', !!(evmProvider as any));
    console.log('[FundraiserAuth] solanaProvider available:', !!(solanaProvider as any));
    if (family === 'evm') {
      console.log('[FundraiserAuth] evmProvider.request type:', typeof (evmProvider as any)?.request);
    }

    setError(null);
    setStage('signing');

    try {
      console.log('[FundraiserAuth] 📡 requesting challenge...');
      const { challenge, nonce } = await requestChallenge(walletAddress, family);
      console.log('[FundraiserAuth] ✅ challenge received, nonce:', nonce);
      console.log('[FundraiserAuth] challenge:\n', challenge);

      let signature: string;
      try {
        console.log('[FundraiserAuth] ✍️ requesting wallet signature...');
        if (family === 'evm') {
          signature = await signEvm(challenge, evmProvider);
        } else {
          signature = await signSolana(challenge, solanaProvider);
        }
        console.log('[FundraiserAuth] ✅ signature:', signature.slice(0, 20) + '...');
      } catch (signErr: any) {
        console.error('[FundraiserAuth] ❌ signature rejected:', signErr?.message);
        setStage('idle');
        signingAttempted.current = false;
        userInitiatedRef.current = false;
        setError('Signature rejected. Connect your wallet to continue.');
        return;
      }

      console.log('[FundraiserAuth] 📡 verifying with server...');
      setStage('verifying');
      const { token } = await verifySignature(walletAddress, family, nonce, signature);
      console.log('[FundraiserAuth] ✅ verified — token received');

      sessionStorage.setItem(SESSION_KEY, token);
      setStage('verified');
      userInitiatedRef.current = false;
      console.log('[FundraiserAuth] 🎉 auth complete — calling onVerified');
      callbacksRef.current?.onVerified?.(walletAddress);

    } catch (err: any) {
      console.error('[FundraiserAuth] ❌ sign flow error:', err?.message);
      setStage('error');
      setError(err.message ?? 'Verification failed. Please try again.');
      signingAttempted.current = false;
      userInitiatedRef.current = false;
    }
  }, [evmProvider, solanaProvider]);

  // ── startConnect ──────────────────────────────────────────────────────────
  const startConnect = useCallback(async () => {
    console.log('[FundraiserAuth] 🖱 startConnect called:', {
      currentStage: stage,
      isConnected,
      address: address ?? 'none',
    });

    setError(null);
    setStage('connecting');
    signingAttempted.current = false;
    userInitiatedRef.current = true;

    // ← Clear AppKit's internal namespace filter so modal shows ALL wallets
    // Without this, AppKit filters to the last used namespace (e.g. solana)
    // which hides EVM wallets and their INSTALLED badges
    try {
      ConnectorController.setFilterByNamespace(undefined);
      console.log('[FundraiserAuth] ✅ cleared namespace filter');
    } catch (err) {
      console.warn('[FundraiserAuth] could not clear namespace filter:', err);
    }

    console.log('[FundraiserAuth] userInitiated = true, opening modal...');

    try {
      await openModal();
      console.log('[FundraiserAuth] ✅ openModal() resolved');
    } catch (err: any) {
      console.error('[FundraiserAuth] ❌ openModal threw:', err?.message);
      setStage('idle');
      userInitiatedRef.current = false;
      setError('Could not open wallet. Please try again.');
    }
  }, [openModal, stage, isConnected, address]);

  // ── startDisconnect ───────────────────────────────────────────────────────
  const startDisconnect = useCallback(async () => {
    console.log('[FundraiserAuth] 🔌 startDisconnect, address:', address ?? 'none');
    try {
      await disconnect();
      console.log('[FundraiserAuth] ✅ disconnect() resolved');
    } catch (err) {
      console.error('[FundraiserAuth] ❌ disconnect() threw:', err);
    }
    handleSessionClear();
  }, [disconnect, address]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── handleSessionClear ────────────────────────────────────────────────────
  const handleSessionClear = useCallback(() => {
    console.log('[FundraiserAuth] 🧹 clearing session');
    const token = sessionStorage.getItem(SESSION_KEY);
    if (token) logoutWalletSession(token).catch(() => {});
    sessionStorage.removeItem(SESSION_KEY);

    // Also clear namespace filter on disconnect so next connect starts fresh
    try {
      ConnectorController.setFilterByNamespace(undefined);
      console.log('[FundraiserAuth] ✅ cleared namespace filter on disconnect');
    } catch (err) {
      console.warn('[FundraiserAuth] could not clear namespace filter on disconnect:', err);
    }

    setStage('idle');
    setError(null);
    signingAttempted.current = false;
    userInitiatedRef.current = false;
    console.log('[FundraiserAuth] ✅ session cleared → idle');
    callbacksRef.current?.onDisconnected?.();
  }, []);

  return {
    stage,
    walletAddress: address ?? null,
    chainFamily,
    error,
    startConnect,
    startDisconnect,
  };
}

// ── Signing helpers ───────────────────────────────────────────────────────────

async function signEvm(message: string, provider: any): Promise<string> {
  console.log('[signEvm] provider exists:', !!provider);
  console.log('[signEvm] provider.request exists:', !!provider?.request);
  if (!provider?.request) throw new Error('No EVM provider available.');

  const accounts: string[] = await provider.request({ method: 'eth_requestAccounts' });
  console.log('[signEvm] accounts:', accounts);

  const signature = await provider.request({
    method: 'personal_sign',
    params: [message, accounts[0]],
  });
  console.log('[signEvm] signature length:', signature?.length);
  return signature;
}

async function signSolana(message: string, provider: any): Promise<string> {
  console.log('[signSolana] provider exists:', !!provider);
  if (!provider) throw new Error('No Solana provider available.');

  const encoded = new TextEncoder().encode(message);
  console.log('[signSolana] calling signMessage, encoded length:', encoded.length);

  const result = await provider.signMessage(encoded);
  console.log('[signSolana] result type:', typeof result);
  console.log('[signSolana] result is Uint8Array:', result instanceof Uint8Array);
  console.log('[signSolana] result keys:', result ? Object.keys(result) : 'null');

  let signatureBytes: Uint8Array;
  if (result instanceof Uint8Array) {
    signatureBytes = result;
  } else if (result?.signature instanceof Uint8Array) {
    signatureBytes = result.signature;
  } else if (Array.isArray(result)) {
    signatureBytes = new Uint8Array(result);
  } else {
    console.error('[signSolana] unexpected result format:', result);
    throw new Error('Unexpected signature format from wallet');
  }

  const encoded58 = bs58.encode(signatureBytes);
  console.log('[signSolana] encoded58 length:', encoded58.length);
  return encoded58;
}