// src/components/Quiz/BlockchainBadge.tsx
import React from 'react';
import { ExternalLink, Link as LinkIcon, Shield } from 'lucide-react';

type Props = {
  chain?: 'stellar' | 'evm' | 'solana';
  network?: string; // 'testnet' | 'mainnet' etc.
  contractAddress?: string;
  txHash?: string;
};

const ellipsify = (s?: string, head = 6, tail = 6) =>
  !s ? '' : s.length <= head + tail ? s : `${s.slice(0, head)}…${s.slice(-tail)}`;

const getExplorerUrls = (chain?: string, network?: string, addr?: string, tx?: string) => {
  if (chain === 'stellar') {
    const net = network === 'mainnet' ? 'public' : 'testnet';
    return {
      addrUrl: addr ? `https://stellar.expert/explorer/${net}/contract/${addr}` : undefined,
      txUrl: tx ? `https://stellar.expert/explorer/${net}/tx/${tx}` : undefined,
    };
  }
  if (chain === 'evm') {
  const net = (network || '').toLowerCase();
  const base = net.includes('base-sepolia') || net.includes('sepolia')
    ? 'https://sepolia.basescan.org'
    : net.includes('base')
    ? 'https://basescan.org'
    : 'https://etherscan.io'; // default
  return {
    addrUrl: addr ? `${base}/address/${addr}` : undefined,
    txUrl: tx ? `${base}/tx/${tx}` : undefined,
  };
}
  if (chain === 'solana') {
    const cluster = network === 'mainnet' ? '' : '?cluster=devnet';
    return {
      addrUrl: addr ? `https://explorer.solana.com/address/${addr}${cluster}` : undefined,
      txUrl: tx ? `https://explorer.solana.com/tx/${tx}${cluster}` : undefined,
    };
  }
  return {};
};

const BlockchainBadge: React.FC<Props> = ({ chain, network, contractAddress, txHash }) => {
  if (!chain) return null;
  const { addrUrl, txUrl } = getExplorerUrls(chain, network, contractAddress, txHash);

  return (
    <div className="mt-2 flex flex-wrap items-center gap-2 rounded-lg border border-purple-200 bg-purple-50 p-2 text-sm">
      <span className="inline-flex items-center gap-1 font-medium text-purple-800">
        <Shield className="h-4 w-4" /> {chain.toUpperCase()}
        {network ? ` · ${network}` : null}
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

