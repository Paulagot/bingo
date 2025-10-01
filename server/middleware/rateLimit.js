// server/middleware/rateLimit.js
import rateLimit from 'express-rate-limit';

export const contactLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
});
