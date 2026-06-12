// src/web3Init.ts
//
// AppKit initialization is deferred until first needed.
// Call initAppKit() from the first component that requires
// wallet access (e.g. PaymentMethodSelector when crypto is shown,
// or Web3Provider on web3 routes).
//
// Why deferred: createAppKit() triggers wallet-standard registration
// events. Solflare's browser extension listens for these and opens
// ObjectMultiplex streams in response. In React StrictMode the
// double-mount causes duplicate streams → MaxListenersExceededWarning.
// By not calling createAppKit() on pages that don't need wallets,
// the extension never fires on those pages.
//
// In production (no StrictMode) this warning doesn't occur regardless,
// but deferring also improves cold page-load performance by removing
// AppKit's initialization cost from the critical path.

import type { AppKitNetwork } from '@reown/appkit/networks';

let initPromise: Promise<void> | null = null;

export function initAppKit(): Promise<void> {
  if (initPromise) return initPromise;

  initPromise = (async () => {
    const [
      { createAppKit },
      { solana },
      {
        wagmiAdapter,
        solanaAdapter,
        projectId,
        networks,
        metadata,
        solanaRpcUrls,
      },
    ] = await Promise.all([
      import('@reown/appkit/react'),
      import('@reown/appkit/networks'),
      import('./config'),
    ]);

    createAppKit({
      adapters: [wagmiAdapter, solanaAdapter],
      projectId,
      networks: networks as [AppKitNetwork, ...AppKitNetwork[]],
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
      defaultNetwork: solana,
    });
  })();

  return initPromise;
}