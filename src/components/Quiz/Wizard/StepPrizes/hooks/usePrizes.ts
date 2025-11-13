/**
 * Prizes Hook
 *
 * Manages state and logic for prize configuration.
 */

import { useState, useCallback, useMemo } from 'react';
import { useQuizSetupStore } from '@/components/Quiz/hooks/useQuizSetupStore';
import type { Prize } from '@/components/Quiz/types/quiz';
import { getCurrentMessage } from '../utils/messages';

const MAX_PRIZES = 10;

export interface UsePrizesReturn {
  // State
  prizes: Prize[];
  error: string;
  // Computed
  hasFirstPlace: boolean;
  totalValue: number;
  canAddMore: boolean;
  currentMessage: ReturnType<typeof getCurrentMessage>;
  // Actions
  handlePrizeChange: <K extends keyof Prize>(index: number, field: K, value: Prize[K]) => void;
  handleAddPrize: () => void;
  handleRemovePrize: (index: number) => void;
  handleSubmit: (onNext: () => void) => string | null; // Returns error or null
  setError: (error: string) => void;
}

export function usePrizes(): UsePrizesReturn {
  const { setupConfig, updateSetupConfig } = useQuizSetupStore();
  const [error, setError] = useState('');

  const prizes: Prize[] = setupConfig.prizes ?? [];
  const currency = setupConfig.currencySymbol || '€';

  // Computed
  const hasFirstPlace = useMemo(
    () => prizes.some((p) => p.place === 1 && p.description?.trim()),
    [prizes]
  );

  const totalValue = useMemo(
    () => prizes.reduce((acc, p) => acc + (p.value || 0), 0),
    [prizes]
  );

  const canAddMore = prizes.length < MAX_PRIZES;
  const currentMessage = useMemo(
    () => getCurrentMessage(prizes, currency),
    [prizes, currency]
  );

  // Actions
  const commitPrizes = useCallback(
    (next: Prize[]) => {
      updateSetupConfig({ prizes: next });
    },
    [updateSetupConfig]
  );

  const handlePrizeChange = useCallback(
    <K extends keyof Prize>(index: number, field: K, value: Prize[K]) => {
      const updated = prizes.map((p, i) => (i === index ? { ...p, [field]: value } : p));
      commitPrizes(updated);
      setError('');
    },
    [prizes, commitPrizes]
  );

  const handleAddPrize = useCallback(() => {
    if (prizes.length >= MAX_PRIZES) return;
    const next: Prize = {
      place: prizes.length + 1,
      description: '',
      value: 0,
    };
    commitPrizes([...prizes, next]);
  }, [prizes, commitPrizes]);

  const handleRemovePrize = useCallback(
    (index: number) => {
      const updated = prizes
        .filter((_, i) => i !== index)
        .map((p, i) => ({ ...p, place: i + 1 }));
      commitPrizes(updated);
    },
    [prizes, commitPrizes]
  );

  const handleSubmit = useCallback(
    (onNext: () => void): string | null => {
      if (!hasFirstPlace) {
        const errorMsg = 'At least a 1st place prize (with description) is required.';
        setError(errorMsg);
        return errorMsg;
      }
      // Persist prize mode along with prizes (manual distribution)
      updateSetupConfig({ prizeMode: 'cash', prizes });
      setError('');
      onNext();
      return null;
    },
    [hasFirstPlace, prizes, updateSetupConfig]
  );

  return {
    prizes,
    error,
    hasFirstPlace,
    totalValue,
    canAddMore,
    currentMessage,
    handlePrizeChange,
    handleAddPrize,
    handleRemovePrize,
    handleSubmit,
    setError,
  };
}

