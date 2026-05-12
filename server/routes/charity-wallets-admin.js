// server/utils/charity-wallets-admin.js
//
// Admin CRUD for fundraisely_direct_charity_wallets.
// Mount under a protected admin router, e.g.:
//   import charityWalletsAdmin from './charities/api/charity-wallets-admin.js';
//   app.use('/api/admin/charity-wallets', yourAdminAuthMiddleware, charityWalletsAdmin);
//
// Routes:
//   GET    /          list all
//   POST   /          add or upsert (same charity_name+chain = update wallet)
//   PATCH  /:id       update wallet_address, is_active, or notes
//   DELETE /:id       hard delete (prefer PATCH is_active=0 to keep audit trail)

import express from 'express';
import { connection, TABLE_PREFIX } from '../config/database.js';

const router = express.Router();
const TABLE = `${TABLE_PREFIX}direct_charity_wallets`;

// ── GET / ─────────────────────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const [rows] = await connection.execute(
      `SELECT id, charity_name, chain, wallet_address, is_active, notes, created_at, updated_at
         FROM ${TABLE}
        ORDER BY charity_name, chain`
    );
    return res.status(200).json({ success: true, wallets: rows });
  } catch (err) {
    console.error('[charity-wallets-admin] GET error:', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// ── POST / — add or upsert ────────────────────────────────────────────────────
router.post('/', async (req, res) => {
  try {
    const { charity_name, chain, wallet_address, notes } = req.body;

    if (!charity_name || !chain || !wallet_address) {
      return res.status(400).json({
        success: false,
        error: 'charity_name, chain, and wallet_address are required',
      });
    }

    const validChains = ['solana', 'evm', 'stellar'];
    if (!validChains.includes(chain.toLowerCase())) {
      return res.status(400).json({
        success: false,
        error: `chain must be one of: ${validChains.join(', ')}`,
      });
    }

    // ON DUPLICATE KEY UPDATE: if (charity_name, chain) already exists,
    // update the wallet and reactivate rather than error.
    await connection.execute(
      `INSERT INTO ${TABLE} (charity_name, chain, wallet_address, notes)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         wallet_address = VALUES(wallet_address),
         notes          = VALUES(notes),
         is_active      = 1`,
      [charity_name.trim(), chain.toLowerCase(), wallet_address.trim(), notes ?? null]
    );

    const [rows] = await connection.execute(
      `SELECT * FROM ${TABLE} WHERE charity_name = ? AND chain = ? LIMIT 1`,
      [charity_name.trim(), chain.toLowerCase()]
    );

    return res.status(201).json({ success: true, wallet: rows[0] });
  } catch (err) {
    console.error('[charity-wallets-admin] POST error:', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// ── PATCH /:id ────────────────────────────────────────────────────────────────
router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { wallet_address, is_active, notes } = req.body;

    const setClauses = [];
    const values = [];

    if (wallet_address !== undefined) { setClauses.push('wallet_address = ?'); values.push(wallet_address.trim()); }
    if (is_active      !== undefined) { setClauses.push('is_active = ?');      values.push(is_active ? 1 : 0); }
    if (notes          !== undefined) { setClauses.push('notes = ?');           values.push(notes); }

    if (setClauses.length === 0) {
      return res.status(400).json({ success: false, error: 'Nothing to update' });
    }

    values.push(id);

    const [result] = await connection.execute(
      `UPDATE ${TABLE} SET ${setClauses.join(', ')} WHERE id = ?`,
      values
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, error: 'Wallet not found' });
    }

    const [rows] = await connection.execute(`SELECT * FROM ${TABLE} WHERE id = ?`, [id]);
    return res.status(200).json({ success: true, wallet: rows[0] });
  } catch (err) {
    console.error('[charity-wallets-admin] PATCH error:', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// ── DELETE /:id ───────────────────────────────────────────────────────────────
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const [result] = await connection.execute(`DELETE FROM ${TABLE} WHERE id = ?`, [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, error: 'Wallet not found' });
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('[charity-wallets-admin] DELETE error:', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
});

export default router;