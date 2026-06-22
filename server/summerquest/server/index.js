// Summer Quest — Module Entry Point
//
// This is the ONLY file your existing server/index.js needs to know
// about. Everything else in this module is wired through here.
//
// ── WHY TWO FUNCTIONS, NOT ONE ───────────────────────────────────────
//
// Express matches routes in REGISTRATION ORDER, not by specificity.
// Your app's SPA catch-all (`app.get('*', ...)`) and static file
// middleware are registered synchronously at the top level of
// server/index.js, the instant the file is evaluated — before any
// `await` in an async IIFE ever gets a chance to run. If route
// mounting happens inside that later async block (as the original
// single-function version did), it gets registered AFTER the
// catch-all, so every GET request matches the catch-all first and
// gets served index.html instead of JSON. POST requests "work" only
// because `app.get('*', ...)` is GET-only and never intercepts them —
// which is exactly the asymmetry you saw (POST login worked, GET
// dashboard didn't).
//
// The fix: split into two calls.
//   1. mountSummerQuestRoutes(app, pool) — SYNCHRONOUS. Call this near
//      your other early `app.use(...)` route registrations, BEFORE
//      static files / the catch-all. It only registers Express routes;
//      it does not touch the database.
//   2. setupSummerQuestDatabase(pool) — ASYNC. Call this inside your
//      existing async DB-init block, same place the old single
//      function was called. It creates schema + seed data.
//
// Your app's existing database-readiness guard middleware (the one
// that returns 503 for /api/* until isDatabaseReady is true) already
// protects these routes from running real queries before the DB is
// ready — so mounting the routes early is safe even though the schema
// might not exist yet at that exact moment.
//
// ── ACTUAL WIRING (server/index.js) ──────────────────────────────────
//
// Near the top, with your other early route registrations (anywhere
// before `app.use(express.static(...))` / the SPA catch-all):
//   import { mountSummerQuestRoutes } from './summerquest/server/index.js';
//   ...
//   mountSummerQuestRoutes(app, connection);   // <-- NOT inside the async block, NOT awaited
//
// Inside your existing async DB-init block, in the same place the old
// single initSummerQuest() call was:
//   import { setupSummerQuestDatabase } from './summerquest/server/index.js';
//   ...
//   await setupSummerQuestDatabase(connection);
//
// To remove Summer Quest later: delete server/summerquest/, delete
// both import lines + both calls, optionally DROP all
// fundraisely_tt_* tables. Nothing else in the app changes.

import express from 'express';
import { runSummerQuestSchema } from './config/sqSchemaRunner.js';
import { runSummerQuestSeed } from './config/sqSeedRunner.js';
import summerQuestAuthRoutes from './routes/summerQuestAuthRoutes.js';
import summerQuestAdminInviteRoutes from './routes/summerQuestAdminInviteRoutes.js';
import summerQuestAdminDashboardRoutes from './routes/summerQuestAdminDashboardRoutes.js';
import summerQuestPlayerRoutes from './routes/summerQuestPlayerRoutes.js';
import summerQuestParentRoutes from './routes/summerQuestParentRoutes.js';

// 1. SYNCHRONOUS — call early, before static files / the catch-all.
export function mountSummerQuestRoutes(app, pool) {
  const summerQuestRouter = express.Router();

  // Make the pool available to this module's routes/services without
  // importing your core db config directly.
  summerQuestRouter.use((req, res, next) => {
    req.sqPool = pool;
    next();
  });

  // Mount sub-routers.
  summerQuestRouter.use('/auth', summerQuestAuthRoutes);
  // Two files both mount at /admin: invites (super_admin only) and
  // dashboard/players/exports (super_admin + coach_admin). Express
  // tries them in order and falls through on no path match, so this is
  // safe — kept as two files instead of one because they have
  // different role gates, not because of a path conflict.
  summerQuestRouter.use('/admin', summerQuestAdminInviteRoutes);
  summerQuestRouter.use('/admin', summerQuestAdminDashboardRoutes);
  summerQuestRouter.use('/player', summerQuestPlayerRoutes);
  summerQuestRouter.use('/parent', summerQuestParentRoutes);

  // Block search indexing on this entire API prefix as a
  // defence-in-depth measure.
  summerQuestRouter.use((req, res, next) => {
    res.setHeader('X-Robots-Tag', 'noindex, nofollow');
    next();
  });

  app.use('/api/summer-quest', summerQuestRouter);

  console.log('[summer-quest] Routes mounted at /api/summer-quest');
}

// 2. ASYNC — call inside your existing async DB-init block.
export async function setupSummerQuestDatabase(pool) {
  await runSummerQuestSchema(pool);
  await runSummerQuestSeed(pool);
  console.log('[summer-quest] Database ready');
}

// Backwards-compatible combined version, in case anything still
// imports the old name — but prefer the two-function split above for
// any app with a synchronous catch-all/static-file registration
// (i.e. basically every Express app with server-rendered SEO tags).
export async function initSummerQuest(app, pool) {
  mountSummerQuestRoutes(app, pool);
  await setupSummerQuestDatabase(pool);
}
