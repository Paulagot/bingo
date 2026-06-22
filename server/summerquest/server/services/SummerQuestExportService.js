// Summer Quest — CSV Export Service
// See spec section 8.10 "Exports". Simple manual CSV building (no
// dependency needed) since columns are small/fixed and we control all
// the data — avoids pulling in a csv library for four flat exports.

function escapeCsvValue(value) {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function toCsv(headers, rows) {
  const headerLine = headers.join(',');
  const lines = rows.map((row) => headers.map((h) => escapeCsvValue(row[h])).join(','));
  return [headerLine, ...lines].join('\n');
}

export async function exportPlayerSummariesCsv(pool, { teamId }) {
  const [rows] = await pool.execute(
    `SELECT p.id, p.display_name, pr.name as parent_name, pr.email as parent_email,
            p.is_active, p.created_at
     FROM fundraisely_tt_players p
     JOIN fundraisely_tt_parents pr ON pr.id = p.parent_id
     WHERE p.team_id = ?
     ORDER BY p.display_name ASC`,
    [teamId]
  );

  const data = rows.map((r) => ({
    player_id: r.id,
    display_name: r.display_name,
    parent_name: r.parent_name,
    parent_email: r.parent_email,
    is_active: r.is_active ? 'yes' : 'no',
    joined_at: r.created_at,
  }));

  return toCsv(['player_id', 'display_name', 'parent_name', 'parent_email', 'is_active', 'joined_at'], data);
}

export async function exportDailyLogsCsv(pool, { teamId }) {
  const [rows] = await pool.execute(
    `SELECT dl.*, p.display_name
     FROM fundraisely_tt_daily_logs dl
     JOIN fundraisely_tt_players p ON p.id = dl.player_id
     WHERE dl.team_id = ?
     ORDER BY p.display_name ASC, dl.log_date ASC`,
    [teamId]
  );

  const headers = [
    'display_name', 'log_date', 'week_number', 'day_type',
    'ball_mastery_done', 'ball_mastery_minutes',
    'passing_done', 'passing_minutes',
    'speed_work_done', 'speed_work_minutes',
    'juggling_done', 'juggling_minutes',
    'free_play_type', 'free_play_minutes',
    'rest_acknowledged', 'effort_feeling', 'note',
  ];

  return toCsv(headers, rows);
}

export async function exportWeeklyChallengesCsv(pool, { teamId }) {
  const [rows] = await pool.execute(
    `SELECT wc.week_number, wc.challenge_key, wc.numeric_value, wc.text_value, wc.json_value,
            wc.note, wc.submitted_at, p.display_name
     FROM fundraisely_tt_weekly_challenges wc
     JOIN fundraisely_tt_players p ON p.id = wc.player_id
     WHERE wc.team_id = ?
     ORDER BY p.display_name ASC, wc.week_number ASC`,
    [teamId]
  );

  const data = rows.map((r) => ({
    ...r,
    json_value: r.json_value ? JSON.stringify(r.json_value) : '',
  }));

  return toCsv(
    ['display_name', 'week_number', 'challenge_key', 'numeric_value', 'text_value', 'json_value', 'note', 'submitted_at'],
    data
  );
}

export async function exportSignoffsCsv(pool, { teamId }) {
  const [rows] = await pool.execute(
    `SELECT ws.week_number, ws.parent_signature_name, ws.parent_note, ws.signed_at, p.display_name
     FROM fundraisely_tt_weekly_signoffs ws
     JOIN fundraisely_tt_players p ON p.id = ws.player_id
     WHERE ws.team_id = ?
     ORDER BY p.display_name ASC, ws.week_number ASC`,
    [teamId]
  );

  return toCsv(['display_name', 'week_number', 'parent_signature_name', 'parent_note', 'signed_at'], rows);
}
