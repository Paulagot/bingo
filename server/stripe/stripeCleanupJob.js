// server/stripe/stripeCleanupJob.js
//
// Interval-based background job that sweeps expired Stripe checkout records.
// Safe for Railway / Render (no native cron daemon needed).
//
// Usage — call startStripeCleanupJob() once at server startup:
//
//   import { startStripeCleanupJob } from './stripe/stripeCleanupJob.js';
//   startStripeCleanupJob();
//
// The job runs once immediately on startup, then every INTERVAL_MS after that.

import { sweepExpiredTickets } from './stripeExpiredTicketService.js';

// How often to run the sweep (default: every 10 minutes)
const INTERVAL_MS = 10 * 60 * 1000;

let jobTimer = null;

async function runSweep() {
  try {
    console.log('[CleanupJob] ⏰ Running expired ticket sweep...');
    const result = await sweepExpiredTickets();
    console.log('[CleanupJob] ✅ Sweep complete:', result);
  } catch (err) {
    // Never crash the server — just log and wait for next interval
    console.error('[CleanupJob] ❌ Sweep failed (will retry next interval):', err.message);
  }
}

/**
 * Start the background cleanup job.
 * Safe to call multiple times — only one job will run.
 */
export function startStripeCleanupJob() {
  if (jobTimer) {
    console.warn('[CleanupJob] ⚠️ Already running, skipping duplicate start');
    return;
  }

  console.log(`[CleanupJob] 🚀 Starting — interval: ${INTERVAL_MS / 1000}s`);

  // Run immediately on startup to clear anything that expired while the server was down
  runSweep();

  // Then repeat on the interval
  jobTimer = setInterval(runSweep, INTERVAL_MS);

  // Don't hold the Node.js process open just for this timer
  if (jobTimer.unref) jobTimer.unref();
}

/**
 * Stop the job (useful in tests or graceful shutdown).
 */
export function stopStripeCleanupJob() {
  if (jobTimer) {
    clearInterval(jobTimer);
    jobTimer = null;
    console.log('[CleanupJob] 🛑 Stopped');
  }
}