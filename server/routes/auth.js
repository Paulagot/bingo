// server/routes/auth.js
import express from 'express';
import { AuthService } from '../services/AuthService.js';
import authenticateToken from '../middleware/auth.js';

const router = express.Router();
const authService = new AuthService();

// Simple inline validation — avoids needing a separate middleware file
const requireFields = (fields) => (req, res, next) => {
  const missing = fields.filter((f) => !req.body[f]);
  if (missing.length > 0) {
    return res.status(400).json({ error: `Missing required fields: ${missing.join(', ')}` });
  }
  next();
};

// Register club
router.post(
  '/clubs/register',
  requireFields(['clubName', 'personName', 'email', 'password', 'gdprConsent', 'privacyPolicyAccepted']),
  authService.register.bind(authService)
);

// Login
router.post(
  '/clubs/login',
  requireFields(['club', 'email', 'password']),
  authService.login.bind(authService)
);

// Get profile
router.get(
  '/clubs/me',
  authenticateToken,
  authService.getProfile.bind(authService)
);

export default router;