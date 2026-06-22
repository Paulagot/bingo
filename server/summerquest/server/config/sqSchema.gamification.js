// Summer Quest — Gamification / Content Schema
// Tables: badges, player_badges, nutrition_tips
// Prefix: fundraisely_tt_

export const GAMIFICATION_SCHEMA_SQL = `

CREATE TABLE IF NOT EXISTS fundraisely_tt_badges (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  badge_key VARCHAR(80) NOT NULL UNIQUE,
  name VARCHAR(120) NOT NULL,
  description VARCHAR(255) NOT NULL,
  icon VARCHAR(80) NOT NULL,
  colour VARCHAR(30) NOT NULL,
  sort_order INT NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS fundraisely_tt_player_badges (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  player_id BIGINT UNSIGNED NOT NULL,
  badge_key VARCHAR(80) NOT NULL,
  unlocked_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_tt_player_badge (player_id, badge_key),
  FOREIGN KEY (player_id) REFERENCES fundraisely_tt_players(id),
  FOREIGN KEY (badge_key) REFERENCES fundraisely_tt_badges(badge_key)
);

CREATE TABLE IF NOT EXISTS fundraisely_tt_nutrition_tips (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(120) NOT NULL,
  body VARCHAR(500) NOT NULL,
  category ENUM('hydration', 'before_training', 'after_training', 'everyday', 'parent_tip') NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INT NOT NULL DEFAULT 0
);

`;
