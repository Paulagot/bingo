// Summer Quest — Seed Runner
//
// Call runSummerQuestSeed(pool) once, after runSummerQuestSchema(pool).
// Safe to run multiple times — uses INSERT IGNORE / ON DUPLICATE so it
// won't duplicate rows or wipe existing data on redeploy.
//
// Wire-in (same place as the schema runner):
//
//   import { runSummerQuestSeed } from './modules/summer-quest/config/sqSeedRunner.js';
//   ...
//   await runSummerQuestSchema(pool);
//   await runSummerQuestSeed(pool);

import { BADGES } from './badges.js';
import { NUTRITION_TIPS } from './nutritionTips.js';
import { hashSecret } from '../services/sqAuthUtils.js';

const TEAM_SEED = {
  name: 'Tallaght Town Summer Quest',
  squad: 'Girls U11-U13',
  seasonLabel: 'Summer 2026',
  teamCode: process.env.SQ_TEAM_CODE || 'TT2026',
  programmeStartDate: process.env.SQ_PROGRAMME_START_DATE || '2026-06-15',
  programmeEndDate: process.env.SQ_PROGRAMME_END_DATE || '2026-09-06',
};

async function seedTeam(pool) {
  await pool.execute(
    `INSERT INTO fundraisely_tt_teams
      (name, squad, season_label, team_code, programme_start_date, programme_end_date, is_active)
     VALUES (?, ?, ?, ?, ?, ?, TRUE)
     ON DUPLICATE KEY UPDATE
       name = VALUES(name),
       programme_start_date = VALUES(programme_start_date),
       programme_end_date = VALUES(programme_end_date)`,
    [
      TEAM_SEED.name,
      TEAM_SEED.squad,
      TEAM_SEED.seasonLabel,
      TEAM_SEED.teamCode,
      TEAM_SEED.programmeStartDate,
      TEAM_SEED.programmeEndDate,
    ]
  );
}

async function seedBadges(pool) {
  for (const badge of BADGES) {
    await pool.execute(
      `INSERT INTO fundraisely_tt_badges (badge_key, name, description, icon, colour, sort_order)
       VALUES (?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         name = VALUES(name),
         description = VALUES(description),
         icon = VALUES(icon),
         colour = VALUES(colour),
         sort_order = VALUES(sort_order)`,
      [badge.key, badge.name, badge.description, badge.icon, badge.colour, badge.sortOrder]
    );
  }
}

async function seedNutritionTips(pool) {
  // nutrition_tips has no natural unique key in the spec's schema, so we
  // guard against duplicate seeding by checking count first.
  const [rows] = await pool.execute('SELECT COUNT(*) as count FROM fundraisely_tt_nutrition_tips');
  if (rows[0].count > 0) return;

  for (const tip of NUTRITION_TIPS) {
    await pool.execute(
      `INSERT INTO fundraisely_tt_nutrition_tips (title, body, category, is_active, sort_order)
       VALUES (?, ?, ?, TRUE, ?)`,
      [tip.title, tip.body, tip.category, tip.sortOrder]
    );
  }
}

async function seedSuperAdmin(pool) {
  const email = process.env.SQ_ADMIN_EMAIL;
  const password = process.env.SQ_ADMIN_PASSWORD;

  if (!email || !password) {
    console.log('[summer-quest] SQ_ADMIN_EMAIL/SQ_ADMIN_PASSWORD not set \u2014 skipping super admin seed. Set both in .env to create one automatically, or create a parent account and promote it manually via SQL: UPDATE fundraisely_tt_parents SET role = \'super_admin\' WHERE email = \'...\'');
    return;
  }

  const [existing] = await pool.execute(
    `SELECT id FROM fundraisely_tt_parents WHERE email = ? LIMIT 1`,
    [email]
  );
  if (existing.length > 0) {
    // Already exists — don't overwrite an existing password on every
    // restart, in case it's been changed since.
    return;
  }

  const passwordHash = await hashSecret(password);
  await pool.execute(
    `INSERT INTO fundraisely_tt_parents (role, name, email, password_hash, is_active)
     VALUES ('super_admin', 'Super Admin', ?, ?, TRUE)`,
    [email, passwordHash]
  );
  console.log(`[summer-quest] Created super_admin account for ${email}`);
}

export async function runSummerQuestSeed(pool) {
  console.log('[summer-quest] Seeding team, badges, nutrition tips, super admin...');
  await seedTeam(pool);
  await seedBadges(pool);
  await seedNutritionTips(pool);
  await seedSuperAdmin(pool);
  console.log('[summer-quest] Seed complete.');
}
