// src/pages/mini-app/MiniAppHostPage.tsx
import React from 'react';
import { MiniAppProvider } from '../../context/MiniAppContext';
import { MiniAppWeb3Provider } from '../../components/MiniAppWeb3Provider';
import FundraisingQuizPage from '../FundraisingQuizPage';

export const MiniAppHostPage: React.FC = () => {
  return (
    <MiniAppProvider>
      <MiniAppWeb3Provider>
        <FundraisingQuizPage />
      </MiniAppWeb3Provider>
    </MiniAppProvider>
  );
};