// Summer Quest — Weekly Challenge Service
// One submit endpoint handles all 12 challenge shapes by branching on
// inputType from the shared config, rather than 12 separate code paths.
// See spec section 8.4 and config/weeklyChallenges.js.

import { getChallengeForWeek } from '../config/weeklyChallenges.js';

export class SummerQuestChallengeError extends Error {}

// Normalises the body into the three generic storage columns the
// weekly_challenges table provides: numeric_value, text_value, json_value.
// Keeping this mapping in one place means adding a 13th challenge later
// only needs a new inputType case here, not a schema change.
function normaliseSubmission(inputType, body) {
  switch (inputType) {
    case 'number':
    case 'decimal':
      if (body.value === undefined || body.value === null || body.value === '') {
        throw new SummerQuestChallengeError('A value is required.');
      }
      return { numericValue: Number(body.value), textValue: null, jsonValue: null };

    case 'number_or_text':
      // Week 3: accept either a number or a short text score.
      if (!isNaN(Number(body.value)) && body.value !== '') {
        return { numericValue: Number(body.value), textValue: null, jsonValue: null };
      }
      return { numericValue: null, textValue: String(body.value || ''), jsonValue: null };

    case 'yes_no_note':
      return {
        numericValue: null,
        textValue: body.completed ? 'yes' : 'no',
        jsonValue: { completed: Boolean(body.completed), note: body.note || null },
      };

    case 'select_note':
      return {
        numericValue: null,
        textValue: body.selection || null,
        jsonValue: { selection: body.selection || null, note: body.note || null },
      };

    case 'skill_focus':
      return {
        numericValue: null,
        textValue: body.skill || null,
        jsonValue: { skill: body.skill || null, note: body.note || null },
      };

    case 'three_text_fields':
      return {
        numericValue: null,
        textValue: null,
        jsonValue: {
          move1: body.move1 || '',
          move2: body.move2 || '',
          move3: body.move3 || '',
        },
      };

    case 'benchmark_set':
      // Week 8 halfway test — also writes individual rows into
      // benchmark_results so progress charts can use a single source.
      return {
        numericValue: null,
        textValue: null,
        jsonValue: body.benchmarks || {},
      };

    case 'final_assessment':
      return {
        numericValue: null,
        textValue: null,
        jsonValue: {
          weeksCompleted: body.weeksCompleted ?? null,
          bestKeepyUppy: body.bestKeepyUppy ?? null,
          sprint10Improved: Boolean(body.sprint10Improved),
          sprint20Improved: Boolean(body.sprint20Improved),
          skillImprovedMost: body.skillImprovedMost || null,
          wantToImproveNext: body.wantToImproveNext || null,
          enjoyedProgramme: body.enjoyedProgramme ?? null,
        },
      };

    default:
      throw new SummerQuestChallengeError(`Unknown challenge input type: ${inputType}`);
  }
}

export async function submitWeeklyChallenge(pool, { playerId, teamId, weekNumber, body }) {
  const config = getChallengeForWeek(weekNumber);
  if (!config) {
    throw new SummerQuestChallengeError('No challenge configured for that week.');
  }

  const { numericValue, textValue, jsonValue } = normaliseSubmission(config.inputType, body);

  await pool.execute(
    `INSERT INTO fundraisely_tt_weekly_challenges
      (player_id, team_id, week_number, challenge_key, numeric_value, text_value, json_value, note)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       numeric_value = VALUES(numeric_value),
       text_value = VALUES(text_value),
       json_value = VALUES(json_value),
       note = VALUES(note),
       updated_at = NOW()`,
    [
      playerId, teamId, weekNumber, config.key,
      numericValue, textValue,
      jsonValue ? JSON.stringify(jsonValue) : null,
      body.note || null,
    ]
  );

  // Week 8's benchmark_set also feeds the dedicated benchmark_results
  // table so My Progress can chart sprint improvement alongside Week 1/4.
  if (config.inputType === 'benchmark_set' && body.benchmarks) {
    await storeBenchmarkSet(pool, { playerId, teamId, weekNumber, benchmarks: body.benchmarks });
  }

  return getChallengeSubmission(pool, { playerId, weekNumber });
}

async function storeBenchmarkSet(pool, { playerId, teamId, weekNumber, benchmarks }) {
  const VALID_TEST_KEYS = ['sprint_10m', 'sprint_20m', 'sprint_40m', 'sprint_10m_with_ball', 'cone_slalom', 'keepy_uppy'];

  for (const testKey of VALID_TEST_KEYS) {
    const entry = benchmarks[testKey];
    if (!entry || entry.value === undefined || entry.value === null) continue;

    await pool.execute(
      `INSERT INTO fundraisely_tt_benchmark_results (player_id, team_id, week_number, test_key, value, unit)
       VALUES (?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE value = VALUES(value), unit = VALUES(unit), updated_at = NOW()`,
      [playerId, teamId, weekNumber, testKey, entry.value, entry.unit || 'seconds']
    );
  }
}

export async function getChallengeSubmission(pool, { playerId, weekNumber }) {
  const [rows] = await pool.execute(
    `SELECT * FROM fundraisely_tt_weekly_challenges WHERE player_id = ? AND week_number = ? LIMIT 1`,
    [playerId, weekNumber]
  );
  const row = rows[0];
  if (!row) return null;
  return {
    ...row,
    json_value: row.json_value ? safeParseJson(row.json_value) : null,
  };
}

export async function getAllChallengeSubmissions(pool, { playerId }) {
  const [rows] = await pool.execute(
    `SELECT * FROM fundraisely_tt_weekly_challenges WHERE player_id = ? ORDER BY week_number ASC`,
    [playerId]
  );
  return rows.map((row) => ({
    ...row,
    json_value: row.json_value ? safeParseJson(row.json_value) : null,
  }));
}

function safeParseJson(value) {
  // mysql2 may already return JSON columns as parsed objects depending
  // on driver config — guard against double-parsing.
  if (typeof value !== 'string') return value;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}
