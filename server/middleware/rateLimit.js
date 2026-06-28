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
  max: 10,
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

// Donation checkout — creates a real Stripe/crypto checkout session.
// Tighter than a typical read limiter since a real session has more
// abuse surface (e.g. spamming Stripe session creation against a
// club's connected account).
export const checkoutLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many donation attempts. Please wait a few minutes and try again.' },
});

// Donation widget public config fetch — called once per page load
// wherever the donate.js widget is embedded. Was previously
// unprotected; this closes that gap. Generous ceiling since a single
// real visitor's page load triggers exactly one call, but repeated
// visits/reloads are normal.
export const donationConfigLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please try again shortly.' },
});

// Donation widget domain-check — called once per page load wherever
// the donate.js widget is embedded, same traffic shape as the config
// limiter above.
export const donationDomainCheckLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { ok: false, allowed: false, error: 'Too many requests.' },
});
