// server/quiz/api/community-registration.js

import express from 'express';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// (You can delete everything related to saving if permanently deprecated)
// Keep data helpers if you still need GET to work:
const DATA_DIR = path.join(__dirname, '../../data');
const SUBMISSIONS_FILE = path.join(DATA_DIR, 'community-registrations.json');

async function loadSubmissions() {
  try {
    const data = await fs.readFile(SUBMISSIONS_FILE, 'utf8');
    return JSON.parse(data);
  } catch {
    return [];
  }
}

// POST /quiz/api/community-registration (DEPRECATED)
router.post('/', async (_req, res) => {
  console.log('🟡 [JSON ROUTE HIT] POST /quiz/api/community-registration (deprecated)');
  return res.status(410).json({ error: 'Deprecated. Use /quiz/api/impactcampaign/pledge' });
});

// GET /quiz/api/community-registration (still useful for admin viewing)
router.get('/', async (_req, res) => {
  try {
    const submissions = await loadSubmissions();
    res.json(submissions);
  } catch (error) {
    console.error('Error loading submissions:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
