import express from 'express';
import { nanoid } from 'nanoid';
import { createQuizRoom } from '../quizRoomManager.js';

const router = express.Router();

router.post('/create-room', (req, res) => {

  const setupConfig = req.body.config;

  console.log('--------------------------------------');
  console.log('[API] 🟢 Received create-room request');
  console.log('[API] 📦 Full incoming config:', JSON.stringify(setupConfig, null, 2));

  const roomId = nanoid(10);
  const hostId = nanoid();

  console.log(`[API] 🛠 Generating roomId=${roomId} hostId=${hostId}`);

  const created = createQuizRoom(roomId, hostId, setupConfig);

  if (!created) {
    console.error('[API] ❌ Failed to create quiz room');
    return res.status(400).json({ error: 'Failed to create room (invalid config or questions missing).' });
  }

  console.log(`[API] ✅ Successfully created room ${roomId}`);
  console.log('--------------------------------------');

  res.status(200).json({ roomId, hostId });
});

export default router;


