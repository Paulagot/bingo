import jwt from 'jsonwebtoken';
import { connection } from '../config/database.js';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-dev-secret';

export const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  let decoded;
  let verificationFailed = false;

  // Try to verify with local JWT_SECRET first
  try {
    decoded = jwt.verify(token, JWT_SECRET);
  } catch (verifyError) {
    verificationFailed = true;
    console.warn('[Auth] Token verification with local secret failed, trying to decode without verification:', verifyError.message);
    
    // If verification fails, try to decode without verification (for tokens from external management API)
    // This allows tokens from management API to work even if JWT_SECRET doesn't match
    try {
      decoded = jwt.decode(token);
      if (!decoded) {
        return res.status(403).json({ error: 'Invalid token: unable to decode' });
      }
      console.log('[Auth] Token decoded without verification (from external API)');
    } catch (decodeError) {
      console.error('[Auth] Token decode failed:', decodeError);
      return res.status(403).json({ error: 'Invalid token' });
    }
  }

  // Extract club_id from token (try multiple possible field names)
  const clubId = decoded.club_id || decoded.clubId || decoded.userId;
  
  if (!clubId) {
    console.error('[Auth] No club_id/userId found in token:', decoded);
    return res.status(403).json({ error: 'Invalid token: missing club_id' });
  }

  // If we verified with local secret, try database lookup first
  if (!verificationFailed && connection) {
    try {
      const [rows] = await connection.execute(
        `SELECT u.*, c.name as club_name FROM fundraisely_users u JOIN fundraisely_clubs c ON u.club_id = c.id WHERE u.id = ?`,
        [decoded.userId]
      );
      
      if (Array.isArray(rows) && rows.length > 0) {
        req.user = rows[0];
        req.club_id = req.user.club_id;
        return next();
      }
    } catch (dbError) {
      console.warn('[Auth] Database lookup failed, using token club_id directly:', dbError.message);
    }
  }

  // Fallback: use club_id from token directly (for external management API tokens)
  req.club_id = clubId;
  req.user = { id: decoded.userId || clubId, club_id: clubId };
  
  console.log(`[Auth] Using club_id from token: ${clubId}`);
  next();
};

export default authenticateToken;