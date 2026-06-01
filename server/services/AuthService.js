// server/services/AuthService.js
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { connection as database } from '../config/database.js';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-dev-secret';
const CONSENT_VERSION = process.env.CONSENT_VERSION || '1.0';
const PREFIX = process.env.DB_TABLE_PREFIX || 'fundraisely_';

export class AuthService {

  async register(req, res) {
    try {
      const {
        clubName,
        personName,
        email,
        password,
        reportingCurrency = 'EUR',
        gdprConsent,
        privacyPolicyAccepted,
        marketingConsent = false
      } = req.body;

      if (!clubName || !personName || !email || !password) {
        return res.status(400).json({
          error: 'Club name, your name, email, and password are required'
        });
      }
      if (!gdprConsent || !privacyPolicyAccepted) {
        return res.status(400).json({
          error: 'GDPR consent and privacy policy acceptance are required'
        });
      }

      // Check email not already registered
      const [existing] = await database.execute(
        `SELECT id FROM ${PREFIX}clubs WHERE email = ?`,
        [email]
      );
      if (Array.isArray(existing) && existing.length > 0) {
        return res.status(400).json({ error: 'Club with this email already exists' });
      }

      const clientIp    = req.ip || req.connection?.remoteAddress || 'unknown';
      const userAgent   = req.get('User-Agent') || 'unknown';
      const consentDate = new Date();
      const hashedPassword = await bcrypt.hash(password, 12);
      const clubId = uuidv4();
      const userId = uuidv4();

      const conn = await database.getConnection();
      try {
        await conn.beginTransaction();

        // 1. Insert club
        await conn.execute(
          `INSERT INTO ${PREFIX}clubs (id, name, email, reporting_currency)
           VALUES (?, ?, ?, ?)`,
          [clubId, clubName, email, reportingCurrency]
        );

        // 2. Insert owner user — personName goes here, not clubName
        await conn.execute(
          `INSERT INTO ${PREFIX}users (
            id, club_id, name, email, password_hash, password_updated_at, role,
            gdpr_consent, privacy_policy_accepted, marketing_consent,
            consent_date, consent_ip, consent_user_agent
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            userId, clubId, personName, email, hashedPassword, consentDate,
            'owner',
            gdprConsent ? 1 : 0,
            privacyPolicyAccepted ? 1 : 0,
            marketingConsent ? 1 : 0,
            consentDate, clientIp, userAgent
          ]
        );

        // 3. Seed FREE plan
        let freePlanId = 1;
        try {
          const [[planRow]] = await conn.execute(
            `SELECT id FROM ${PREFIX}plans WHERE code = 'FREE' LIMIT 1`
          );
          if (planRow?.id) freePlanId = planRow.id;
        } catch { /* plans table may not exist yet */ }

        await conn.execute(
          `INSERT INTO ${PREFIX}club_plan (club_id, plan_id, game_credits_remaining, overrides)
           VALUES (?, ?, ?, ?)`,
          [clubId, freePlanId, 3, null]
        );

        // 4. Consent audit log
        const consentTypes = [
          { type: 'gdpr',           given: gdprConsent },
          { type: 'privacy_policy', given: privacyPolicyAccepted },
          { type: 'marketing',      given: marketingConsent },
        ];
        for (const c of consentTypes) {
          if (c.given) {
            try {
              await conn.execute(
                `INSERT INTO ${PREFIX}consent_log (
                  id, user_id, consent_type, consent_given,
                  consent_date, ip_address, user_agent, consent_version
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [uuidv4(), userId, c.type, 1, consentDate, clientIp, userAgent, CONSENT_VERSION]
              );
            } catch { /* ignore if table absent */ }
          }
        }

        await conn.commit();

        const token = jwt.sign({ userId, clubId }, JWT_SECRET, { expiresIn: '7d' });

        return res.status(201).json({
          message: 'Club registered successfully',
          token,
          user: { id: userId, club_id: clubId, name: personName, email, role: 'owner' },
          club: { id: clubId, name: clubName, email, reporting_currency: reportingCurrency }
        });

      } catch (dbError) {
        await conn.rollback();
        throw dbError;
      } finally {
        conn.release();
      }
    } catch (error) {
      console.error('❌ Registration error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  async login(req, res) {
    try {
      const { club, email, password } = req.body;

      if (!club || !email || !password) {
        return res.status(400).json({ error: 'Club, email, and password are required' });
      }

      const looksLikeUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(club);

      const [rows] = await database.execute(
        `SELECT
           u.id           AS user_id,
           u.club_id,
           u.name         AS user_name,
           u.email        AS user_email,
           u.role,
           u.password_hash,
           c.name         AS club_name,
           c.email        AS club_email,
           c.reporting_currency
         FROM ${PREFIX}users u
         JOIN ${PREFIX}clubs c ON c.id = u.club_id
         WHERE u.email = ?
           AND (${looksLikeUuid ? 'c.id = ? OR ' : ''}c.name = ?)
         LIMIT 1`,
        looksLikeUuid ? [email, club, club] : [email, club]
      );

      if (!Array.isArray(rows) || rows.length === 0) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const data = rows[0];

      if (!data.password_hash) {
        return res.status(401).json({ error: 'This user does not have a password set' });
      }

      const isValid = await bcrypt.compare(password, data.password_hash);
      if (!isValid) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const token = jwt.sign(
        { userId: data.user_id, clubId: data.club_id },
        JWT_SECRET,
        { expiresIn: '7d' }
      );

      return res.json({
        message: 'Login successful',
        token,
        user: {
          id:      data.user_id,
          club_id: data.club_id,
          name:    data.user_name,
          email:   data.user_email,
          role:    data.role
        },
        club: {
          id:                   data.club_id,
          name:                 data.club_name,
          email:                data.club_email,
          reporting_currency:   data.reporting_currency
        }
      });
    } catch (error) {
      console.error('❌ Login error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  async getProfile(req, res) {
    try {
      const [clubRows] = await database.execute(
        `SELECT id, name, email, reporting_currency
         FROM ${PREFIX}clubs WHERE id = ?`,
        [req.club_id]
      );

      if (!Array.isArray(clubRows) || clubRows.length === 0) {
        return res.status(404).json({ error: 'Club not found' });
      }

      return res.json({
        user: req.user,
        club: clubRows[0]
      });
    } catch (error) {
      console.error('❌ Get profile error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
}

export default AuthService;