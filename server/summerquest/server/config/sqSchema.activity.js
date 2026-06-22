// Summer Quest — Activity Schema
// Tables: daily_logs, weekly_challenges, benchmark_results, weekly_signoffs
// Prefix: fundraisely_tt_

export const ACTIVITY_SCHEMA_SQL = `

CREATE TABLE IF NOT EXISTS fundraisely_tt_daily_logs (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  player_id BIGINT UNSIGNED NOT NULL,
  team_id BIGINT UNSIGNED NOT NULL,
  log_date DATE NOT NULL,
  week_number INT NOT NULL,
  day_type ENUM('training', 'free_play', 'rest') NOT NULL,
  ball_mastery_done BOOLEAN NOT NULL DEFAULT FALSE,
  ball_mastery_minutes INT NULL,
  passing_done BOOLEAN NOT NULL DEFAULT FALSE,
  passing_minutes INT NULL,
  speed_work_done BOOLEAN NOT NULL DEFAULT FALSE,
  speed_work_minutes INT NULL,
  juggling_done BOOLEAN NOT NULL DEFAULT FALSE,
  juggling_minutes INT NULL,
  free_play_type VARCHAR(80) NULL,
  free_play_minutes INT NULL,
  rest_acknowledged BOOLEAN NOT NULL DEFAULT FALSE,
  effort_feeling ENUM('easy', 'good', 'hard', 'tried_my_best') NULL,
  note VARCHAR(500) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NULL,
  UNIQUE KEY uniq_tt_player_date (player_id, log_date),
  FOREIGN KEY (player_id) REFERENCES fundraisely_tt_players(id),
  FOREIGN KEY (team_id) REFERENCES fundraisely_tt_teams(id)
);

CREATE TABLE IF NOT EXISTS fundraisely_tt_weekly_challenges (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  player_id BIGINT UNSIGNED NOT NULL,
  team_id BIGINT UNSIGNED NOT NULL,
  week_number INT NOT NULL,
  challenge_key VARCHAR(80) NOT NULL,
  numeric_value DECIMAL(8,2) NULL,
  text_value VARCHAR(500) NULL,
  json_value JSON NULL,
  note VARCHAR(500) NULL,
  submitted_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NULL,
  UNIQUE KEY uniq_tt_player_week_challenge (player_id, week_number),
  FOREIGN KEY (player_id) REFERENCES fundraisely_tt_players(id),
  FOREIGN KEY (team_id) REFERENCES fundraisely_tt_teams(id)
);

CREATE TABLE IF NOT EXISTS fundraisely_tt_benchmark_results (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  player_id BIGINT UNSIGNED NOT NULL,
  team_id BIGINT UNSIGNED NOT NULL,
  week_number INT NOT NULL,
  test_key ENUM('sprint_10m', 'sprint_20m', 'sprint_40m', 'sprint_10m_with_ball', 'cone_slalom', 'keepy_uppy') NOT NULL,
  value DECIMAL(8,2) NOT NULL,
  unit VARCHAR(30) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NULL,
  UNIQUE KEY uniq_tt_player_week_test (player_id, week_number, test_key),
  FOREIGN KEY (player_id) REFERENCES fundraisely_tt_players(id),
  FOREIGN KEY (team_id) REFERENCES fundraisely_tt_teams(id)
);

CREATE TABLE IF NOT EXISTS fundraisely_tt_weekly_signoffs (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  player_id BIGINT UNSIGNED NOT NULL,
  parent_id BIGINT UNSIGNED NOT NULL,
  team_id BIGINT UNSIGNED NOT NULL,
  week_number INT NOT NULL,
  parent_signature_name VARCHAR(120) NOT NULL,
  parent_note VARCHAR(500) NULL,
  signed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_tt_player_week_signoff (player_id, week_number),
  FOREIGN KEY (player_id) REFERENCES fundraisely_tt_players(id),
  FOREIGN KEY (parent_id) REFERENCES fundraisely_tt_parents(id),
  FOREIGN KEY (team_id) REFERENCES fundraisely_tt_teams(id)
);

`;
