// src/hooks/useFundraisingData.ts
// UPDATED: supports donation-mode rooms and only counts paid contributions

import { useMemo } from 'react';
import { usePlayerStore } from './usePlayerStore';
import { useQuizConfig } from './useQuizConfig';

interface FundraisingData {
  totalRaised: number;
  totalEntry: number;
  totalExtras: number;
  charityAmount: number;
  prizeAmount: number;
  hostAmount: number;
  totalPlayers: number;
  playerContribution: {
    extrasUsed: number;
    extrasSpent: number;
    personalImpact: number;
    entryFee: number;
    extrasContribution: number;
    donationAmount: number; // ✅ NEW
  };
}

export const useFundraisingData = (playerId: string): FundraisingData | null => {
  const { players } = usePlayerStore();
  const { config } = useQuizConfig();

  return useMemo(() => {
    if (!players || !config) return null;

    const isDonationRoom = config.fundraisingMode === 'donation';
    const entryFee = parseFloat(config.entryFee || '0');

    const activePlayers = players.filter((p) => !p.disqualified);
    const paidPlayers = activePlayers.filter((p) => p.paid);

    let totalEntryReceived = 0;
    let totalExtrasReceived = 0;
    let totalDonationReceived = 0;

    let playerExtrasUsed = 0;
    let playerExtrasSpent = 0;
    let playerDonationAmount = 0;

    // ✅ Donation rooms: count donationAmount from paid players
    if (isDonationRoom) {
      for (const player of paidPlayers) {
        const donationAmount = Number((player as any).donationAmount || 0);
        totalDonationReceived += donationAmount;

        if (player.id === playerId) {
          playerDonationAmount = donationAmount;
        }
      }

      totalEntryReceived = totalDonationReceived;
      totalExtrasReceived = 0;
    } else {
      // ✅ Fixed-fee rooms: old behavior
      totalEntryReceived = paidPlayers.length * entryFee;

      for (const player of activePlayers) {
        if (player.paid && player.extraPayments) {
          for (const [, val] of Object.entries(player.extraPayments)) {
            const amount = Number((val as any)?.amount || 0);
            totalExtrasReceived += amount;

            if (player.id === playerId) {
              playerExtrasUsed += 1;
              playerExtrasSpent += amount;
            }
          }
        }
      }
    }

    const totalRaised = totalEntryReceived + totalExtrasReceived;

    let charityAmount = 0;
    let prizeAmount = 0;
    let hostAmount = 0;

    if (config.paymentMethod === 'web3' && config.web3PrizeSplit) {
      charityAmount = (totalRaised * config.web3PrizeSplit.charity) / 100;
      prizeAmount = (totalRaised * config.web3PrizeSplit.prizes) / 100;
      hostAmount = (totalRaised * config.web3PrizeSplit.host) / 100;
    } else {
      charityAmount = totalRaised * 1;
      hostAmount = totalRaised * 0;
      prizeAmount = 0;
    }

    const currentPlayer = players.find((p) => p.id === playerId);

    let playerPaidEntry = 0;
    let playerTotalContribution = 0;

    if (isDonationRoom) {
      playerPaidEntry = 0;
      playerTotalContribution = currentPlayer?.paid ? playerDonationAmount : 0;
    } else {
      playerPaidEntry = currentPlayer?.paid ? entryFee : 0;
      playerTotalContribution = playerPaidEntry + playerExtrasSpent;
    }

    return {
      totalRaised,
      totalEntry: totalEntryReceived,
      totalExtras: totalExtrasReceived,
      charityAmount,
      prizeAmount,
      hostAmount,
      totalPlayers: activePlayers.length,
      playerContribution: {
        extrasUsed: isDonationRoom ? 0 : playerExtrasUsed,
        extrasSpent: isDonationRoom ? 0 : playerExtrasSpent,
        personalImpact: playerTotalContribution,
        entryFee: isDonationRoom ? 0 : playerPaidEntry,
        extrasContribution: isDonationRoom ? 0 : playerExtrasSpent,
        donationAmount: isDonationRoom ? playerDonationAmount : 0,
      },
    };
  }, [players, config, playerId]);
};

export const useQuizPrizes = () => {
  const { config } = useQuizConfig();

  return useMemo(() => {
    if (!config?.prizes) return [];
    return config.prizes;
  }, [config?.prizes]);
};