// server/quiz/api/ticketsSummaryRouter.js
//
// GET /api/tickets/:clubId/summary
//
// Club-facing ticket income summary, grouped by ticket_type_name.
// Confirmed-only (payment_status = 'payment_confirmed'), scoped to the
// authenticated club. Deliberately aggregate-only — no row-level ticket
// data here (the dashboard drawer already covers per-room detail; this
// is for the income report's summary card).

import express from 'express';
import authenticateToken from '../../middleware/auth.js';
import { connection, TABLE_PREFIX } from '../../config/database.js';

const router = express.Router();
const TICKETS_TABLE = `${TABLE_PREFIX}quiz_tickets`;

router.get('/:clubId/summary', authenticateToken, async (req, res) => {
  try {
    const { clubId } = req.params;
    if (clubId !== req.club_id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const [rows] = await connection.execute(
      `SELECT
         COALESCE(ticket_type_name, 'General') AS ticket_type_name,
         COUNT(*) AS ticket_count,
         SUM(total_amount) AS total_amount,
         currency
       FROM ${TICKETS_TABLE}
       WHERE club_id = ?
         AND payment_status = 'payment_confirmed'
       GROUP BY COALESCE(ticket_type_name, 'General'), currency
       ORDER BY total_amount DESC`,
      [clubId]
    );

    const byType = rows.map(r => ({
      ticketTypeName: r.ticket_type_name,
      ticketCount: Number(r.ticket_count) || 0,
      totalAmount: parseFloat(r.total_amount) || 0,
      currency: r.currency,
    }));

    const grandTotal = byType.reduce((sum, t) => sum + t.totalAmount, 0);
    const totalTickets = byType.reduce((sum, t) => sum + t.ticketCount, 0);

    return res.json({
      ok: true,
      byType,
      grandTotal,
      totalTickets,
    });
  } catch (err) {
    console.error('[tickets] GET summary error:', err);
    return res.status(500).json({ error: err?.message || 'Failed to fetch ticket summary' });
  }
});

export default router;