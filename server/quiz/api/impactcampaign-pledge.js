// server/quiz/api/impactcampaign-pledge.js
import express from 'express';
import { connection, TABLE_PREFIX } from '../../config/database.js';
import crypto from 'node:crypto';

const router = express.Router();
const TABLE = `${TABLE_PREFIX}impact_campaign_pledges`;

function uuid() {
  if (crypto?.randomUUID) return crypto.randomUUID();
  // fallback
  return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c =>
    (c ^ (crypto.randomBytes(1)[0] & (15 >> (c / 4)))).toString(16)
  );
}

const allowedContactMethods = ['Email', 'Telegram', 'X (Twitter)'];

router.post('/', async (req, res) => {
     console.log('🟢 [DB ROUTE HIT] POST /quiz/api/impactcampaign/pledge');
  try {
    const {
      communityName,
      contactMethod,
      contactInfo,
      userName,
      ecosystem,
    } = req.body ?? {};

    // Validate
    if (!communityName || !contactMethod || !contactInfo || !userName || !ecosystem) {
      return res.status(400).json({ error: 'Missing required fields.' });
    }
    if (!allowedContactMethods.includes(contactMethod)) {
      return res.status(400).json({ error: `Invalid contactMethod. Allowed: ${allowedContactMethods.join(', ')}` });
    }

    // Sanitize (basic trim)
    const data = {
      id: uuid(),
      community_name: String(communityName).trim(),
      user_name: String(userName).trim(),
      contact_method: String(contactMethod).trim(),
      contact_info: String(contactInfo).trim(),
      ecosystem: String(ecosystem).trim(),
      source_ip: req.headers['x-forwarded-for']?.toString().split(',')[0]?.trim() || req.socket?.remoteAddress || null,
      user_agent: req.get('user-agent') || null,
    };

    const sql = `
      INSERT INTO \`${TABLE}\`
        (id, community_name, user_name, contact_method, contact_info, ecosystem, source_ip, user_agent)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const params = [
      data.id,
      data.community_name,
      data.user_name,
      data.contact_method,
      data.contact_info,
      data.ecosystem,
      data.source_ip,
      data.user_agent,
    ];

    await connection.execute(sql, params);

    return res.status(201).json({
      success: true,
      id: data.id,
      message: 'Pledge stored',
    });
  } catch (err) {
    console.error('❌ Pledge insert error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// (Optional) Simple admin list (paginate later if needed)
router.get('/', async (_req, res) => {
  try {
    const [rows] = await connection.execute(
      `SELECT id, created_at, community_name, user_name, contact_method, contact_info, ecosystem
       FROM \`${TABLE}\`
       ORDER BY created_at DESC
       LIMIT 500`
    );
    res.json(rows);
  } catch (err) {
    console.error('❌ Fetch pledges error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
