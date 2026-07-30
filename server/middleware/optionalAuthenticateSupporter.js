/**
 * optionalAuthenticateSupporter
 * server/middleware/optionalAuthenticateSupporter.js
 *
 * Like authenticateSupporter, but never blocks the request. If a valid
 * supporter token is present, req.supporter_id / req.club_id are set
 * exactly as authenticateSupporter would. If the token is missing,
 * malformed, expired, or belongs to a club (not supporter) user, the
 * request just proceeds with req.supporter_id left undefined - used for
 * routes that are public but want to personalize the response when the
 * caller happens to be logged in (e.g. the schedule route, which needs
 * to work for anonymous preview visits AND show completion state for
 * logged-in players).
 */

import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-dev-secret';

export const optionalAuthenticateSupporter = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token      = authHeader?.split(' ')[1];

  if (!token) return next();

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.role === 'supporter') {
      req.supporter    = decoded;
      req.supporter_id = decoded.supporterId;
      req.club_id      = decoded.clubId;
    }
    // Wrong token type (club token) - just ignore it, proceed anonymous.
  } catch {
    // Invalid/expired token - proceed anonymous rather than blocking.
  }

  next();
};

export default optionalAuthenticateSupporter;