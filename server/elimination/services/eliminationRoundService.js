import { generateRoundId, now, isoNow } from '../utils/eliminationHelpers.js';
import {
  ROUND_PHASE,
  TIMING,
} from '../utils/eliminationConstants.js';
import {
  setRoundState,
  getRoundState,
  markPlayerSubmitted,
  resetSubmissionFlags,
  getActivePlayers,
  recordPlayerScore,
} from './eliminationRoomManager.js';
import { generateConfig, scoreRound } from './eliminationScoringService.js';

/**
 * Create and store a new round state.
 * Called before broadcasting round intro.
 *
 * @param {string} roomId
 * @param {number} roundNumber   - 1-indexed
 * @param {string} roundType     - e.g. 'true_centre'
 * @param {number} difficulty    - scales with round number
 * @returns {Object} roundState
 */
export const createRound = (roomId, roundNumber, roundType, difficulty = 1, lastShape = null) => {
  const roundId = generateRoundId();
  const config = generateConfig(roundType, { difficulty, lastShape });

  const roundState = {
    roundId,
    roundNumber,
    roundType,
    phase: ROUND_PHASE.INTRO,
    generatedConfig: config,
    startedAt: null,
    endsAt: null,
    submissions: {},      // playerId → submission object
    results: [],          // populated after scoring
    eliminatedPlayerIds: [],
    createdAt: isoNow(),
  };

  setRoundState(roomId, roundId, roundState);
  return roundState;
};

/**
 * Transition a round from INTRO → ACTIVE.
 * Sets startedAt, endsAt, and (for stop_the_bar) the roundStartTimestamp in config.
 */
export const activateRound = (roomId, roundId) => {
  const roundState = getRoundState(roomId, roundId);
  if (!roundState) throw new Error('Round not found');

  resetSubmissionFlags(roomId);

  const startedAt = now();
  const endsAt = startedAt + roundState.generatedConfig.durationMs;

  roundState.phase = ROUND_PHASE.ACTIVE;
  roundState.startedAt = startedAt;
  roundState.endsAt = endsAt;

  // Stop the Bar needs server start time for position derivation
  if (['stop_the_bar', 'time_estimation'].includes(roundState.generatedConfig.roundType)) {
    roundState.generatedConfig.roundStartTimestamp = startedAt;
  }

  return roundState;
};

/**
 * Record a player submission.
 * The validation layer must be called before this.
 */
export const recordSubmission = (roomId, roundId, playerId, submission) => {
  const roundState = getRoundState(roomId, roundId);
  if (!roundState) throw new Error('Round not found');

  roundState.submissions[playerId] = {
    ...submission,
    submittedAt: submission.submittedAt ?? now(),
  };

  markPlayerSubmitted(roomId, playerId);
  return roundState;
};

/**
 * Close the round and score all active players.
 * Returns scored results ranked best→worst.
 *
 * @param {string} roomId
 * @param {string} roundId
 * @returns {Object[]} rankedResults
 */
export const closeAndScoreRound = (roomId, roundId) => {
  const roundState = getRoundState(roomId, roundId);
  if (!roundState) throw new Error('Round not found');

  roundState.phase = ROUND_PHASE.SCORING;

  const activePlayers = getActivePlayers(roomId);
  const activePlayerIds = activePlayers.map((p) => p.playerId);

  // Enrich config with startedAt so speed bonus can be calculated
  const configWithTiming = {
    ...roundState.generatedConfig,
    roundStartTimestamp: roundState.generatedConfig.roundStartTimestamp ?? roundState.startedAt,
  };

  const rankedResults = scoreRound(
    roundState.submissions,
    configWithTiming,
    activePlayerIds,
  );

  // Persist scores
  for (const result of rankedResults) {
    recordPlayerScore(roomId, result.playerId, roundState.roundNumber, result.score);
  }

  roundState.results = rankedResults;
  roundState.phase = ROUND_PHASE.RESULTS;

  return rankedResults;
};

/**
 * Mark a round as fully complete (after results have been broadcast).
 */
export const completeRound = (roomId, roundId) => {
  const roundState = getRoundState(roomId, roundId);
  if (roundState) roundState.phase = ROUND_PHASE.COMPLETE;
};

/**
 * Attach eliminated player IDs to the round record.
 */
export const recordRoundEliminations = (roomId, roundId, eliminatedPlayerIds) => {
  const roundState = getRoundState(roomId, roundId);
  if (roundState) roundState.eliminatedPlayerIds = eliminatedPlayerIds;
};