import { getEngine } from './puzzleGenerationService.js';

/**
 * Calculate the score for a validated submission.
 *
 * @param {string} puzzleType
 * @param {{ valid: boolean, errors: string[] }} validationResult
 * @param {{ timeTakenSeconds?: number, hintsUsed?: number }} options
 * @returns {PuzzleScoreResult}
 */
export function scorePuzzle(puzzleType, validationResult, options = {}) {
  const engine = getEngine(puzzleType);
  return engine.score({
    validationResult,
    timeTakenSeconds: options.timeTakenSeconds ?? 0,
    hintsUsed: options.hintsUsed ?? 0,
  });
}

export default { scorePuzzle };