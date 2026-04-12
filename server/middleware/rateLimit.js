import rateLimit from 'express-rate-limit';

export const contactLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
});

// Web3 wallet auth — challenge + verify.
// 10 attempts per IP per 15 min is generous for legitimate use
// but stops automated wallet enumeration.
export const web3AuthLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many verification attempts. Please wait a few minutes.' },
});

// Dashboard data — verified sessions only, but still rate limited
// to prevent token replay scraping.
export const web3DashboardLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many requests. Please slow down.' },
});
