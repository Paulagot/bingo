import {
  ELIMINATION_SCHEDULE,
  ROUND_7_TARGET_FINALISTS,
  GAME_RULES,
} from '../utils/eliminationConstants.js';
import {
  calcEliminationCount,
  calcEliminationToTarget,
} from '../utils/eliminationHelpers.js';
import {
  eliminatePlayer,
  getActivePlayers,
  getActivePlayerCount,
} from './eliminationRoomManager.js';

/**
 * Apply eliminations after a round completes.
 *
 * @param {string} roomId
 * @param {number} roundNumber         - 1-indexed
 * @param {Object[]} rankedResults     - sorted worst→best (ascending rank = better)
 * @returns {string[]} eliminatedPlayerIds this round
 */
export const applyEliminations = (roomId, roundNumber, rankedResults) => {
  const activeCount = getActivePlayerCount(roomId);

  // Sort by rank descending: highest rank number = worst performer
  const sortedWorstFirst = [...rankedResults].sort((a, b) => b.rank - a.rank);

  let eliminationCount = 0;

  const schedule = ELIMINATION_SCHEDULE[roundNumber];

  if (roundNumber === 1) {
    // Never eliminate in round 1
    return [];
  }

  if (roundNumber === GAME_RULES.TOTAL_ROUNDS) {
    // Final round: everyone except rank 1 is eliminated
    eliminationCount = activeCount - 1;
  } else if (roundNumber === 7) {
    // Round 7: reduce to ROUND_7_TARGET_FINALISTS
    eliminationCount = calcEliminationToTarget(activeCount, ROUND_7_TARGET_FINALISTS);
  } else if (typeof schedule === 'number') {
    eliminationCount = calcEliminationCount(activeCount, schedule);
  } else {
    return [];
  }

  const eliminated = [];

  for (let i = 0; i < eliminationCount; i++) {
    const entry = sortedWorstFirst[i];
    if (!entry) break;
    eliminatePlayer(roomId, entry.playerId, roundNumber);
    eliminated.push(entry.playerId);
  }

  return eliminated;
};

/**
 * Determine the winner from remaining active players after round 8.
 * Tie-break:
 *   1. Lowest round 8 error (highest score)
 *   2. Fastest submission in round 8
 *   3. Lowest cumulative error (highest cumulative score)
 *
 * @param {Object[]} rankedResults  - round 8 ranked results
 * @param {Object} submissions      - { playerId: submissionObj }
 * @param {Object[]} players        - all player objects
 * @returns {string} winnerId
 */
export const determineWinner = (rankedResults, submissions, players) => {
  if (rankedResults.length === 0) throw new Error('No players in final round');
  if (rankedResults.length === 1) return rankedResults[0].playerId;

  const playerMap = Object.fromEntries(players.map((p) => [p.playerId, p]));

  const candidates = [...rankedResults].sort((a, b) => {
    // 1. Higher score = better (rank already sorted, but recheck)
    if (b.score !== a.score) return b.score - a.score;

    // 2. Earlier submission timestamp
    const subA = submissions[a.playerId];
    const subB = submissions[b.playerId];
    if (subA && subB && subA.submittedAt !== subB.submittedAt) {
      return subA.submittedAt - subB.submittedAt;
    }

    // 3. Higher cumulative score
    const cumA = playerMap[a.playerId]?.cumulativeScore ?? 0;
    const cumB = playerMap[b.playerId]?.cumulativeScore ?? 0;
    return cumB - cumA;
  });

  return candidates[0].playerId;
};