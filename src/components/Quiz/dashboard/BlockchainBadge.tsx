// src/components/Quiz/dashboard/BlockchainBadge.tsx
import React, { useMemo } from 'react';
import { ExternalLink, Link as LinkIcon, Shield } from 'lucide-react';

import { resolveEvmTarget } from '../../../chains/evm/utils/evmSelect';

type Props = {
  chain?: 'stellar' | 'evm' | 'solana';
  /**
   * For EVM: your EvmNetworkKey (e.g. 'base', 'baseSepolia', 'polygonAmoy', etc)
   * For Solana: 'mainnet' | 'mainnet-beta' | 'devnet' (or whatever you store)
   * For Stellar: 'public' | 'mainnet' | 'testnet'
   */
  network?: string;

  contractAddress?: string;
  txHash?: string;
};

const ellipsify = (s?: string, head = 6, tail = 6) =>
  !s ? '' : s.length <= head + tail ? s : `${s.slice(0, head)}…${s.slice(-tail)}`;

function safeLower(v?: string) {
  return (v ?? '').toLowerCase();
}

function getExplorerUrls(
  chain?: 'stellar' | 'evm' | 'solana',
  network?: string,
  addr?: string,
  tx?: string
) {
  if (!chain) return { addrUrl: undefined, txUrl: undefined, label: 'Blockchain' };

  if (chain === 'stellar') {
    const net = safeLower(network);
    const hive = net === 'public' || net === 'mainnet' ? 'public' : 'testnet';
    return {
      addrUrl: addr ? `https://stellar.expert/explorer/${hive}/contract/${addr}` : undefined,
      txUrl: tx ? `https://stellar.expert/explorer/${hive}/tx/${tx}` : undefined,
      label: hive === 'public' ? 'Stellar' : 'Stellar (Testnet)',
    };
  }

  if (chain === 'evm') {
    // ✅ Resolve explorer dynamically from your canonical EVM config
    let base = 'https://etherscan.io';
    let label = 'EVM';

    try {
      const resolved = resolveEvmTarget({ setupKey: network ?? null, runtimeChainId: null });
      base = resolved.explorer;
      label = resolved.key; // or use your EVM_NETWORKS[resolved.key].name if you want a prettier label
    } catch {
      // leave defaults
    }

    return {
      addrUrl: addr ? `${base}/address/${addr}` : undefined,
      txUrl: tx ? `${base}/tx/${tx}` : undefined,
      label,
    };
  }

  if (chain === 'solana') {
    const cl = safeLower(network);
    const isMain = cl === 'mainnet' || cl === 'mainnet-beta';
    const clusterParam = isMain ? '' : `?cluster=${encodeURIComponent(cl || 'devnet')}`;

    return {
      addrUrl: addr ? `https://explorer.solana.com/address/${addr}${clusterParam}` : undefined,
      txUrl: tx ? `https://explorer.solana.com/tx/${tx}${clusterParam}` : undefined,
      label: isMain ? 'Solana' : `Solana (${cl || 'devnet'})`,
    };
  }

  return { addrUrl: undefined, txUrl: undefined, label: 'Blockchain' };
}

const BlockchainBadge: React.FC<Props> = ({ chain, network, contractAddress, txHash }) => {
  if (!chain) return null;

  const { addrUrl, txUrl, label } = useMemo(
    () => getExplorerUrls(chain, network, contractAddress, txHash),
    [chain, network, contractAddress, txHash]
  );

  return (
    <div className="mt-2 flex flex-wrap items-center gap-2 rounded-lg border border-purple-200 bg-purple-50 p-2 text-sm">
      <span className="inline-flex items-center gap-1 font-medium text-purple-800">
        <Shield className="h-4 w-4" />
        {label}
      </span>

      {contractAddress && (
        <span className="inline-flex items-center gap-1 font-mono text-purple-900">
          <LinkIcon className="h-4 w-4" />
          {addrUrl ? (
            <a className="hover:underline" href={addrUrl} target="_blank" rel="noreferrer">
              {ellipsify(contractAddress)}
            </a>
          ) : (
            ellipsify(contractAddress)
          )}
        </span>
      )}

      {txHash && txUrl && (
        <a
          className="inline-flex items-center gap-1 text-purple-800 hover:underline"
          href={txUrl}
          target="_blank"
          rel="noreferrer"
        >
          Tx {ellipsify(txHash)} <ExternalLink className="h-3 w-3" />
        </a>
      )}
    </div>
  );
};

export default BlockchainBadge;



