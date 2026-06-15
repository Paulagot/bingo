// src/pages/mini-app/MiniAppHostPage.tsx
//
// Farcaster mini-app host entry point.
// Directs to the web3 quiz flow — not the web2 dashboard wizard.
// Not actively used yet; wired up when mini-app integration is ready.

import React from 'react';
import { MiniAppProvider } from '../../context/MiniAppContext';
import { MiniAppWeb3Provider } from '../../components/MiniAppWeb3Provider';
import Web3QuizPage from '../web3/quiz';

export const MiniAppHostPage: React.FC = () => {
  return (
    <MiniAppProvider>
      <MiniAppWeb3Provider>
        <Web3QuizPage />
      </MiniAppWeb3Provider>
    </MiniAppProvider>
  );
};