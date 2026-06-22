// Summer Quest — Simple Login Rate Limiter
// Lightweight, in-memory, per-process limiter scoped to this module's
// login routes only. Good enough for a single-team private app; not
// meant to replace any rate limiting your core app already has on
// other routes.

const attempts = new Map(); // key -> { count, windowStart }

const WINDOW_MS = 10 * 60 * 1000; // 10 minutes
const MAX_ATTEMPTS = 10;

export function summerQuestLoginRateLimit(req, res, next) {
  const key = req.ip + ':' + (req.body?.email || req.body?.displayName || '');
  const now = Date.now();
  const record = attempts.get(key);

  if (!record || now - record.windowStart > WINDOW_MS) {
    attempts.set(key, { count: 1, windowStart: now });
    return next();
  }

  record.count += 1;
  if (record.count > MAX_ATTEMPTS) {
    return res.status(429).json({ error: 'Too many attempts. Please try again later.' });
  }

  next();
}
