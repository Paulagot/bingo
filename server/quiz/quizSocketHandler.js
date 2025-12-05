// server/quiz/quizSocketHandler.js

console.log("🔥 Running quizSocketHandler at:", import.meta.url);

import { setupHostHandlers } from './handlers/hostHandlers.js';
import { setupPlayerHandlers } from './handlers/playerHandlers.js';
import { setupSharedHandlers } from './handlers/sharedUtils.js';
import { isRateLimited } from '../socketRateLimiter.js';
import { setupRecoveryHandlers } from './handlers/recoveryHandlers.js';
import { setupReconciliationHandlers } from './handlers/reconciliationHandlers.js';


export function setupQuizSocketHandlers(quizNamespace) {
  console.log('📡 [quiz] Quiz socket handlers setting up');

  quizNamespace.on('connection', (socket) => {
    console.log(`🧠 [quiz] Client connected: ${socket.id}`);

    const socketRooms = socket.rooms ? [...socket.rooms] : [];
    console.log(`[Debug] Socket ${socket.id} is in rooms:`, socketRooms);

    setupHostHandlers(socket, quizNamespace);
    setupPlayerHandlers(socket, quizNamespace);
    setupSharedHandlers(socket, quizNamespace);
    setupRecoveryHandlers(socket, quizNamespace);
     setupReconciliationHandlers(socket, quizNamespace);


    socket.on('disconnect', () => {
      console.log(`❌ [quiz] Client disconnected: ${socket.id}`);
    });

    socket.on('ping', () => {
      socket.emit('pong', { time: Date.now() });
    });
  });

  quizNamespace.on('error', (err) => {
    console.error(`[SocketError] Namespace error:`, err);
  });
}



