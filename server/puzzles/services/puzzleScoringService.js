import { getEngine } from './puzzleGenerationService.js';

/**
 * Calculate the score for a validated submission.
 *
 * NOTE: this appears unused — puzzleRoutes.js's submit handler goes through
 * puzzleValidationService.validateAndScore, which does its own inline
 * validate()+score() call rather than calling this. Left in and fixed for
 * consistency (it previously called engine.score() without difficulty,
 * solutionData, or the answer payload, which would have silently produced
 * wrong scores for any engine using difficulty-scaled settings or an
 * efficiency bonus). If nothing calls this, it's a candidate for deletion —
 * worth confirming rather than assuming, in case something outside this
 * folder imports it directly.
 *
 * @param {string} puzzleType
 * @param {{ valid: boolean, errors?: string[], reason?: string }} validationResult
 * @param {{ timeTakenSeconds?: number, hintsUsed?: number, difficulty?: string, solutionData?: object, answer?: object }} options
 * @returns {PuzzleScoreResult}
 */
export function scorePuzzle(puzzleType, validationResult, options = {}) {
  const engine = getEngine(puzzleType);

  return engine.score({
    validationResult,
    difficulty: options.difficulty,
    solutionData: options.solutionData,
    submission: {
      timeTakenSeconds: options.timeTakenSeconds ?? 0,
      hintsUsed: options.hintsUsed ?? 0,
      answer: options.answer,
    },
  });
}

export default { scorePuzzle };