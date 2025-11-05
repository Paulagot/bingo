// server/routes/auth.js
import { Router } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { connection as db, TABLE_PREFIX } from '../config/database.js';
import { authLimiter } from '../middleware/rateLimit.js';
import { validate } from '../middleware/validate.js';
import { z } from 'zod';

const router = Router();

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-dev-secret';

const CLUBS_TABLE = `${TABLE_PREFIX}clubs`;
const USERS_TABLE = `${TABLE_PREFIX}users`;

const registerSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  password: z.string().min(8).max(200),
  gdprConsent: z.boolean(),
  privacyPolicyAccepted: z.boolean(),
  marketingConsent: z.boolean().optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

// POST /clubs/register
router.post('/register', authLimiter, validate(registerSchema), async (req, res) => {
  try {
    const { name, email, password, gdprConsent, privacyPolicyAccepted, marketingConsent } = req.body;

    // Check if club already exists
    const [existingClubs] = await db.execute(
      `SELECT id FROM ${CLUBS_TABLE} WHERE email = ? LIMIT 1`,
      [email]
    );

    if (Array.isArray(existingClubs) && existingClubs.length > 0) {
      return res.status(409).json({ error: 'Club with this email already exists' });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);

    // Create club
    const [clubResult] = await db.execute(
      `INSERT INTO ${CLUBS_TABLE} (name, email, password_hash, gdpr_consent, privacy_policy_accepted, marketing_consent, created_at)
       VALUES (?, ?, ?, ?, ?, ?, NOW())`,
      [name, email, passwordHash, gdprConsent ? 1 : 0, privacyPolicyAccepted ? 1 : 0, marketingConsent ? 1 : 0]
    );

    const clubId = clubResult.insertId;

    // Create default user for the club
    const [userResult] = await db.execute(
      `INSERT INTO ${USERS_TABLE} (club_id, email, role, created_at)
       VALUES (?, ?, ?, NOW())`,
      [clubId, email, 'admin']
    );

    const userId = userResult.insertId;

    // Generate JWT token
    const token = jwt.sign({ userId, clubId }, JWT_SECRET, { expiresIn: '7d' });

    // Fetch created club and user
    const [clubRows] = await db.execute(
      `SELECT id, name, email FROM ${CLUBS_TABLE} WHERE id = ? LIMIT 1`,
      [clubId]
    );
    const [userRows] = await db.execute(
      `SELECT id, club_id, email, role FROM ${USERS_TABLE} WHERE id = ? LIMIT 1`,
      [userId]
    );

    const club = Array.isArray(clubRows) && clubRows[0];
    const user = Array.isArray(userRows) && userRows[0];

    res.status(201).json({
      message: 'Registration successful',
      token,
      club,
      user,
    });
  } catch (error) {
    console.error('[Auth] Registration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /clubs/login
router.post('/login', authLimiter, validate(loginSchema), async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find club by email
    const [clubRows] = await db.execute(
      `SELECT id, name, email, password_hash FROM ${CLUBS_TABLE} WHERE email = ? LIMIT 1`,
      [email]
    );

    if (!Array.isArray(clubRows) || clubRows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const club = clubRows[0];

    // Verify password
    const passwordMatch = await bcrypt.compare(password, club.password_hash);
    if (!passwordMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Find user for this club
    const [userRows] = await db.execute(
      `SELECT id, club_id, email, role FROM ${USERS_TABLE} WHERE club_id = ? LIMIT 1`,
      [club.id]
    );

    const user = Array.isArray(userRows) && userRows.length > 0 ? userRows[0] : null;

    // Generate JWT token
    const token = jwt.sign({ userId: user?.id || club.id, clubId: club.id }, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      message: 'Login successful',
      token,
      club: {
        id: club.id,
        name: club.name,
        email: club.email,
      },
      user: user || {
        id: club.id,
        club_id: club.id,
        email: club.email,
        role: 'admin',
      },
    });
  } catch (error) {
    console.error('[Auth] Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /clubs/me
router.get('/me', async (req, res) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'Access token required' });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (error) {
      return res.status(403).json({ error: 'Invalid token' });
    }

    // Fetch club
    const [clubRows] = await db.execute(
      `SELECT id, name, email FROM ${CLUBS_TABLE} WHERE id = ? LIMIT 1`,
      [decoded.clubId]
    );

    if (!Array.isArray(clubRows) || clubRows.length === 0) {
      return res.status(404).json({ error: 'Club not found' });
    }

    const club = clubRows[0];

    // Fetch user
    const [userRows] = await db.execute(
      `SELECT id, club_id, email, role FROM ${USERS_TABLE} WHERE club_id = ? LIMIT 1`,
      [club.id]
    );

    const user = Array.isArray(userRows) && userRows.length > 0 ? userRows[0] : {
      id: club.id,
      club_id: club.id,
      email: club.email,
      role: 'admin',
    };

    res.json({
      club,
      user,
    });
  } catch (error) {
    console.error('[Auth] Get profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

