// src/hooks/useFundraisingData.ts
// UPDATED: Include entry fee in personal impact calculation

import { useMemo } from 'react';
import { usePlayerStore } from './usePlayerStore';
import { useQuizConfig } from './useQuizConfig';

interface FundraisingData {
  totalRaised: number;
  totalEntry: number;
  totalExtras: number;
  charityAmount: number;  // For web3 only
  prizeAmount: number;    // For web3 only  
  hostAmount: number;     // For web3 only
  totalPlayers: number;
  playerContribution: {
    extrasUsed: number;
    extrasSpent: number;
    personalImpact: number;
    entryFee: number;           // NEW: Player's entry fee
    extrasContribution: number; // NEW: Renamed from extrasSpent for clarity
  };
}

export const useFundraisingData = (playerId: string): FundraisingData | null => {
  const { players } = usePlayerStore();
  const { config } = useQuizConfig();

  return useMemo(() => {
    if (!players || !config) return null;

    const entryFee = parseFloat(config.entryFee || '0');
    const activePlayers = players.filter((p) => !p.disqualified);
    const paidPlayers = activePlayers.filter((p) => p.paid);
    
    // Calculate totals using same logic as PaymentReconciliationPanel
    const totalEntryReceived = paidPlayers.length * entryFee;
    
    let totalExtrasReceived = 0;
    let playerExtrasUsed = 0;
    let playerExtrasSpent = 0;

    // Calculate extras totals and player-specific data
    for (const player of players) {
      if (player.extraPayments) {
        for (const [, val] of Object.entries(player.extraPayments)) {
          const amount = val.amount || 0;
          totalExtrasReceived += amount;
          
          // Track this player's contribution
          if (player.id === playerId) {
            playerExtrasUsed += 1;
            playerExtrasSpent += amount;
          }
        }
      }
    }

    const totalRaised = totalEntryReceived + totalExtrasReceived;
    
    // For Web3, calculate splits based on config percentages
    let charityAmount = 0;
    let prizeAmount = 0; 
    let hostAmount = 0;

    if (config.paymentMethod === 'web3' && config.web3PrizeSplit) {
      charityAmount = (totalRaised * config.web3PrizeSplit.charity) / 100;
      prizeAmount = (totalRaised * config.web3PrizeSplit.prizes) / 100;
      hostAmount = (totalRaised * config.web3PrizeSplit.host) / 100;
    } else {
      // For Web2, prizes are fixed assets, not percentage-based
      // Charity gets most, host gets small fee
      charityAmount = totalRaised * 1; // Default 85% to charity
      hostAmount = totalRaised * 0;    // Default 15% to host
      prizeAmount = 0; // Prizes are uploaded assets, not from pool
    }

    // UPDATED: Calculate player's total contribution including entry fee
    const currentPlayer = players.find(p => p.id === playerId);
    const playerPaidEntry = currentPlayer?.paid ? entryFee : 0;
    const playerTotalContribution = playerPaidEntry + playerExtrasSpent;

    return {
      totalRaised,
      totalEntry: totalEntryReceived,
      totalExtras: totalExtrasReceived,
      charityAmount,
      prizeAmount,
      hostAmount,
      totalPlayers: activePlayers.length,
      playerContribution: {
        extrasUsed: playerExtrasUsed,
        extrasSpent: playerExtrasSpent,
        personalImpact: playerTotalContribution,  // UPDATED: Now includes entry fee + extras
        entryFee: playerPaidEntry,               // NEW: Player's entry fee contribution
        extrasContribution: playerExtrasSpent,   // NEW: Clearer naming for extras only
      },
    };
  }, [players, config, playerId]);
};

// Also create a utility to get prizes correctly for both web2 and web3
export const useQuizPrizes = () => {
  const { config } = useQuizConfig();
  
  return useMemo(() => {
    if (!config?.prizes) return [];
    
    // For both web2 and web3, show the configured prizes
    // The difference is funding source, not prize display
    return config.prizes;
  }, [config?.prizes]);
};