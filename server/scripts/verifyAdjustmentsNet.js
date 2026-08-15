// server/scripts/verifyAdjustmentsNet.js
//
// Read-only verification: for every APPROVED reconciliation, refetch its
// adjustments, recompute the net with the shared classifier, and diff
// against the stored adjustments_net. Run BEFORE migrating any approval
// flow to the classifier - if this comes back clean, the refactor changes
// nothing in practice; if it doesn't, every mismatch is a real historical
// mis-sign worth eyeballing (drop's missing prize_payout, quiz's
// default-subtract, or a bad cash_over_short reason_code).
//
// Usage: node server/scripts/verifyAdjustmentsNet.js
// Writes nothing. Exits 0 if clean, 1 if mismatches found.

import { connection, TABLE_PREFIX } from '../config/database.js';
import { computeAdjustmentsNet, classifyAdjustment } from '../shared/adjustmentClassifier.js';

const RECON_TABLE = `${TABLE_PREFIX}quiz_reconciliation`;
const ADJ_TABLE = `${TABLE_PREFIX}quiz_reconciliation_adjustments`;

const EPSILON = 0.005; // decimal(10,2) - anything past rounding is real

async function main() {
  const [recons] = await connection.execute(
    `SELECT id, room_id, club_id, adjustments_net, final_total, approved_at
     FROM ${RECON_TABLE}
     WHERE approved_at IS NOT NULL
     ORDER BY id ASC`
  );

  console.log(`Checking ${recons.length} approved reconciliation(s)…\n`);

  let mismatches = 0;
  let unclassifiedTotal = 0;

  for (const rec of recons) {
    // Adjustments link by reconciliation_id where it was set
    // (quiz/ticketed/sub/drop). Elimination never stamps it, so fall
    // back to room_id for rows with NULL reconciliation_id - safe
    // because elimination has exactly one reconciliation per room.
    const [adjRows] = await connection.execute(
      `SELECT id, adjustment_type, reason_code, amount
       FROM ${ADJ_TABLE}
       WHERE reconciliation_id = ?
          OR (reconciliation_id IS NULL AND room_id = ?)`,
      [rec.id, rec.room_id]
    );

    const { net, unclassified } = computeAdjustmentsNet(adjRows);
    const stored = Number(rec.adjustments_net || 0);
    const delta = net - stored;

    if (unclassified.length > 0) {
      unclassifiedTotal += unclassified.length;
      for (const u of unclassified) {
        console.warn(
          `  ⚠️  UNCLASSIFIED adj id=${u.id} room=${rec.room_id} ` +
          `type=${u.adjustment_type} reason=${u.reason_code ?? 'NULL'} amount=${u.amount}`
        );
      }
    }

    if (Math.abs(delta) > EPSILON) {
      mismatches++;
      console.error(
        `❌ MISMATCH recon id=${rec.id} room=${rec.room_id} club=${rec.club_id}\n` +
        `   stored adjustments_net=${stored}  recomputed=${net.toFixed(2)}  delta=${delta.toFixed(2)}\n` +
        `   approved_at=${rec.approved_at}`
      );
      // Show the per-row classification so the cause is obvious
      for (const a of adjRows) {
        const kind = classifyAdjustment({
          adjustmentType: a.adjustment_type,
          reasonCode: a.reason_code,
        });
        console.error(
          `     · ${a.adjustment_type}${a.reason_code ? `/${a.reason_code}` : ''} ` +
          `= ${a.amount} → ${kind}`
        );
      }
    }
  }

  console.log(
    `\nDone. ${mismatches} mismatch(es), ${unclassifiedTotal} unclassified adjustment(s) ` +
    `across ${recons.length} approved reconciliation(s).`
  );
  process.exit(mismatches > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error('Verification failed to run:', err);
  process.exit(2);
});