/**
 * authenticateAny
 * server/middleware/authenticateAny.js
 *
 * Accepts either a club token OR a supporter token.
 * Club tokens have no role field or role !== 'supporter'.
 * Supporter tokens have role === 'supporter'.
 *
 * Either way, req.user.id is set so puzzle routes work
 * for both clubs (testing) and players (production).
 */

import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-dev-secret';

export const authenticateAny = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token      = authHeader?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  let decoded;
  try {
    decoded = jwt.verify(token, JWT_SECRET);
  } catch (err) {
    return res.status(403).json({ error: 'Invalid or expired token' });
  }

  if (decoded.role === 'supporter') {
    // Player/supporter token
    req.supporter    = decoded;
    req.supporter_id = decoded.supporterId;
    req.club_id      = decoded.clubId;
    // Puzzle routes use req.user.id as the playerId
    req.user         = { id: decoded.supporterId };
  } else {
    // Club user token — existing behaviour unchanged
    req.user    = decoded;
    req.club_id = decoded.club_id ?? req.user?.club_id;
  }

  next();
};

export default authenticateAny;