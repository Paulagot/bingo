// server/routes/charity-list.js
//
// GET /api/charities/list
//
// Returns the direct-wallet charities from fundraisely_direct_charity_wallets
// so the frontend can merge them with the hardcoded TGB list in gbcharities.ts.
//
// Response shape matches the Charity type in gbcharities.ts:
//   { charities: Array<{ id: 0, name: string, direct: true, chain: string }> }
//
// No auth needed — this is just a list of charity names, no wallets exposed.

import express from 'express';
import { connection, TABLE_PREFIX } from '../config/database.js';

const router = express.Router();
const TABLE = `${TABLE_PREFIX}direct_charity_wallets`;

router.get('/list', async (req, res) => {
  try {
    // Optional: filter by chain if the frontend passes ?chain=solana
    const { chain } = req.query;

    let sql = `SELECT charity_name, chain FROM ${TABLE} WHERE is_active = 1 ORDER BY charity_name`;
    const params = [];

    if (chain) {
      sql = `SELECT charity_name, chain FROM ${TABLE} WHERE is_active = 1 AND chain = ? ORDER BY charity_name`;
      params.push(String(chain).toLowerCase());
    }

    const [rows] = await connection.execute(sql, params);

    // Map to the Charity shape the frontend expects.
    // id: 0 signals "no TGB org id" — the frontend checks direct: true instead.
    const charities = rows.map(row => ({
      id:     0,
      name:   row.charity_name,
      chain:  row.chain,
      direct: true,
    }));

    return res.status(200).json({ success: true, charities });
  } catch (err) {
    console.error('[charity-list] Error:', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
});

export default router;