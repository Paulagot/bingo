import { WagmiAdapter } from "@reown/appkit-adapter-wagmi";
import { SolanaAdapter } from "@reown/appkit-adapter-solana";
import {
  PhantomWalletAdapter,
  SolflareWalletAdapter,
 
} from "@solana/wallet-adapter-wallets";

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

// ---------------------------------------------
// 🔐 Project ID
// ---------------------------------------------
export const projectId: string = import.meta.env.VITE_PROJECT_ID;

if (!projectId || projectId.trim().length === 0) {
  throw new Error("❌ VITE_PROJECT_ID is missing in environment variables.");
}

// ---------------------------------------------
// 🧩 DApp Metadata (with proper mobile deep linking)
// ---------------------------------------------
export const metadata = {
  name: "FundRaisely Quiz",
  description: "FundRaisely Web3-powered quiz fundraising platform",
  url: typeof window !== 'undefined' 
    ? window.location.origin 
    : "https://fundraisely-staging.up.railway.app",
  icons: [
    typeof window !== 'undefined' 
      ? `${window.location.origin}/fundraisely.png` 
      : "https://fundraisely-staging.up.railway.app/fundraisely.png"
  ],
  
  // 🔥 CRITICAL for mobile deep linking
  redirect: {
    native: typeof window !== 'undefined' 
      ? window.location.origin 
      : "https://fundraisely-staging.up.railway.app",
    universal: typeof window !== 'undefined' 
      ? window.location.origin 
      : "https://fundraisely-staging.up.railway.app",
  },
  
  verifyUrl: typeof window !== 'undefined' 
    ? window.location.origin 
    : "https://fundraisely-staging.up.railway.app",
};

// ---------------------------------------------
// 🌐 Supported Networks
// ---------------------------------------------
export const networks: [AppKitNetwork, ...AppKitNetwork[]] = [
  solanaDevnet,
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
// 🛠️ Adapters
// ---------------------------------------------
export const wagmiAdapter = new WagmiAdapter({
  projectId,
  networks: networks as unknown as [AppKitNetwork, ...AppKitNetwork[]],
  transports: evmTransports,
  ssr: true,
});

export const solanaWeb3JsAdapter = new SolanaAdapter({
  registerWalletStandard: true,
  wallets: [
    new PhantomWalletAdapter(),
    new SolflareWalletAdapter(),
  ],
});

export const wagmiConfig = wagmiAdapter.wagmiConfig;

// Debug logs
console.log("🔧 [config] Loaded networks:", networks.map((n) => `${n.name} (${n.id})`));
console.log("🔧 [config] Metadata URL:", metadata.url);
console.log("🔧 [config] Redirect config:", metadata.redirect);
