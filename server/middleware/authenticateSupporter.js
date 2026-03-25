/**
 * Authenticate Supporter middleware
 * server/middleware/authenticateSupporter.js
 *
 * Mirrors authenticateToken but for supporter JWTs.
 * Rejects any token where role !== 'supporter' so club
 * tokens cannot be used on player routes and vice versa.
 */

import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-dev-secret';

export const authenticateSupporter = (req, res, next) => {
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

  // Reject club tokens on supporter routes
  if (decoded.role !== 'supporter') {
    return res.status(403).json({ error: 'Invalid token type' });
  }

  req.supporter    = decoded;
  req.supporter_id = decoded.supporterId;
  req.club_id      = decoded.clubId;
  next();
};

export default authenticateSupporter;