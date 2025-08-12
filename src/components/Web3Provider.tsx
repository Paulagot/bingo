// src/components/Web3Provider.tsx - Only load when needed
import React from 'react';
import { createAppKit } from '@reown/appkit/react';
import { WagmiProvider } from 'wagmi';
import { projectId, metadata, networks, wagmiAdapter, solanaWeb3JsAdapter } from '../config';

// Initialize AppKit only when this component loads
const modal = createAppKit({
  adapters: [wagmiAdapter, solanaWeb3JsAdapter],
  projectId,
  networks,
  metadata,
  themeMode: 'light',
  features: {
    analytics: true
  }
});

interface Web3ProviderProps {
  children: React.ReactNode;
}

export const Web3Provider: React.FC<Web3ProviderProps> = ({ children }) => {
  return (
    <WagmiProvider config={wagmiAdapter.wagmiConfig}>
      {children}
    </WagmiProvider>
  );
};