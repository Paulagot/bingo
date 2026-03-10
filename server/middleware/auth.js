import jwt from 'jsonwebtoken';
import { pool } from '../config/database.js';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-dev-secret';

export const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  let decoded;
  try {
    decoded = jwt.verify(token, JWT_SECRET);
  } catch (error) {
    console.error('[Auth] JWT verification failed:', error.message);
    return res.status(403).json({ error: 'Invalid token' });
  }

  try {
    const [rows] = await pool.execute(
      `SELECT u.*, c.name as club_name
       FROM fundraisely_users u
       JOIN fundraisely_clubs c ON u.club_id = c.id
       WHERE u.id = ?`,
      [decoded.userId]
    );

    if (!Array.isArray(rows) || rows.length === 0) {
      return res.status(403).json({ error: 'Invalid token' });
    }

    req.user = rows[0];
    req.club_id = req.user.club_id;
    next();
  } catch (error) {
    console.error('[Auth] Database lookup failed:', {
      message: error.message,
      code: error.code,
      name: error.name,
    });

    return res.status(500).json({
      error: 'Authentication database check failed',
      ...(process.env.NODE_ENV !== 'production' && {
        details: error.message,
        code: error.code,
      }),
    });
  }
};

export default authenticateToken;