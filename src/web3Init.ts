// src/web3Init.ts
import { createAppKit } from '@reown/appkit/react';
import {
  wagmiAdapter,
  solanaWeb3JsAdapter,
  projectId,
  networks,
  metadata,
  solanaRpcUrls,
} from './config';
import { baseSepolia } from '@reown/appkit/networks';

let appKitCreated = false;

// ─── Wallet browser detection ─────────────────────────────────────────────────
// Order matters: Backpack + Coinbase both spoof window.ethereum.isMetaMask = true,
// so they must be detected before the MetaMask branch.
type WalletBrowser = 'phantom' | 'backpack' | 'solflare' | 'metamask' | 'coinbase' | null;

function detectWalletBrowser(): WalletBrowser {
  const win = window as any;

  // Phantom: window.phantom.solana.isPhantom is the canonical signal
  if (win.phantom?.solana?.isPhantom) return 'phantom';

  // Backpack: check window.backpack BEFORE isMetaMask — Backpack spoofs it
  if (win.backpack?.isBackpack) return 'backpack';

  // Solflare: injects window.solflare
  if (win.solflare?.isSolflare) return 'solflare';

  // Coinbase: also spoofs isMetaMask in some versions — check before MetaMask
  if (win.ethereum?.isCoinbaseWallet) return 'coinbase';

  // MetaMask: only after ruling out all the spoofers above
  if (win.ethereum?.isMetaMask) return 'metamask';

  return null;
}

// ─── Solana silent auto-connect ───────────────────────────────────────────────
// Uses onlyIfTrusted so it only reconnects silently if the user approved before.
// Throws harmlessly if not yet approved — no popup.
async function autoConnectSolana(
  walletBrowser: 'phantom' | 'backpack' | 'solflare'
) {
  const win = window as any;

  try {
    if (walletBrowser === 'phantom') {
      const provider = win.phantom?.solana;
      if (!provider?.isPhantom) return;

      console.log('[web3Init] ⚡ Phantom silent connect...');
      const resp = await provider.connect({ onlyIfTrusted: true });
      console.log('[web3Init] ✅ Phantom:', resp.publicKey.toString());
    }

    if (walletBrowser === 'backpack') {
      const provider = win.backpack?.solana;
      if (!provider) return;

      console.log('[web3Init] ⚡ Backpack Solana silent connect...');
      await provider.connect({ onlyIfTrusted: true });
      console.log('[web3Init] ✅ Backpack Solana connected');
    }

    if (walletBrowser === 'solflare') {
      const provider = win.solflare;
      if (!provider?.isSolflare) return;

      // Solflare doesn't support onlyIfTrusted in all versions —
      // check isConnected first to avoid triggering a popup
      if (provider.isConnected) {
        console.log('[web3Init] ✅ Solflare already connected:', provider.publicKey?.toString());
        return;
      }

      console.log('[web3Init] ⚡ Solflare silent connect...');
      await provider.connect({ onlyIfTrusted: true });
      console.log('[web3Init] ✅ Solflare:', provider.publicKey?.toString());
    }
  } catch (err: any) {
    // Expected when user hasn't approved yet — not a real error
    console.log(`[web3Init] Silent Solana connect skipped (${walletBrowser}):`, err?.message);
  }
}

// ─── EVM wagmi auto-connect ───────────────────────────────────────────────────
// MetaMask uses the named EIP-6963 target for reliability.
// Backpack and Coinbase use their own targets / generic injected.
async function autoConnectViaWagmi(
  walletBrowser: 'metamask' | 'coinbase' | 'backpack'
) {
  try {
    const { connect } = await import('wagmi/actions');
    const { injected } = await import('wagmi');           // ← moved here
    const { wagmiConfig } = await import('./config');

    if (walletBrowser === 'metamask') {
      console.log('[web3Init] ⚡ MetaMask auto-connect via EIP-6963...');
      await connect(wagmiConfig, {
        connector: injected({ target: 'metaMask' }),
      });
      console.log('[web3Init] ✅ MetaMask connected');
      return;
    }

    if (walletBrowser === 'coinbase') {
      console.log('[web3Init] ⚡ Coinbase Wallet auto-connect...');
      await connect(wagmiConfig, {
        connector: injected({ target: 'coinbaseWallet' }),
      });
      console.log('[web3Init] ✅ Coinbase connected');
      return;
    }

    if (walletBrowser === 'backpack') {
      console.log('[web3Init] ⚡ Backpack EVM auto-connect...');
      await connect(wagmiConfig, { connector: injected() });
      console.log('[web3Init] ✅ Backpack EVM connected');
    }
  } catch (err: any) {
    if (!err?.message?.includes('already connected')) {
      console.warn(`[web3Init] wagmi auto-connect error (${walletBrowser}):`, err?.message);
    }
  }
}

// ─── Main export ──────────────────────────────────────────────────────────────
export function ensureAppKitCreated() {
  if (appKitCreated) return;
  appKitCreated = true;

  const walletBrowser = detectWalletBrowser();
  console.log('[web3Init] 🌐 Wallet browser detected:', walletBrowser ?? 'none (standard browser)');

  // ── EIP-6963: register listener BEFORE dispatching request ────────────────
  // AppKit must be listening before we fire the event, otherwise announcements
  // from already-injected wallets are lost.
  window.addEventListener('eip6963:announceProvider', (event: any) => {
    console.log('[web3Init] 📢 EIP-6963 announced:', {
      name: event.detail?.info?.name,
      rdns: event.detail?.info?.rdns,
    });
  });

  // ── Create AppKit ──────────────────────────────────────────────────────────
  createAppKit({
    adapters: [wagmiAdapter, solanaWeb3JsAdapter],
    projectId,
    networks,
    metadata,

    customRpcUrls: {
      'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp': [{ url: solanaRpcUrls.mainnet }],
      'solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1': [{ url: solanaRpcUrls.devnet }],
      'solana:4uhcVJyU9pJkvQyS88uRDiswHXSCkY3z': [{ url: solanaRpcUrls.devnet }],
    },

    themeMode: 'dark',
    themeVariables: {
      '--w3m-z-index': 2147483647,
      '--w3m-accent': '#6366f1',
    },

    allWallets: 'SHOW',

    featuredWalletIds: [
      'c57ca95b47569778a828d19178114f4db188b89b763c899ba0be274e97267d96', // MetaMask
      'fd20dc426fb37566d803205b19bbc1d4096b248ac04548e3cfb6b3a38bd033aa', // Coinbase
      '19177a98252e07ddfc9af2083ba8e07ef627cb6103467ffebb3f8f4205fd7927', // Backpack
      '38f5d18bd8522c244bdd70cb4a68e0e718865155811c043f052fb9f1c51de662',
      'c03dfee351b6fcc421b4494ea33b9d4b92a984f87aa76d1663bb28705e95034a',
    ],

    features: {
      socials: false,
      email: false,
      emailShowWallets: false,
      analytics: false,
      swaps: false,
      onramp: false,
    },

    enableWalletConnect: true,
    enableInjected: true,
    enableEIP6963: true,
    enableCoinbase: true,
    coinbasePreference: 'all',
    defaultNetwork: baseSepolia,
  });

  // ── Dispatch EIP-6963 request NOW — AppKit is listening ───────────────────
  window.dispatchEvent(new Event('eip6963:requestProvider'));

  // ── Auto-connect if inside a wallet in-app browser ────────────────────────
  if (walletBrowser) {
    // Solana auto-connect for Phantom, Backpack, Solflare
    if (
      walletBrowser === 'phantom' ||
      walletBrowser === 'backpack' ||
      walletBrowser === 'solflare'
    ) {
      autoConnectSolana(walletBrowser);
    }

    // EVM auto-connect for MetaMask, Coinbase, Backpack (supports both)
    // Phantom is Solana-only in its in-app browser — intentionally excluded
    if (
      walletBrowser === 'metamask' ||
      walletBrowser === 'coinbase' ||
      walletBrowser === 'backpack'
    ) {
      autoConnectViaWagmi(walletBrowser);
    }
  }
}