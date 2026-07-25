// server/mgtsystem/routes/clubIncomeReport.js
//
// GET /api/income-report/:clubId
//
// Club-facing total income report — replaces the modal's two separate
// calls (donations list + tickets summary) with one endpoint that owns
// the whole shape. Authenticated, club-scoped, same access pattern as
// /tickets/:clubId/summary.
//
// Mount alongside the other mgtsystem routers, e.g.:
//   import clubIncomeReportRouter from './mgtsystem/routes/clubIncomeReport.js';
//   app.use('/api/income-report', clubIncomeReportRouter);

import express from 'express';
import authenticateToken from '../../middleware/auth.js';
import { buildClubIncomeReport } from '../services/clubIncomeReportService.js';

const router = express.Router();

router.get('/:clubId', authenticateToken, async (req, res) => {
  try {
    const { clubId } = req.params;
    if (clubId !== req.club_id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const report = await buildClubIncomeReport(clubId);
    return res.json({ ok: true, report });
  } catch (err) {
    console.error('[income-report] GET error:', err);
    return res.status(500).json({ error: err?.message || 'Failed to build income report' });
  }
});

export default router;