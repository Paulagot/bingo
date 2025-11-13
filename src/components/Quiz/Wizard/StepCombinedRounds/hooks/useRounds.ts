/**
 * Rounds Hook
 *
 * Manages state and logic for round configuration.
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useQuizSetupStore } from '@/components/Quiz/hooks/useQuizSetupStore';
import type { RoundDefinition, RoundTypeId } from '@/components/Quiz/types/quiz';
import { createRoundDefinition, calculateEstimatedTime, getCurrentMessage } from '../utils/roundUtils';

const MAX_ROUNDS = 8;
const MIN_ROUNDS = 1;

export interface UseRoundsReturn {
  // State
  selectedRounds: RoundDefinition[];
  showAddRounds: boolean;
  // Computed
  completedRounds: number;
  totalRounds: number;
  isComplete: boolean;
  estimatedTime: number;
  currentMessage: string;
  canAddMore: boolean;
  canRemove: boolean;
  // Actions
  addRound: (roundType: RoundTypeId) => void;
  removeRound: (index: number) => void;
  updateRoundField: (index: number, field: keyof RoundDefinition, value: any) => void;
  setShowAddRounds: (show: boolean) => void;
}

export function useRounds(): UseRoundsReturn {
  const { setupConfig, updateSetupConfig } = useQuizSetupStore();
  const [showAddRounds, setShowAddRounds] = useState(false);

  // Always read rounds from the store (single source of truth)
  const selectedRounds: RoundDefinition[] = useMemo(
    () => setupConfig.roundDefinitions ?? [],
    [setupConfig.roundDefinitions]
  );

  // Initialize defaults for custom quizzes that have no rounds yet
  useEffect(() => {
    if (setupConfig.isCustomQuiz && (!selectedRounds || selectedRounds.length === 0)) {
      const defaults: RoundDefinition[] = [
        createRoundDefinition('general_trivia', 1),
        createRoundDefinition('wipeout', 2),
        createRoundDefinition('general_trivia', 3),
      ];
      updateSetupConfig({ roundDefinitions: defaults });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setupConfig.isCustomQuiz]);

  // Actions
  const addRound = useCallback(
    (roundType: RoundTypeId) => {
      if (selectedRounds.length >= MAX_ROUNDS) return;
      const newRound = createRoundDefinition(roundType, selectedRounds.length + 1);
      const updated = [...selectedRounds, newRound].map((r, i) => ({ ...r, roundNumber: i + 1 }));
      updateSetupConfig({ roundDefinitions: updated });
      setShowAddRounds(false);
    },
    [selectedRounds, updateSetupConfig]
  );

  const removeRound = useCallback(
    (index: number) => {
      if (selectedRounds.length <= MIN_ROUNDS) return;
      const updated = selectedRounds
        .filter((_, i) => i !== index)
        .map((r, i) => ({ ...r, roundNumber: i + 1 }));
      updateSetupConfig({ roundDefinitions: updated });
    },
    [selectedRounds, updateSetupConfig]
  );

  const updateRoundField = useCallback(
    (index: number, field: keyof RoundDefinition, value: any) => {
      const updated = selectedRounds.map((r, i) =>
        i === index ? ({ ...r, [field]: value } as RoundDefinition) : r
      );
      updateSetupConfig({ roundDefinitions: updated });
    },
    [selectedRounds, updateSetupConfig]
  );

  // Computed
  const completedRounds = useMemo(
    () => selectedRounds.filter((r) => r.category && r.difficulty).length,
    [selectedRounds]
  );

  const totalRounds = selectedRounds.length;
  const isComplete = completedRounds === totalRounds && totalRounds > 0;
  const estimatedTime = useMemo(() => calculateEstimatedTime(selectedRounds), [selectedRounds]);
  const canAddMore = selectedRounds.length < MAX_ROUNDS;
  const canRemove = selectedRounds.length > MIN_ROUNDS;

  const currentMessage = useMemo(
    () =>
      getCurrentMessage(
        setupConfig.selectedTemplate,
        isComplete,
        completedRounds,
        totalRounds
      ),
    [setupConfig.selectedTemplate, isComplete, completedRounds, totalRounds]
  );

  return {
    selectedRounds,
    showAddRounds,
    completedRounds,
    totalRounds,
    isComplete,
    estimatedTime,
    currentMessage,
    canAddMore,
    canRemove,
    addRound,
    removeRound,
    updateRoundField,
    setShowAddRounds,
  };
}

