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
import { solana } from '@reown/appkit/networks'; // ← add this import

let appKitCreated = false;

export function ensureAppKitCreated() {
  if (appKitCreated) return;
  appKitCreated = true;

  // ── Log 1: what does the browser see via EIP-6963 before AppKit init? ──
  console.log('[web3Init] 🔍 Checking window.ethereum before AppKit init:');
  console.log('[web3Init] window.ethereum exists:', !!(window as any).ethereum);
  console.log('[web3Init] window.ethereum.isMetaMask:', !!(window as any).ethereum?.isMetaMask);
  console.log('[web3Init] window.ethereum providers:', (window as any).ethereum?.providers?.map((p: any) => ({
    isMetaMask: p.isMetaMask,
    isBackpack: p.isBackpack,
    isCoinbaseWallet: p.isCoinbaseWallet,
  })));

  // ── Log 2: listen for EIP-6963 announcements ──
  window.addEventListener('eip6963:announceProvider', (event: any) => {
    console.log('[web3Init] 📢 EIP-6963 provider announced:', {
      name: event.detail?.info?.name,
      rdns: event.detail?.info?.rdns,
      uuid: event.detail?.info?.uuid,
    });
  });

  // ── Log 3: dispatch the request to trigger announcements ──
  console.log('[web3Init] 📡 Dispatching eip6963:requestProvider...');
  window.dispatchEvent(new Event('eip6963:requestProvider'));

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
      'c57ca95b47569778a828d19178114f4db188b89b763c899ba0be274e97267d96',
      'fd20dc426fb37566d803205b19bbc1d4096b248ac04548e3cfb6b3a38bd033aa',
      '19177a98252e07ddfc9af2083ba8e07ef627cb6103467ffebb3f8f4205fd7927',
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
   defaultNetwork: solana,// ← changed from networks[0]
  });

  // ── Log 4: what does AppKit know after init? ──
  setTimeout(() => {
    console.log('[web3Init] ⏱ 500ms after init — re-checking EIP-6963:');
    window.dispatchEvent(new Event('eip6963:requestProvider'));
    console.log('[web3Init] window.ethereum after init:', !!(window as any).ethereum);
  }, 500);
}