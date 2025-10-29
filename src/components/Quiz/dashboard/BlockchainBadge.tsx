// src/components/Quiz/BlockchainBadge.tsx
import React from 'react';
import { ExternalLink, Link as LinkIcon, Shield } from 'lucide-react';

// 🔗 import your network map + helpers
import { EVM_NETWORKS, getMetaByKey, type EvmNetworkKey } from '../../../chains/evm//config/networks'; 
// ^ adjust import path if different

type Props = {
  chain?: 'stellar' | 'evm' | 'solana';
  /** For EVM, pass the EvmNetworkKey (`'base' | 'baseSepolia' | 'polygon' | 'polygonAmoy'`) */
  network?: string;
  /** Contract / program address */
  contractAddress?: string;
  /** Deployment Tx hash (if available) */
  txHash?: string;
};

const ellipsify = (s?: string, head = 6, tail = 6) =>
  !s ? '' : s.length <= head + tail ? s : `${s.slice(0, head)}…${s.slice(-tail)}`;

function getExplorerUrls(
  chain?: 'stellar' | 'evm' | 'solana',
  network?: string,
  addr?: string,
  tx?: string
) {
  if (chain === 'stellar') {
    // Accept 'public' | 'mainnet' | 'testnet'
    const net = (network || '').toLowerCase();
    const hive = net === 'public' || net === 'mainnet' ? 'public' : 'testnet';
    return {
      addrUrl: addr ? `https://stellar.expert/explorer/${hive}/contract/${addr}` : undefined,
      txUrl: tx ? `https://stellar.expert/explorer/${hive}/tx/${tx}` : undefined,
      label: hive === 'public' ? 'Stellar' : 'Stellar (Testnet)',
    };
  }

  if (chain === 'evm') {
    const meta = getMetaByKey(network as EvmNetworkKey);
    const base = meta?.explorer || 'https://etherscan.io';
    const label = meta?.name || 'EVM';
    return {
      addrUrl: addr ? `${base}/address/${addr}` : undefined,
      txUrl: tx ? `${base}/tx/${tx}` : undefined,
      label,
    };
  }

  if (chain === 'solana') {
    const cl = (network || '').toLowerCase();
    const isMain = cl === 'mainnet' || cl === 'mainnet-beta';
    const clusterParam = isMain ? '' : '?cluster=devnet';
    return {
      addrUrl: addr ? `https://explorer.solana.com/address/${addr}${clusterParam}` : undefined,
      txUrl: tx ? `https://explorer.solana.com/tx/${tx}${clusterParam}` : undefined,
      label: isMain ? 'Solana' : 'Solana (Devnet)',
    };
  }

  return { addrUrl: undefined, txUrl: undefined, label: 'Blockchain' };
}

const BlockchainBadge: React.FC<Props> = ({ chain, network, contractAddress, txHash }) => {
  if (!chain) return null;

  const { addrUrl, txUrl, label } = getExplorerUrls(chain, network, contractAddress, txHash);

  return (
    <div className="mt-2 flex flex-wrap items-center gap-2 rounded-lg border border-purple-200 bg-purple-50 p-2 text-sm">
      <span className="inline-flex items-center gap-1 font-medium text-purple-800">
        <Shield className="h-4 w-4" />
        {label}{network && chain === 'evm' ? ` · ${EVM_NETWORKS[network as EvmNetworkKey]?.id ?? ''}` : ''}
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
        <a className="inline-flex items-center gap-1 text-purple-800 hover:underline" href={txUrl} target="_blank" rel="noreferrer">
          Tx {ellipsify(txHash)} <ExternalLink className="h-3 w-3" />
        </a>
      )}
    </div>
  );
};

export default BlockchainBadge;


