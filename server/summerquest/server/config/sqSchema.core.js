// Summer Quest — Core / Identity Schema
// Tables: parents, teams, invites, parent_consents, players
// Prefix: fundraisely_tt_
//
// DECISION: Fully standalone auth. Summer Quest owns its own parent/coach
// accounts in fundraisely_tt_parents — zero foreign key coupling to your
// core Fundraisely users table. This means the whole module (including
// auth) can be deleted in September with a clean DROP, no risk to real
// Fundraisely accounts.
//
// Coach/admin accounts live in this same table, distinguished by `role`.

export const CORE_SCHEMA_SQL = `

CREATE TABLE IF NOT EXISTS fundraisely_tt_parents (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  role ENUM('super_admin', 'coach_admin', 'parent') NOT NULL DEFAULT 'parent',
  name VARCHAR(120) NOT NULL,
  email VARCHAR(190) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NULL
);

CREATE TABLE IF NOT EXISTS fundraisely_tt_teams (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  squad VARCHAR(100) NOT NULL,
  season_label VARCHAR(100) NOT NULL,
  team_code VARCHAR(30) NOT NULL UNIQUE,
  programme_start_date DATE NOT NULL,
  programme_end_date DATE NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS fundraisely_tt_invites (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  team_id BIGINT UNSIGNED NOT NULL,
  invited_email VARCHAR(190) NOT NULL,
  invited_name VARCHAR(120) NULL,
  token VARCHAR(120) NOT NULL UNIQUE,
  status ENUM('pending', 'accepted', 'expired', 'revoked') NOT NULL DEFAULT 'pending',
  created_by_parent_id BIGINT UNSIGNED NOT NULL,
  accepted_by_parent_id BIGINT UNSIGNED NULL,
  expires_at DATETIME NOT NULL,
  accepted_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (team_id) REFERENCES fundraisely_tt_teams(id),
  FOREIGN KEY (created_by_parent_id) REFERENCES fundraisely_tt_parents(id),
  FOREIGN KEY (accepted_by_parent_id) REFERENCES fundraisely_tt_parents(id)
);

CREATE TABLE IF NOT EXISTS fundraisely_tt_parent_consents (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  parent_id BIGINT UNSIGNED NOT NULL,
  team_id BIGINT UNSIGNED NOT NULL,
  consent_version VARCHAR(30) NOT NULL DEFAULT 'v1',
  is_parent_guardian BOOLEAN NOT NULL,
  consent_child_use BOOLEAN NOT NULL,
  consent_player_code BOOLEAN NOT NULL,
  consent_coach_view BOOLEAN NOT NULL,
  consent_data_deletion BOOLEAN NOT NULL,
  signed_name VARCHAR(120) NOT NULL,
  ip_address VARCHAR(80) NULL,
  user_agent TEXT NULL,
  consented_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (parent_id) REFERENCES fundraisely_tt_parents(id),
  FOREIGN KEY (team_id) REFERENCES fundraisely_tt_teams(id)
);

CREATE TABLE IF NOT EXISTS fundraisely_tt_players (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  team_id BIGINT UNSIGNED NOT NULL,
  parent_id BIGINT UNSIGNED NOT NULL,
  display_name VARCHAR(80) NOT NULL,
  internal_name VARCHAR(120) NULL,
  squad VARCHAR(100) NOT NULL DEFAULT 'Girls U11-U13',
  player_code_hash VARCHAR(255) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NULL,
  FOREIGN KEY (team_id) REFERENCES fundraisely_tt_teams(id),
  FOREIGN KEY (parent_id) REFERENCES fundraisely_tt_parents(id)
);

`;
