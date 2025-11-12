// src/app/providers/index.tsx
// Provider composition

import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { Web3Provider } from './Web3Provider';

interface AppProvidersProps {
  children: React.ReactNode;
  enableWeb3?: boolean;
}

/**
 * Root provider composition
 * Combines all application providers in the correct order
 */
export function AppProviders({ children, enableWeb3 = false }: AppProvidersProps) {
  return (
    <BrowserRouter>
      {enableWeb3 ? (
        <Web3Provider>
          {children}
        </Web3Provider>
      ) : (
        children
      )}
    </BrowserRouter>
  );
}

