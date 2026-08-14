// server/routes/clubBrandingRoutes.js
import express from 'express';
import { connection as database } from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';


const router = express.Router();
const PREFIX = process.env.DB_TABLE_PREFIX || 'fundraisely_';

// ← ADD THIS - log every request that hits this router
router.use((req, res, next) => {
  console.log('🎨 [BrandingRouter] Hit:', req.method, req.path, '| Full URL:', req.originalUrl);
  next();
});

const HEX_RE = /^#[0-9a-fA-F]{6}$/;

function isValidHex(v) {
  return !v || HEX_RE.test(v);
}

function isValidUrl(v) {
  if (!v) return true;
  try { new URL(v); return true; } catch { return false; }
}

// GET /api/clubs/:clubId/branding
router.get('/:clubId/branding', authenticateToken, async (req, res) => {
  const { clubId } = req.params;

  if (req.club_id !== clubId) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  try {
    const [rows] = await database.execute(
      `SELECT
         brand_logo_url,
         brand_primary_color,
         brand_background_color,
         brand_text_on_primary_color
       FROM ${PREFIX}clubs WHERE id = ?`,
      [clubId]
    );

    if (!rows.length) {
      return res.status(404).json({ error: 'Club not found' });
    }

    return res.json({ branding: rows[0] });
  } catch (err) {
    console.error('GET branding error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /api/clubs/:clubId/branding
router.patch('/:clubId/branding', authenticateToken, async (req, res) => {
  const { clubId } = req.params;

  if (req.club_id !== clubId) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const {
    brand_logo_url,
    brand_primary_color,
    brand_background_color,
    brand_text_on_primary_color,
  } = req.body;

  // Validate
  if (!isValidUrl(brand_logo_url)) {
    return res.status(400).json({ error: 'Invalid logo URL' });
  }
  for (const [field, val] of [
    ['brand_primary_color',        brand_primary_color],
    ['brand_background_color',     brand_background_color],
    ['brand_text_on_primary_color', brand_text_on_primary_color],
  ]) {
    if (!isValidHex(val)) {
      return res.status(400).json({ error: `${field} must be a valid hex colour e.g. #157f85` });
    }
  }

  try {
    await database.execute(
      `UPDATE ${PREFIX}clubs SET
         brand_logo_url              = ?,
         brand_primary_color         = ?,
         brand_background_color      = ?,
         brand_text_on_primary_color = ?
       WHERE id = ?`,
      [
        brand_logo_url             || null,
        brand_primary_color        || null,
        brand_background_color     || null,
        brand_text_on_primary_color || null,
        clubId,
      ]
    );

    const [rows] = await database.execute(
      `SELECT
         brand_logo_url,
         brand_primary_color,
         brand_background_color,
         brand_text_on_primary_color
       FROM ${PREFIX}clubs WHERE id = ?`,
      [clubId]
    );

    return res.json({ branding: rows[0] });
  } catch (err) {
    console.error('PATCH branding error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;