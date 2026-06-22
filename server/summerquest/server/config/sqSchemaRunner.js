// Summer Quest — Schema Runner
//
// Call runSummerQuestSchema(pool) once on server startup (same pattern
// your core config/database.js likely already uses for its own tables).
//
// HOW TO WIRE THIS IN (server/src/app.js or config/database.js):
//
//   import { runSummerQuestSchema } from './modules/summer-quest/config/sqSchemaRunner.js';
//   ...
//   await runSummerQuestSchema(pool); // after your existing table creation
//
// Nothing here touches your existing tables. Drop this whole module
// folder + remove this one import line to fully remove Summer Quest.

import { CORE_SCHEMA_SQL } from './sqSchema.core.js';
import { ACTIVITY_SCHEMA_SQL } from './sqSchema.activity.js';
import { GAMIFICATION_SCHEMA_SQL } from './sqSchema.gamification.js';

// Split on semicolons that end a statement, ignoring empty fragments.
// Kept deliberately simple since these schema files don't contain
// semicolons inside string literals or stored procedures.
function splitStatements(sql) {
  return sql
    .split(';')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

export async function runSummerQuestSchema(pool) {
  const allStatements = [
    ...splitStatements(CORE_SCHEMA_SQL),
    ...splitStatements(ACTIVITY_SCHEMA_SQL),
    ...splitStatements(GAMIFICATION_SCHEMA_SQL),
  ];

  console.log(`[summer-quest] Running ${allStatements.length} schema statements...`);

  for (const statement of allStatements) {
    try {
      await pool.execute(statement);
    } catch (err) {
      console.error('[summer-quest] Schema statement failed:', statement.slice(0, 80), err.message);
      throw err;
    }
  }

  console.log('[summer-quest] Schema ready.');
}
