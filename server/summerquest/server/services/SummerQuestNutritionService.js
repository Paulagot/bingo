// Summer Quest — Nutrition Service
// Read-only. No logging of what a child ate — see spec section 8.8.

export async function getRotatingTip(pool) {
  const [rows] = await pool.execute(
    `SELECT id, title, body, category FROM fundraisely_tt_nutrition_tips
     WHERE is_active = TRUE ORDER BY RAND() LIMIT 1`
  );
  return rows[0] || null;
}

export async function getAllNutritionContent(pool) {
  const [rows] = await pool.execute(
    `SELECT id, title, body, category FROM fundraisely_tt_nutrition_tips
     WHERE is_active = TRUE ORDER BY category, sort_order ASC`
  );

  const grouped = {
    hydration: [],
    before_training: [],
    after_training: [],
    everyday: [],
    parent_tip: [],
  };
  for (const row of rows) {
    grouped[row.category]?.push(row);
  }
  return grouped;
}

// Called when the player taps "I've read this" on the nutrition page —
// a simple acknowledgement, not a data log (see spec: no check-in
// required, this is just to unlock the Hydration Hero badge).
export async function acknowledgeNutritionGuide(pool, { playerId }) {
  await pool.execute(
    `INSERT IGNORE INTO fundraisely_tt_player_badges (player_id, badge_key) VALUES (?, 'hydration_hero')`,
    [playerId]
  );
}
