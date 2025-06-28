// server/quiz/api/community-registration.js
import express from 'express';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Ensure data directory exists
const DATA_DIR = path.join(__dirname, '../../data');
const SUBMISSIONS_FILE = path.join(DATA_DIR, 'community-registrations.json');

async function ensureDataDir() {
  try {
    await fs.access(DATA_DIR);
  } catch {
    await fs.mkdir(DATA_DIR, { recursive: true });
  }
}

async function loadSubmissions() {
  try {
    const data = await fs.readFile(SUBMISSIONS_FILE, 'utf8');
    return JSON.parse(data);
  } catch {
    return [];
  }
}

async function saveSubmission(submission) {
  await ensureDataDir();
  const submissions = await loadSubmissions();
  
  const newSubmission = {
    id: Date.now().toString(),
    timestamp: new Date().toISOString(),
    ...submission
  };
  
  submissions.push(newSubmission);
  await fs.writeFile(SUBMISSIONS_FILE, JSON.stringify(submissions, null, 2));
  return newSubmission;
}

// POST /quiz/api/community-registration
router.post('/', async (req, res) => {
  try {
    const { 
      communityName, 
      contactMethod, 
      contactInfo, 
      userName, 
      ecosystem 
    } = req.body;
    
    // Basic validation
    if (!communityName || !contactMethod || !contactInfo || !userName || !ecosystem) {
      return res.status(400).json({ 
        error: 'Missing required fields: communityName, contactMethod, contactInfo, userName, ecosystem' 
      });
    }

    // Basic sanitization - trim whitespace
    const sanitizedData = {
      communityName: communityName.trim(),
      contactMethod: contactMethod.trim(),
      contactInfo: contactInfo.trim(),
      userName: userName.trim(),
      ecosystem: ecosystem.trim()
    };

    // Validate contact method is one of the allowed values
    const allowedContactMethods = ['Email', 'Telegram', 'X (Twitter)'];
    if (!allowedContactMethods.includes(sanitizedData.contactMethod)) {
      return res.status(400).json({ 
        error: 'Invalid contact method. Must be one of: ' + allowedContactMethods.join(', ') 
      });
    }

    console.log('🎉 New community registration:', {
      userName: sanitizedData.userName,
      communityName: sanitizedData.communityName,
      ecosystem: sanitizedData.ecosystem,
      contactMethod: sanitizedData.contactMethod,
      contactInfo: sanitizedData.contactInfo
    });
    
    const submission = await saveSubmission(sanitizedData);

    console.log('💾 Saved submission with ID:', submission.id);
    console.log('📁 Saved to:', SUBMISSIONS_FILE);
    
    res.status(201).json({ 
      success: true, 
      message: 'Community registration submitted successfully!',
      id: submission.id 
    });
    
  } catch (error) {
    console.error('❌ Error saving submission:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /quiz/api/community-registration (for admin viewing)
router.get('/', async (req, res) => {
  try {
    const submissions = await loadSubmissions();
    res.json(submissions);
  } catch (error) {
    console.error('Error loading submissions:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;