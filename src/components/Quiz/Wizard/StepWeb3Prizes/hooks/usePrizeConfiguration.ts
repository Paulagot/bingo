/**
 * Prize Configuration Hook
 *
 * Manages state and logic for prize configuration.
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useQuizSetupStore } from '@/components/Quiz/hooks/useQuizSetupStore';
import type { PrizeSource } from '../types';
import type { Prize } from '@/components/Quiz/types/quiz';
import { PRIZE_PLACES } from '../types';
import {
  calculateMaxPrizePool,
  calculateCharityPct,
  calculateTotalPrizeSplit,
} from '../utils/calculations';
import { getCurrentMessage } from '../utils/messages';
import {
  validatePersonalTake,
  validatePrizePool,
  validateExternalAssets,
} from '../utils/validation';

const PLATFORM_PCT = 20; // Fixed platform fee

export interface UsePrizeConfigurationReturn {
  // State
  prizeSource: PrizeSource;
  personalTake: number;
  prizePoolPct: number;
  splits: Record<number, number>;
  externalPrizes: Prize[];
  error: string;
  // Computed
  maxPrizePool: number;
  charityPct: number;
  totalPrizeSplit: number;
  currentMessage: string;
  // Actions
  setPrizeSource: (source: PrizeSource) => void;
  setPersonalTake: (value: number) => void;
  setPrizePoolPct: (value: number) => void;
  handleSplitChange: (place: number, value: number) => void;
  handleExternalPrizeChange: <K extends keyof Prize>(index: number, field: K, value: Prize[K]) => void;
  handleClearPrize: (index: number) => void;
  handleSubmit: () => string | null; // Returns error message or null if valid
  setError: (error: string) => void;
}

export function usePrizeConfiguration(
  onNext?: () => void
): UsePrizeConfigurationReturn {
  const { setupConfig, updateSetupConfig, setFlow } = useQuizSetupStore();

  // Ensure store reflects web3 flow
  useEffect(() => setFlow('web3'), [setFlow]);

  // Prize source decision
  const [prizeSource, setPrizeSource] = useState<PrizeSource>(
    setupConfig.prizeMode === 'assets' ? 'assets' : 'pool'
  );

  // Personal take (0–5%)
  const [personalTake, setPersonalTake] = useState<number>(
    setupConfig.web3PrizeSplit?.host ?? 0
  );

  // Prize pool %
  const [prizePoolPct, setPrizePoolPct] = useState<number>(
    setupConfig.web3PrizeSplit?.prizes ?? 0
  );

  // Prize pool splits per place
  const initialSplits = setupConfig.prizeSplits
    ? (Object.fromEntries(
        PRIZE_PLACES.map((p) => [p, setupConfig.prizeSplits![p] ?? 0])
      ) as Record<number, number>)
    : ({ 1: 100 } as Record<number, number>);
  const [splits, setSplits] = useState<Record<number, number>>(initialSplits);

  // External assets mode: 3 slots, 1st required
  const [externalPrizes, setExternalPrizes] = useState<Prize[]>(
    setupConfig.prizes && setupConfig.prizes.length
      ? setupConfig.prizes
          .filter((p) => PRIZE_PLACES.includes(p.place as (typeof PRIZE_PLACES)[number]))
          .sort((a, b) => a.place - b.place)
      : [
          { place: 1, description: '', tokenAddress: '', value: 0 },
          { place: 2, description: '', tokenAddress: '', value: 0 },
          { place: 3, description: '', tokenAddress: '', value: 0 },
        ]
  );

  const [error, setError] = useState('');

  // Computed values
  const maxPrizePool = useMemo(
    () => calculateMaxPrizePool(personalTake),
    [personalTake]
  );

  const charityPct = useMemo(
    () => calculateCharityPct(personalTake, prizePoolPct, prizeSource),
    [personalTake, prizePoolPct, prizeSource]
  );

  const totalPrizeSplit = useMemo(
    () => calculateTotalPrizeSplit(splits),
    [splits]
  );

  const currentMessage = useMemo(
    () =>
      getCurrentMessage(
        prizeSource,
        personalTake,
        prizePoolPct,
        charityPct,
        maxPrizePool,
        externalPrizes
      ),
    [prizeSource, personalTake, prizePoolPct, charityPct, maxPrizePool, externalPrizes]
  );

  // Handlers
  const handleSplitChange = useCallback((place: number, value: number) => {
    setSplits((prev) => ({
      ...prev,
      [place]: Number.isFinite(value) && value >= 0 ? value : 0,
    }));
  }, []);

  const handleExternalPrizeChange = useCallback(
    <K extends keyof Prize>(index: number, field: K, value: Prize[K]) => {
      setExternalPrizes((prev) => {
        const updated = [...prev];
        updated[index] = { ...updated[index], [field]: value };
        return updated;
      });
    },
    []
  );

  const handleClearPrize = useCallback((index: number) => {
    setExternalPrizes((prev) => {
      const updated = [...prev];
      updated[index] = {
        place: updated[index].place,
        description: '',
        tokenAddress: '',
        value: 0,
      };
      return updated;
    });
    setError('');
  }, []);

  const handleSubmit = useCallback((): string | null => {
    // Validate personal take
    const personalError = validatePersonalTake(personalTake);
    if (personalError) {
      setError(personalError);
      return personalError;
    }

    if (prizeSource === 'pool') {
      // Validate prize pool
      const poolError = validatePrizePool(prizePoolPct, maxPrizePool, splits);
      if (poolError) {
        setError(poolError);
        return poolError;
      }

      const sanitizedSplits = Object.fromEntries(
        PRIZE_PLACES.map((p) => [p, splits[p] ?? 0])
      ) as Record<number, number>;

      // Save for pool mode
      updateSetupConfig({
        web3PrizeSplit: {
          charity: charityPct,
          host: personalTake,
          prizes: prizePoolPct,
        },
        prizeMode: 'split',
        prizeSplits: prizePoolPct > 0 ? sanitizedSplits : undefined,
        prizes: [], // external assets not used in pool mode
      });
    } else {
      // External assets mode
      const assetsError = validateExternalAssets(externalPrizes);
      if (assetsError) {
        setError(assetsError);
        return assetsError;
      }

      const completePrizes = externalPrizes.filter(
        (p) => p.description?.trim() && p.tokenAddress?.trim() && p.value && p.value > 0
      );

      // Save for assets mode
      updateSetupConfig({
        web3PrizeSplit: {
          charity: charityPct,
          host: personalTake,
          prizes: 0,
        },
        prizeMode: 'assets',
        prizeSplits: undefined,
        prizes: completePrizes,
      });
    }

    setError('');
    onNext?.();
    return null;
  }, [
    personalTake,
    prizeSource,
    prizePoolPct,
    maxPrizePool,
    splits,
    charityPct,
    externalPrizes,
    updateSetupConfig,
    onNext,
  ]);

  return {
    prizeSource,
    personalTake,
    prizePoolPct,
    splits,
    externalPrizes,
    error,
    maxPrizePool,
    charityPct,
    totalPrizeSplit,
    currentMessage,
    setPrizeSource: useCallback(
      (source: PrizeSource) => {
        setPrizeSource(source);
        setError('');
      },
      []
    ),
    setPersonalTake: useCallback((value: number) => {
      setPersonalTake(value);
      setError('');
    }, []),
    setPrizePoolPct: useCallback((value: number) => {
      setPrizePoolPct(value);
      setError('');
    }, []),
    handleSplitChange,
    handleExternalPrizeChange,
    handleClearPrize,
    handleSubmit,
    setError,
  };
}

