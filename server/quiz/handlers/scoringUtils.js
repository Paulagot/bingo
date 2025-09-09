// server/quiz/scoringUtils.js

// Centralized, server-side scoring helper for ALL round types.
// Merges round-type defaults with per-round overrides from room.config.

export function getRoundScoring(room, roundIndex) {
  const roundDef = room?.config?.roundDefinitions?.[roundIndex] || {};
  const type = roundDef.roundType || roundDef.roundTypeId || 'generalTrivia';
  const overrides = roundDef.config || {};

  // ⚠️ If your defaults live elsewhere, paste that file and I'll wire to it.
  const DEFAULTS_BY_TYPE = {
    generalTrivia: {
      pointsPerDifficulty: { easy: 1, medium: 2, hard: 3 },
      pointsLostPerWrong: 0,
      pointsLostPerUnanswered: 0,
    },
    wipeout: {
      pointsPerDifficulty: { easy: 2, medium: 3, hard: 4 },
      pointsLostPerWrong: 2,
      pointsLostPerUnanswered: 3,
    },
  };

  const base = DEFAULTS_BY_TYPE[type] || DEFAULTS_BY_TYPE.generalTrivia;

  const pointsPerDifficulty = mergePPD(
    base.pointsPerDifficulty,
    overrides.pointsPerDifficulty
  );

  // Normalize/case-fix for past typos
  const pointsLostPerWrong = numOr(overrides.pointsLostPerWrong, base.pointsLostPerWrong);
  const pointsLostPerUnanswered = numOr(
    overrides.pointsLostPerUnanswered ?? overrides.pointslostperunanswered,
    base.pointsLostPerUnanswered
  );

  return { type, pointsPerDifficulty, pointsLostPerWrong, pointsLostPerUnanswered };
}

// --- below getRoundScoring(...) ---

export function questionKey(questionId, roundNumber) {
  return `${questionId}_round${roundNumber}`;
}

export function isQuestionFinalized(room, questionId) {
  if (!room?.finalizedQuestions) return false;
  return !!room.finalizedQuestions[questionKey(questionId, room.currentRound)];
}

export function markQuestionFinalized(room, questionId) {
  if (!room.finalizedQuestions) room.finalizedQuestions = {};
  const key = questionKey(questionId, room.currentRound);
  room.finalizedQuestions[key] = true;

  // optional timestamp for telemetry
  room.finalizedAt = room.finalizedAt || {};
  room.finalizedAt[key] = Date.now();
}

export function isQuestionWindowOpen(room, questionId) {
  if (!room) return false;
  const current = room.questions?.[room.currentQuestionIndex];
  if (!current) return false;
  
  // Check current question with grace period
  if (current.id === questionId) {
    const timeLimit = room.config.roundDefinitions[room.currentRound - 1]?.config?.timePerQuestion || 10;
    const elapsed = (Date.now() - room.questionStartTime) / 1000;
    const gracePeriod = 2;
    
    return (
      room.currentPhase === 'asking' &&
      elapsed <= (timeLimit + gracePeriod) &&
      !isQuestionFinalized(room, questionId)
    );
  }
  
  // Also accept previous question during transition period
  if (room.currentQuestionIndex > 0) {
    const previousQuestion = room.questions[room.currentQuestionIndex - 1];
    if (previousQuestion?.id === questionId) {
      const timeSinceNewQuestion = (Date.now() - room.questionStartTime) / 1000;
      return timeSinceNewQuestion <= 2 && !isQuestionFinalized(room, questionId);
    }
  }
  
  return false;
}

/**
 * Finalize the *previous* question for all players:
 * - write { submitted:null, correct:false, noAnswer:true } if missing
 * - apply Wipeout's no-answer penalty ONLY if scoring says so (clamped)
 * - mark question finalized so late packets get ignored
 * Returns how many records were auto-filled.
 */
export function finalizeQuestionForAllPlayers(room) {
  if (!room?.questions?.length) return 0;

  const prevIndex = room.currentQuestionIndex - 1;
  if (prevIndex < 0) return 0; // nothing to finalize before Q0

  const prevQ = room.questions[prevIndex];
  if (!prevQ) return 0;
  if (isQuestionFinalized(room, prevQ.id)) return 0;

  const { pointsLostPerUnanswered } = getRoundScoring(room, room.currentRound - 1);
  const key = questionKey(prevQ.id, room.currentRound);

  let autoFilled = 0;

  room.players.forEach((p) => {
    const pd = room.playerData[p.id];
    if (!pd) return;

    if (!pd.answers) pd.answers = {};
    if (pd.answers[key] === undefined) {
      // write explicit no-answer
      pd.answers[key] = { submitted: null, correct: false, noAnswer: true };
      autoFilled++;

      // only apply penalty if configured (>0) – General defaults to 0
      if (pointsLostPerUnanswered > 0) {
        const before = pd.score || 0;
        const applied = Math.min(pointsLostPerUnanswered, before);
        pd.score = Math.max(0, before - pointsLostPerUnanswered);
        if (applied > 0) {
          pd.cumulativeNegativePoints = (pd.cumulativeNegativePoints || 0) + applied;
        }
      }
    }
  });

  markQuestionFinalized(room, prevQ.id);
  return autoFilled;
}

export function hasFinalAnswerForPlayer(room, playerId, questionId) {
  const pd = room?.playerData?.[playerId];
  if (!pd?.answers) return false;
  return !!pd.answers[questionKey(questionId, room.currentRound)];
}


// ---- helpers ----
function mergePPD(basePPD = {}, overridePPD = {}) {
  const b = lowerKeys(basePPD);
  const o = lowerKeys(overridePPD);
  return {
    easy: pickNum(o.easy, b.easy ?? 0),
    medium: pickNum(o.medium, b.medium ?? 0),
    hard: pickNum(o.hard, b.hard ?? 0),
  };
}

function lowerKeys(obj = {}) {
  const out = {};
  for (const [k, v] of Object.entries(obj)) out[String(k).toLowerCase()] = v;
  return out;
}

function numOr(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function pickNum(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}
