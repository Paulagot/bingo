// src/config/index.ts
import { WagmiAdapter } from "@reown/appkit-adapter-wagmi";
import { SolanaAdapter } from "@reown/appkit-adapter-solana";

import {
  sepolia,
  baseSepolia,
  optimismSepolia,
  arbitrumSepolia,
  bscTestnet,
  avalancheFuji,
  seiTestnet,
  polygonAmoy,
  mainnet,
  base,
  optimism,
  arbitrum,
  bsc,
  avalanche,
  sei,
  polygon,
  solana,
  solanaDevnet,
  solanaTestnet,
} from "@reown/appkit/networks";

import type { AppKitNetwork } from "@reown/appkit/networks";
import { http } from "wagmi";
import { 
  PhantomWalletAdapter, 
  SolflareWalletAdapter 
} from '@solana/wallet-adapter-wallets';

// ---------------------------------------------
// 🔐 Project ID
// ---------------------------------------------
export const projectId: string = import.meta.env.VITE_PROJECT_ID;

if (!projectId || projectId.trim().length === 0) {
  throw new Error("❌ VITE_PROJECT_ID is missing in environment variables.");
}

// ---------------------------------------------
// 🧩 DApp Metadata (shown in wallet modals)
// ---------------------------------------------
// Metadata with proper mobile redirect
// src/config/index.ts

// Current origin for dynamic URLs
const getOrigin = () => typeof window !== 'undefined' ? window.location.origin : "https://fundraisely-staging.up.railway.app";

// ✅ FIXED: Proper metadata with correct deep link format
export const metadata = {
  name: "FundRaisely Quiz",
  description: "FundRaisely Web3-powered quiz fundraising platform",
  url: getOrigin(),
  icons: [`${getOrigin()}/fundraisely.png`],
  
  // ✅ CRITICAL FIX: Native scheme should NOT include https://
  // It should be your app's custom scheme (without the origin)
  redirect: {
    // This is for custom app schemes (if you had a mobile app)
    // For web apps, you typically don't need this or use undefined
    native: undefined, // Remove the malformed scheme
    
    // ✅ This is what matters for mobile web browsers
    universal: getOrigin(),
  },
  
  // ✅ Verify URL for WalletConnect security
  verifyUrl: getOrigin(),
};



// ---------------------------------------------
// 🌐 Supported Networks (tuple for strict typing)
// ---------------------------------------------
export const networks: [AppKitNetwork, ...AppKitNetwork[]] = [
   solanaDevnet,     // ✅ Devnet first = default network
  solana,
  solanaTestnet,
  sepolia,
  baseSepolia,
  optimismSepolia,
  arbitrumSepolia,
  bscTestnet,
  avalancheFuji,
  seiTestnet,
  polygonAmoy,

  mainnet,
  base,
  optimism,
  arbitrum,
  bsc,
  avalanche,
  sei,
  polygon,

];

// ---------------------------------------------
// ⚡ Typed RPC Transports for EVM Chains Only
// ---------------------------------------------
export type HttpTransport = ReturnType<typeof http>;
type EvmTransportMap = Record<number, HttpTransport>;


export const evmTransports: EvmTransportMap = {
  // Testnets
  [sepolia.id]: http("https://rpc.sepolia.org"),
  [baseSepolia.id]: http("https://sepolia.base.org"),
  [optimismSepolia.id]: http("https://sepolia.optimism.io"),
  [arbitrumSepolia.id]: http("https://sepolia-rollup.arbitrum.io/rpc"),
  [bscTestnet.id]: http("https://data-seed-prebsc-1-s1.binance.org:8545"),
  [avalancheFuji.id]: http("https://api.avax-test.network/ext/bc/C/rpc"),
  [seiTestnet.id]: http("https://evm-rpc-testnet.sei-apis.com"),
  [polygonAmoy.id]: http("https://rpc-amoy.polygon.technology"),

  // Mainnets
  [mainnet.id]: http("https://eth.llamarpc.com"),
  [base.id]: http("https://mainnet.base.org"),
  [optimism.id]: http("https://mainnet.optimism.io"),
  [arbitrum.id]: http("https://arb1.arbitrum.io/rpc"),
  [bsc.id]: http("https://bsc-dataseed.binance.org"),
  [avalanche.id]: http("https://api.avax.network/ext/bc/C/rpc"),
  [sei.id]: http("https://evm-rpc.sei-apis.com"),
  [polygon.id]: http("https://polygon-rpc.com"),
};

// ---------------------------------------------
// 🛠️ Adapter: Wagmi (EVM)
// ---------------------------------------------
export const wagmiAdapter = new WagmiAdapter({
  projectId,
  networks: networks as unknown as [AppKitNetwork, ...AppKitNetwork[]],
  transports: evmTransports,
  // ✅ Add SSR support for better hydration
  ssr: typeof window === 'undefined',
})

// ---------------------------------------------
// 🛠️ Adapter: Solana (Web3.js)
// ---------------------------------------------
export const solanaWeb3JsAdapter = new SolanaAdapter({
  registerWalletStandard: true,
   wallets: [
    new PhantomWalletAdapter(),
    new SolflareWalletAdapter(),
  ],
});

// ---------------------------------------------
// 📦 Wagmi Config (used by WagmiProvider)
// ---------------------------------------------

export const wagmiConfig = wagmiAdapter.wagmiConfig;
export const config = wagmiConfig;

// Debug sanity check
console.log("🔧[config index] Loaded AppKit networks:", networks.map(n => `${n.name} (${n.id})`));
console.log("🔧 [config index] EVM transports configured:", Object.keys(evmTransports).length);
