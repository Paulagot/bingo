import { EVM_NETWORKS, type EvmNetworkKey } from '../config/networks';

export const evmKeyToId = (key: string | null | undefined): number | null => {
  if (!key) return null;
  return (EVM_NETWORKS as any)[key]?.id ?? null;
};

export const evmIdToKey = (id: number | null | undefined): EvmNetworkKey | null => {
  if (!id) return null;
  const pair = Object.entries(EVM_NETWORKS).find(([, v]) => v.id === id);
  return (pair?.[0] as EvmNetworkKey) ?? null;
};

export const explorerFor = (key: EvmNetworkKey) => EVM_NETWORKS[key].explorer;

export const resolveEvmTarget = (opts: { setupKey?: string | null; runtimeChainId?: number | null }) => {
  // Priority: explicit setup selection → wallet's current chainId → default baseSepolia
  const { setupKey, runtimeChainId } = opts;
  let key: EvmNetworkKey | null = (setupKey as EvmNetworkKey) ?? null;

  if (!key && runtimeChainId) key = evmIdToKey(runtimeChainId);
  if (!key) key = 'baseSepolia'; // sensible default during dev

  const id = EVM_NETWORKS[key].id;
  const explorer = EVM_NETWORKS[key].explorer;

  return { key, id, explorer };
};

// simple format guards (frontend)
export const isEvmAddress = (v?: string | null) => !!v && /^0x[0-9a-fA-F]{40}$/.test(v);
export const isEvmTxHash  = (v?: string | null) => !!v && /^0x[0-9a-fA-F]{64}$/.test(v);
