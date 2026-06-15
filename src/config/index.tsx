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
import { Attribution } from 'ox/erc8021';

const DATA_SUFFIX = Attribution.toDataSuffix({
  codes: ['bc_vpqki8ri'],
});

const DEBUG = false;

// ---------------------------------------------
// 🔐 Project ID
// ---------------------------------------------
export const projectId: string = import.meta.env.VITE_PROJECT_ID;

if (!projectId || projectId.trim().length === 0) {
  throw new Error("❌ VITE_PROJECT_ID is missing in environment variables.");
}

// ---------------------------------------------
// 🧩 DApp Metadata
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
  solanaDevnet,
  solana,
  solanaTestnet,
];

// ---------------------------------------------
// ⚡ Typed RPC Transports for EVM Chains Only
// ---------------------------------------------
export type HttpTransport = ReturnType<typeof http>;
type EvmTransportMap = Record<number, HttpTransport>;

export const evmTransports: EvmTransportMap = {
  // Testnets
  [sepolia.id]: http("https://rpc.sepolia.org"),
  [baseSepolia.id]: http(
    import.meta.env.VITE_ALCHEMY_KEY
      ? `https://base-sepolia.g.alchemy.com/v2/${import.meta.env.VITE_ALCHEMY_KEY}`
      : "https://sepolia.base.org"
  ),
  [optimismSepolia.id]: http("https://sepolia.optimism.io"),
  [arbitrumSepolia.id]: http("https://sepolia-rollup.arbitrum.io/rpc"),
  [bscTestnet.id]: http("https://data-seed-prebsc-1-s1.binance.org:8545"),
  [avalancheFuji.id]: http(
    import.meta.env.VITE_ALCHEMY_KEY
      ? `https://avax-fuji.g.alchemy.com/v2/${import.meta.env.VITE_ALCHEMY_KEY}`
      : "https://api.avax-test.network/ext/bc/C/rpc"
  ),
  [seiTestnet.id]: http("https://evm-rpc-testnet.sei-apis.com"),
  [polygonAmoy.id]: http("https://rpc-amoy.polygon.technology"),

  // Mainnets
  [mainnet.id]: http("https://eth.llamarpc.com"),
  [base.id]: http(
    import.meta.env.VITE_ALCHEMY_KEY
      ? `https://base-mainnet.g.alchemy.com/v2/${import.meta.env.VITE_ALCHEMY_KEY}`
      : "https://mainnet.base.org"
  ),
  [optimism.id]: http("https://mainnet.optimism.io"),
  [arbitrum.id]: http("https://arb1.arbitrum.io/rpc"),
  [bsc.id]: http("https://bsc-dataseed.binance.org"),
  [avalanche.id]: http(
    import.meta.env.VITE_ALCHEMY_KEY
      ? `https://avax-mainnet.g.alchemy.com/v2/${import.meta.env.VITE_ALCHEMY_KEY}`
      : "https://api.avax.network/ext/bc/C/rpc"
  ),
  [sei.id]: http("https://evm-rpc.sei-apis.com"),
  [polygon.id]: http("https://polygon-rpc.com"),
};

export const solanaRpcUrls = {
  mainnet: import.meta.env.VITE_ALCHEMY_KEY
    ? `https://solana-mainnet.g.alchemy.com/v2/${import.meta.env.VITE_ALCHEMY_KEY}`
    : "https://api.mainnet-beta.solana.com",
  devnet: import.meta.env.VITE_ALCHEMY_KEY
    ? `https://solana-devnet.g.alchemy.com/v2/${import.meta.env.VITE_ALCHEMY_KEY}`
    : "https://api.devnet.solana.com",
};

// ---------------------------------------------
// 🛠️ Adapters — instantiated at module level,
//    matching the official Reown examples exactly.
//
// SolanaAdapter takes NO wallet arguments.
// Passing PhantomWalletAdapter/SolflareWalletAdapter
// via the `wallets` option causes those adapters to call
// registerWalletStandard() on construction, which triggers
// Solflare's browser extension to open ObjectMultiplex streams
// immediately — before AppKit is ready — causing
// MaxListenersExceededWarning in StrictMode.
//
// With no arguments, AppKit discovers injected wallets
// (Phantom, Solflare, Backpack etc.) automatically via
// the Wallet Standard events that the extensions fire
// themselves. The wallets still appear in the modal.
// ---------------------------------------------
export const wagmiAdapter = new WagmiAdapter({
  projectId,
  networks: networks as unknown as [AppKitNetwork, ...AppKitNetwork[]],
  transports: evmTransports,
  ssr: true,
  dataSuffix: DATA_SUFFIX,
});

export const solanaAdapter = new SolanaAdapter();

export const wagmiConfig = wagmiAdapter.wagmiConfig;

// Debug logs
if (DEBUG) {
  console.log("🔧 [config] Loaded networks:", networks.map((n) => `${n.name} (${n.id})`));
  console.log("🔧 [config] Metadata URL:", metadata.url);
}
