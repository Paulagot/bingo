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
 */
export const createRound = (roomId, roundNumber, roundType, difficulty = 1, lastShape = null, totalRounds) => {
  const roundId = generateRoundId();
  const config = generateConfig(roundType, { difficulty, lastShape, totalRounds });

  const roundState = {
    roundId,
    roundNumber,
    roundType,
    phase: ROUND_PHASE.INTRO,
    generatedConfig: config,
    startedAt: null,
    endsAt: null,
    submissions: {},
    results: [],
    eliminatedPlayerIds: [],
    createdAt: isoNow(),
    // time_estimation: keyed by playerId, records server timestamp of START press
    startPressTimestamps: {},
  };

  setRoundState(roomId, roundId, roundState);
  return roundState;
};

/**
 * Transition a round from INTRO → ACTIVE.
 * Stamps roundStartTimestamp on config for all round types.
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
  roundState.generatedConfig.roundStartTimestamp = startedAt;

  return roundState;
};

/**
 * Record the server-side timestamp of when a player pressed START
 * in the Time Estimation round.
 *
 * This is the authoritative start time used for scoring — not the
 * round activation time, and not any client-supplied value.
 *
 * @param {string} roomId
 * @param {string} roundId
 * @param {string} playerId
 */
export const recordStartPress = (roomId, roundId, playerId) => {
  const roundState = getRoundState(roomId, roundId);
  if (!roundState) return;
  if (roundState.roundType !== 'time_estimation') return;
  // Only record once — first press wins, ignore duplicates
  if (roundState.startPressTimestamps[playerId]) return;
  roundState.startPressTimestamps[playerId] = now();
};

/**
 * Record a player submission.
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
 */
export const closeAndScoreRound = (roomId, roundId) => {
  const roundState = getRoundState(roomId, roundId);
  if (!roundState) throw new Error('Round not found');

  roundState.phase = ROUND_PHASE.SCORING;

  // console.log('[Score] roundStartTimestamp on generatedConfig:', roundState.generatedConfig.roundStartTimestamp);
  // console.log('[Score] startedAt on roundState:', roundState.startedAt);

  const activePlayers = getActivePlayers(roomId);
  const activePlayerIds = activePlayers.map((p) => p.playerId);

  // For time_estimation, inject each player's startPressedAt into their
  // submission before scoring so the engine can use the correct start time.
  const submissions = { ...roundState.submissions };
  if (roundState.roundType === 'time_estimation') {
    for (const playerId of activePlayerIds) {
      if (submissions[playerId] && roundState.startPressTimestamps[playerId]) {
        submissions[playerId] = {
          ...submissions[playerId],
          startPressedAt: roundState.startPressTimestamps[playerId],
        };
      }
    }
  }
    

  const configWithTiming = {
    ...roundState.generatedConfig,
    roundStartTimestamp: roundState.generatedConfig.roundStartTimestamp ?? roundState.startedAt,
  };

  const rankedResults = scoreRound(submissions, configWithTiming, activePlayerIds);

  for (const result of rankedResults) {
    recordPlayerScore(roomId, result.playerId, roundState.roundNumber, result.score);
  }

  roundState.results = rankedResults;
  roundState.phase = ROUND_PHASE.RESULTS;

  return rankedResults;
};

/**
 * Mark a round as fully complete.
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