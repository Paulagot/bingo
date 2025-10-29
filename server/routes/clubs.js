// server/routes/clubs.js
import express from 'express';
import bcrypt from 'bcrypt';
import { connection } from '../config/database.js';

const router = express.Router();

/**
 * POST /api/clubs/register
 * Register a new club/organization
 */
router.post('/register', async (req, res) => {
  try {
    // Accept both 'name' (from frontend) and 'clubName' for backwards compatibility
    const { name, clubName, email, password, gdprConsent, privacyPolicyAccepted, marketingConsent } = req.body;
    const finalClubName = name || clubName;

    // Validation
    if (!finalClubName || !email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: name/clubName, email, password',
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        error: 'Password must be at least 8 characters long',
      });
    }

    // Check password strength (match frontend validation)
    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
      return res.status(400).json({
        success: false,
        error: 'Password must contain uppercase, lowercase, and number',
      });
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid email format',
      });
    }

    // Check if email already exists
    const [existingUsers] = await connection.execute(
      'SELECT id FROM clubs WHERE email = ?',
      [email]
    );

    if (existingUsers.length > 0) {
      return res.status(409).json({
        success: false,
        error: 'Email already registered',
      });
    }

    // Hash password with bcrypt
    const passwordHash = await bcrypt.hash(password, 12);

    // Insert new club
    const [result] = await connection.execute(
      'INSERT INTO clubs (club_name, email, password_hash, created_at) VALUES (?, ?, ?, NOW())',
      [finalClubName, email, passwordHash]
    );

    console.log(`✅ New club registered: ${finalClubName} (${email})`);
    console.log(`📋 GDPR Consent: ${gdprConsent}, Privacy Policy: ${privacyPolicyAccepted}, Marketing: ${marketingConsent}`);

    res.json({
      success: true,
      clubId: result.insertId,
      clubName: finalClubName,
      email,
      message: 'Registration successful',
    });
  } catch (error) {
    console.error('❌ Registration error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error during registration',
      details: error.message,
    });
  }
});

/**
 * POST /api/clubs/login
 * Authenticate existing club/organization
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: email, password',
      });
    }

    // Query database to get the club with password hash
    const [rows] = await connection.execute(
      'SELECT id, club_name, email, password_hash, created_at FROM clubs WHERE email = ?',
      [email]
    );

    if (rows.length === 0) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password',
      });
    }

    const club = rows[0];

    // Verify password with bcrypt
    const isPasswordValid = await bcrypt.compare(password, club.password_hash);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password',
      });
    }

    console.log(`✅ Club logged in: ${club.club_name} (${club.email})`);

    res.json({
      success: true,
      club: {
        id: club.id,
        clubName: club.club_name,
        email: club.email,
        createdAt: club.created_at,
      },
      message: 'Login successful',
    });
  } catch (error) {
    console.error('❌ Login error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error during login',
      details: error.message,
    });
  }
});

/**
 * GET /api/clubs/me
 * Get current club info (for session validation)
 */
router.get('/me', async (req, res) => {
  try {
    // In a real app, you'd verify JWT token here
    // For now, we'll accept clubId from query params
    const { clubId } = req.query;

    if (!clubId) {
      return res.status(400).json({
        success: false,
        error: 'Missing clubId parameter',
      });
    }

    const [rows] = await connection.execute(
      'SELECT id, club_name, email, created_at FROM clubs WHERE id = ?',
      [clubId]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Club not found',
      });
    }

    const club = rows[0];

    res.json({
      success: true,
      club: {
        id: club.id,
        clubName: club.club_name,
        email: club.email,
        createdAt: club.created_at,
      },
    });
  } catch (error) {
    console.error('❌ Get club info error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message,
    });
  }
});

export default router;
