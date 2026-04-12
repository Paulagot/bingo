import database from '../../config/database.js';
import { getEngine } from './puzzleGenerationService.js';

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
  const [rows] = await database.connection.execute(
    `SELECT challenge_id, week_number, solution_data
     FROM fundraisely_puzzle_instances
     WHERE id = ? LIMIT 1`,
    [instanceId]
  );

  if (!rows?.length) throw new Error('Puzzle instance not found');

  const { challenge_id, week_number, solution_data } = rows[0];
  const solutionData =
    typeof solution_data === 'string' ? JSON.parse(solution_data) : solution_data;

  // ── 3. Validate + score ───────────────────────────────────────────────────
  const engine           = getEngine(puzzleType);
  const validationResult = engine.validate(answer, solutionData);
  const scoreResult      = engine.score({ validationResult, submission: { timeTakenSeconds } });

  // ── 4. Persist — plain INSERT, no overwrite ───────────────────────────────
  // The unique key uq_instance_player (instance_id, player_id) guarantees
  // only one row per player per puzzle. We no longer use ON DUPLICATE KEY
  // UPDATE — if somehow a race condition fires a duplicate, MySQL will throw
  // and the second request will be rejected cleanly.
  await database.connection.execute(
    `INSERT INTO fundraisely_puzzle_submissions
       (instance_id, player_id, club_id, challenge_id, week_number, puzzle_type,
        answer, is_correct, total_score, base_score, bonus_score, penalty_score,
        time_taken_seconds)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      instanceId,
      playerId,
      clubId,
      challenge_id,
      week_number,
      puzzleType,
      JSON.stringify(answer),
      scoreResult.correct ? 1 : 0,
      scoreResult.totalScore,
      scoreResult.baseScore,
      scoreResult.bonusScore,
      scoreResult.penaltyScore,
      timeTakenSeconds,
    ]
  );

  return {
    alreadySubmitted: false,
    validation:       validationResult,
    score:            scoreResult,
  };
}