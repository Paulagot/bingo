// Summer Quest — Weekly Sign-off Service
// See spec section 8.9. Parent reviews a week's logs + challenge result
// + child notes, then confirms with a typed signature. Once signed,
// the week is locked for further child edits unless a parent/admin
// explicitly unlocks it (spec: "Editing previous week should be locked
// or require parent/admin unlock" — unlock is a nice-to-have, not built
// in this pass; flagged in README).

import { assertParentOwnsPlayer } from './SummerQuestParentPlayerAccessService.js';
import { getLogsForWeek } from './SummerQuestDailyLogService.js';
import { getChallengeSubmission } from './SummerQuestChallengeService.js';

export class SummerQuestSignoffError extends Error {}

export async function getWeekSummaryForSignoff(pool, { parentId, playerId, weekNumber }) {
  await assertParentOwnsPlayer(pool, { parentId, playerId });

  const [logs, challenge, existingSignoff] = await Promise.all([
    getLogsForWeek(pool, { playerId, weekNumber }),
    getChallengeSubmission(pool, { playerId, weekNumber }),
    getSignoffIfExists(pool, { playerId, weekNumber }),
  ]);

  const completedDays = logs.filter((log) =>
    log.day_type === 'training' &&
    (log.ball_mastery_done || log.passing_done || log.speed_work_done || log.juggling_done)
  ).length;

  return {
    weekNumber,
    logs,
    completedDays,
    challenge,
    existingSignoff,
    isLocked: Boolean(existingSignoff),
  };
}

async function getSignoffIfExists(pool, { playerId, weekNumber }) {
  const [rows] = await pool.execute(
    `SELECT * FROM fundraisely_tt_weekly_signoffs WHERE player_id = ? AND week_number = ? LIMIT 1`,
    [playerId, weekNumber]
  );
  return rows[0] || null;
}

export async function submitWeeklySignoff(pool, { parentId, teamId, playerId, weekNumber, signedName, note }) {
  await assertParentOwnsPlayer(pool, { parentId, playerId });

  if (!signedName || signedName.trim().length === 0) {
    throw new SummerQuestSignoffError('A typed signature is required.');
  }

  const existing = await getSignoffIfExists(pool, { playerId, weekNumber });
  if (existing) {
    throw new SummerQuestSignoffError('This week has already been signed off.');
  }

  await pool.execute(
    `INSERT INTO fundraisely_tt_weekly_signoffs
      (player_id, parent_id, team_id, week_number, parent_signature_name, parent_note)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [playerId, parentId, teamId, weekNumber, signedName.trim(), note || null]
  );

  return getSignoffIfExists(pool, { playerId, weekNumber });
}

export async function getSignoffsForParent(pool, { parentId, playerId }) {
  await assertParentOwnsPlayer(pool, { parentId, playerId });
  const [rows] = await pool.execute(
    `SELECT * FROM fundraisely_tt_weekly_signoffs WHERE player_id = ? ORDER BY week_number ASC`,
    [playerId]
  );
  return rows;
}
