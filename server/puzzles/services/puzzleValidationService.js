import database from '../../config/database.js';
import { getEngine } from './puzzleGenerationService.js';
import { getTrustedElapsedSeconds } from './puzzleProgressService.js';

export async function validateAndScore({
  instanceId,
  playerId,
  clubId,
  puzzleType,
  answer,
  timeTakenSeconds = 0,
}) {
  // ── 1. Check for an existing submission first ────────────────────────────
  // If the player has already submitted this puzzle, return their original
  // result without re-scoring or overwriting anything.
  const [existing] = await database.connection.execute(
    `SELECT is_correct, total_score, base_score, bonus_score, penalty_score,
            time_taken_seconds, answer
     FROM fundraisely_puzzle_submissions
     WHERE instance_id = ? AND player_id = ?
     LIMIT 1`,
    [instanceId, playerId]
  );

  if (existing.length > 0) {
    const row = existing[0];
    return {
      alreadySubmitted: true,
      validation: { valid: row.is_correct === 1 },
      score: {
        completed:    true,
        correct:      row.is_correct === 1,
        baseScore:    row.base_score,
        bonusScore:   row.bonus_score,
        penaltyScore: row.penalty_score,
        totalScore:   row.total_score,
      },
    };
  }

  // ── 2. Load the stored solution — never trust the client ─────────────────
  // Reads BOTH id pairs — challenge_id/week_number (subscription) and
  // drop_room_id/item_number (Drop) — off the instance row. Exactly one
  // pair is populated per instance (see the puzzle_instances migration's
  // "never both, never neither" rule), so whichever pair is non-null here
  // is simply carried through onto the submission row below. This is what
  // lets this one function serve both puzzle products unmodified — no
  // branching on "is this a Drop instance," just pass-through of whatever
  // the instance actually has.
  const [rows] = await database.connection.execute(
    `SELECT challenge_id, week_number, drop_room_id, item_number, difficulty, solution_data
     FROM fundraisely_puzzle_instances
     WHERE id = ? LIMIT 1`,
    [instanceId]
  );

  if (!rows?.length) throw new Error('Puzzle instance not found');

  const { challenge_id, week_number, drop_room_id, item_number, difficulty, solution_data } = rows[0];
  const solutionData =
    typeof solution_data === 'string' ? JSON.parse(solution_data) : solution_data;

  // ── 3. Determine the trusted elapsed time — server-tracked, not the
  //        client's own claim. See puzzleProgressService.getTrustedElapsedSeconds
  //        for how this is built from autosave heartbeats. Only falls back to
  //        the client-reported value if we have genuinely no tracking data at
  //        all (sessions that predate this feature) — never as a preference.
  const serverElapsedSeconds = await getTrustedElapsedSeconds({ instanceId, playerId });
  const trustedTimeTakenSeconds = serverElapsedSeconds ?? Math.max(0, Number(timeTakenSeconds) || 0);

  // Soft anomaly flag — doesn't block or alter scoring, just makes it cheap
  // to query "submissions where the client's claimed time looks nothing
  // like what the server actually observed" later. A big gap is exactly
  // the tab-switch-to-a-solver pattern discussed earlier; flagging it is
  // the realistic ceiling for detecting that client-side, per our earlier
  // conversation — this can't prevent it, only surface it for review.
  const reportedTimeTakenSeconds = Math.max(0, Number(timeTakenSeconds) || 0);
  const timeAnomaly =
    serverElapsedSeconds !== null &&
    serverElapsedSeconds > 20 &&
    reportedTimeTakenSeconds < serverElapsedSeconds * 0.4;

  // ── 4. Validate + score ───────────────────────────────────────────────────
  const engine           = getEngine(puzzleType);
  const validationResult = engine.validate(answer, solutionData);
  const scoreResult      = engine.score({
    validationResult,
    difficulty,
    solutionData,
    submission: {
      timeTakenSeconds: trustedTimeTakenSeconds,
      answer,
    },
  });

  // ── 5. Persist — plain INSERT, no overwrite ───────────────────────────────
  // The unique key uq_instance_player (instance_id, player_id) guarantees
  // only one row per player per puzzle. We no longer use ON DUPLICATE KEY
  // UPDATE — if somehow a race condition fires a duplicate, MySQL will throw
  // and the second request will be rejected cleanly.
  //
  // challenge_id/week_number and drop_room_id/item_number are inserted
  // straight through from what was read off the instance in step 2 — one
  // pair will be null, the other populated, matching whichever kind of
  // instance this is. See fundraisely_puzzle_submissions migration v3.
  await database.connection.execute(
    `INSERT INTO fundraisely_puzzle_submissions
       (instance_id, player_id, club_id, challenge_id, week_number,
        drop_room_id, item_number, puzzle_type,
        answer, is_correct, total_score, base_score, bonus_score, penalty_score,
        time_taken_seconds, reported_time_taken_seconds, time_anomaly)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      instanceId,
      playerId,
      clubId,
      challenge_id,
      week_number,
      drop_room_id,
      item_number,
      puzzleType,
      JSON.stringify(answer),
      scoreResult.correct ? 1 : 0,
      scoreResult.totalScore,
      scoreResult.baseScore,
      scoreResult.bonusScore,
      scoreResult.penaltyScore,
      trustedTimeTakenSeconds,
      reportedTimeTakenSeconds,
      timeAnomaly ? 1 : 0,
    ]
  );

  return {
    alreadySubmitted: false,
    validation:       validationResult,
    score:            scoreResult,
  };
}