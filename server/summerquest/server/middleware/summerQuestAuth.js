// Summer Quest — Auth Middleware
// Verifies the Summer Quest JWT (separate secret from any other auth
// in the app) and attaches req.sqAuth = { sqRole, sqId, ... }.
// Use requireSummerQuestRole(['parent']) etc to gate routes by role.

import { verifySummerQuestToken } from '../services/sqAuthUtils.js';

export function summerQuestAuthMiddleware(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: 'Missing token.' });
  }

  try {
    req.sqAuth = verifySummerQuestToken(token);
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token.' });
  }
}

export function requireSummerQuestRole(allowedRoles) {
  return (req, res, next) => {
    if (!req.sqAuth || !allowedRoles.includes(req.sqAuth.sqRole)) {
      return res.status(403).json({ error: 'Not authorised for this resource.' });
    }
    next();
  };
}
