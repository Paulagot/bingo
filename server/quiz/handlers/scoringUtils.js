// server/quiz/scoringUtils.js

// Centralized, server-side scoring helper for ALL round types.
// Merges round-type defaults with per-round overrides from room.config.

// ---------- Type / ID normalization ----------
// We accept either camel or snake from historical code and normalize.
function normalizeRoundType(rawType) {
  const t = String(rawType || '').trim();

  // canonical (snake_case) we use server-side:
  const known = ['general_trivia', 'wipeout', 'speed_round'];

  // direct matches
  if (known.includes(t)) return t;

  // legacy / variants
  const lower = t.toLowerCase();
  if (lower === 'generaltrivia' || lower === 'general_trivia' || lower === 'general-trivia' || lower === 'general' || lower === 'generaltriv') {
    return 'general_trivia';
  }
  if (lower === 'generaltriviaengine' || lower === 'generaltrivia_round' || lower === 'generaltriviaround') {
    return 'general_trivia';
  }
  if (lower === 'generaltrivia' || lower === 'generaltriviaengine') return 'general_trivia';
  if (lower === 'generaltrivia' || lower === 'generaltriviaengine') return 'general_trivia';

  if (lower === 'wipeout' || lower === 'wipe_out') return 'wipeout';

  if (lower === 'speedround' || lower === 'speed-round' || lower === 'speed_round' || lower === 'speed') {
    return 'speed_round';
  }

  // the older camelCase default in your file:
  if (t === 'generalTrivia') return 'general_trivia';

  // fallback
  return 'general_trivia';
}

// ---------- Defaults aligned with front-end metadata ----------
// FE shows these values in:
// - src/Quiz/constants/quizMetadata.ts
// - src/components/Quiz/constants/quiztypeconstants.ts
//
// We mirror them here as the authoritative scoring defaults.
const DEFAULTS_BY_TYPE = {
  general_trivia: {
    pointsPerDifficulty: { easy: 4, medium: 5, hard: 6 },
    pointsLostPerWrong: 0,
    pointsLostPerUnanswered: 0,
  },
  wipeout: {
    pointsPerDifficulty: { easy: 6, medium: 7, hard: 8 },
    pointsLostPerWrong: 2,
    pointsLostPerUnanswered: 3,
  },
  speed_round: {
    // Speed round uses per-difficulty adds, usually small
    pointsPerDifficulty: { easy: 1, medium: 2, hard: 3 },
    pointsLostPerWrong: 0,
    pointsLostPerUnanswered: 0,
    // totalTimeSeconds is enforced by engines elsewhere; kept here only for UI summaries
    totalTimeSeconds: 75,
    skipAllowed: true,
  },
};

// ---------- Public: scoring for a given round ----------
// roundIndex is 0-based
export function getRoundScoring(room, roundIndex) {
  const roundDef = room?.config?.roundDefinitions?.[roundIndex] || {};
  const rawType = roundDef.roundType || roundDef.roundTypeId || 'general_trivia';
  const type = normalizeRoundType(rawType);
  const overrides = roundDef.config || {};

  const base = DEFAULTS_BY_TYPE[type] || DEFAULTS_BY_TYPE.general_trivia;

  const pointsPerDifficulty = mergePPD(
    base.pointsPerDifficulty,
    overrides.pointsPerDifficulty
  );

  const pointsLostPerWrong = numOr(overrides.pointsLostPerWrong, base.pointsLostPerWrong);
  const pointsLostPerUnanswered = numOr(
    // guard legacy typos
    overrides.pointsLostPerUnanswered ?? overrides.pointslostperunanswered,
    base.pointsLostPerUnanswered
  );

  // We return only the things that the scoring engine needs.
  return {
    type, // canonical snake_case
    pointsPerDifficulty,
    pointsLostPerWrong,
    pointsLostPerUnanswered,
  };
}

// ---------- Public: compact UI summary for the FE ----------
// Use this to display EXACT server-truth on Waiting/Launched/HostPreview.
// You can attach this object into your room_state payload.
export function describeScoringForUI(room, roundIndex) {
  const roundDef = room?.config?.roundDefinitions?.[roundIndex] || {};
  const rawType = roundDef.roundType || roundDef.roundTypeId || 'general_trivia';
  const type = normalizeRoundType(rawType);
  const overrides = roundDef.config || {};

  const base = DEFAULTS_BY_TYPE[type] || DEFAULTS_BY_TYPE.general_trivia;

  const ppd = mergePPD(base.pointsPerDifficulty, overrides.pointsPerDifficulty);
  const lostWrong = numOr(overrides.pointsLostPerWrong, base.pointsLostPerWrong);
  const lostNoAns = numOr(overrides.pointsLostPerUnanswered ?? overrides.pointslostperunanswered, base.pointsLostPerUnanswered);

  // Time hints for UI (not used in scoring)
  const timePerQuestion = numOr(overrides.timePerQuestion, undefined);
  const totalTimeSeconds = numOr(
    overrides.totalTimeSeconds,
    numOr(base.totalTimeSeconds, undefined)
  );
  const questionsPerRound = numOr(overrides.questionsPerRound, undefined);
  const skipAllowed = boolOr(overrides.skipAllowed, !!base.skipAllowed);

  return {
    type,                                   // 'general_trivia' | 'wipeout' | 'speed_round'
    pointsPerDifficulty: ppd,               // {easy, medium, hard}
    pointsLostPerWrong: lostWrong,          // number
    pointsLostPerUnanswered: lostNoAns,     // number
    ui: {
      timePerQuestion: timePerQuestion ?? null,
      totalTimeSeconds: totalTimeSeconds ?? null,
      questionsPerRound: questionsPerRound ?? null,
      skipAllowed,
    },
  };
}

// ---------- Phase utility helpers (kept from your file) ----------

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

// Gate answers to the active (or just-previous) question only.
// Uses a small grace to avoid boundary race conditions.
export function isQuestionWindowOpen(room, questionId) {
  if (!room) return false;
  const current = room.questions?.[room.currentQuestionIndex];
  if (!current) return false;

  // Check current question with grace period
  if (current.id === questionId) {
    const timeLimit =
      room.config.roundDefinitions[room.currentRound - 1]?.config?.timePerQuestion || 10;
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
 * - apply no-answer penalty ONLY if scoring config says so (>0), clamped to >=0 score
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
      // explicit no-answer
      pd.answers[key] = { submitted: null, correct: false, noAnswer: true };
      autoFilled++;

      // only apply penalty if configured (>0) – General defaults to 0
      if (pointsLostPerUnanswered > 0) {
        const before = numOr(pd.score, 0);
        const applied = Math.min(pointsLostPerUnanswered, before); // tracked for cumulativeNegativePoints
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

function boolOr(value, fallback) {
  if (typeof value === 'boolean') return value;
  return !!fallback;
}

function pickNum(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}


