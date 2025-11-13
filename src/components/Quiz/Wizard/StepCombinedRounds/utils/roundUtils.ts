/**
 * Round Utilities
 */

import type { RoundDefinition, RoundTypeId } from '@/components/Quiz/types/quiz';
import { roundTypeDefaults } from '@/components/Quiz/constants/quiztypeconstants';
import { fundraisingExtraDefinitions } from '@/components/Quiz/constants/quizMetadata';

/**
 * Create a new round definition with defaults
 */
export function createRoundDefinition(roundType: RoundTypeId, roundNumber: number): RoundDefinition {
  const def = roundTypeDefaults[roundType];

  const validExtras = Object.entries(fundraisingExtraDefinitions)
    .filter(([_, rule]) => rule.applicableTo === 'global' || rule.applicableTo.includes(roundType))
    .reduce((acc, [key]) => {
      acc[key] = false;
      return acc;
    }, {} as Record<string, boolean>);

  return {
    roundNumber,
    roundType,
    config: {
      ...def,
      questionsPerRound: def.questionsPerRound ?? 0,
      timePerQuestion: def.timePerQuestion ?? 0,
    },
    enabledExtras: validExtras,
  };
}

/**
 * Calculate estimated time for rounds
 */
export function calculateEstimatedTime(rounds: RoundDefinition[]): number {
  return rounds.reduce((total, round) => {
    const config = round.config || {};
    let roundTime = 2.5; // overhead per round (mins)
    if ((config as any).totalTimeSeconds) roundTime += (config as any).totalTimeSeconds / 60;
    else if (config.questionsPerRound && config.timePerQuestion)
      roundTime += (config.questionsPerRound * config.timePerQuestion) / 60;
    return total + roundTime;
  }, 0);
}

/**
 * Get current status message
 */
export function getCurrentMessage(
  selectedTemplate: string | undefined,
  isComplete: boolean,
  completedRounds: number,
  totalRounds: number
): string {
  if (selectedTemplate && selectedTemplate !== 'custom') {
    if (isComplete)
      return `🎉 Perfect! Your "${selectedTemplate}" template is ready. Feel free to customize it further!`;
    return `Great choice with "${selectedTemplate}"! You can modify any rounds below or keep as-is.`;
  }
  if (totalRounds === 0) return "Let's build your custom quiz! Add rounds and configure each one.";
  if (!isComplete) return `${completedRounds} of ${totalRounds} rounds configured. Keep going!`;
  return '🎉 Perfect! All rounds configured!';
}

