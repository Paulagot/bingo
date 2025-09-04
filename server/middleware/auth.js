import jwt from 'jsonwebtoken';
import { connection } from '../config/database.js';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-dev-secret';

export const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    
    if (!connection) {
      return res.status(500).json({ error: 'Database not connected' });
    }

    const [rows] = await connection.execute(
      `SELECT u.*, c.name as club_name FROM fundraisely_users u JOIN fundraisely_clubs c ON u.club_id = c.id WHERE u.id = ?`,
      [decoded.userId]
    );
    
    if (!Array.isArray(rows) || rows.length === 0) {
      return res.status(403).json({ error: 'Invalid token' });
    }
    
    req.user = rows[0];
    req.club_id = req.user.club_id;
    next();
  } catch (error) {
    console.error('[Auth] Token verification failed:', error);
    return res.status(403).json({ error: 'Invalid token' });
  }
};

export default authenticateToken;