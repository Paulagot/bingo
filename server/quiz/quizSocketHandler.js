// server/quiz/quizSocketHandler.js

console.log("🔥 Running quizSocketHandler at:", import.meta.url);

import { setupHostHandlers } from './handlers/hostHandlers.js';
import { setupPlayerHandlers } from './handlers/playerHandlers.js';
import { setupSharedHandlers } from './handlers/sharedUtils.js';
import { isRateLimited } from '../socketRateLimiter.js';
import { setupRecoveryHandlers } from './handlers/recoveryHandlers.js';
import { setupReconciliationHandlers } from './handlers/reconciliationHandlers.js';
import { setupPaymentHandlers } from './handlers/paymentHandlers.js';


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
    setupPaymentHandlers(socket, quizNamespace);


  socket.on('disconnect', () => {
  console.log(`❌ [quiz] Client disconnected: ${socket.id}`);
  
  const rooms = Array.from(socket.rooms);
  
  rooms.forEach(roomId => {
    if (roomId === socket.id) return; // Skip default room
    
    const room = getQuizRoom(roomId);
    if (!room) return;
    
    // Check if this was the host
    if (room.hostSocketId === socket.id) {
      console.log(`🎙️ [quiz] Host disconnected from room ${roomId}`);
      
      // Clear any existing cleanup timer
      if (room.cleanupTimer) {
        clearTimeout(room.cleanupTimer);
      }
      
      // Set cleanup timer for 1.5 hours
      const CLEANUP_DELAY = 90 * 60 * 1000; // 1.5 hours
      
      room.cleanupTimer = setTimeout(() => {
        console.log(`🗑️ [quiz] Cleaning up abandoned room ${roomId} after 1.5 hours of host inactivity`);
        
        // Notify any remaining players
        io.of('/quiz').to(roomId).emit('quiz_cancelled', {
          message: 'Host did not return. Quiz has been cancelled.',
          roomId
        });
        
        // Remove the room
        removeQuizRoom(roomId);
      }, CLEANUP_DELAY);
      
      console.log(`⏰ [quiz] Cleanup timer set for room ${roomId} (90 minutes)`);
    }
  });
});

    socket.on('ping', () => {
      socket.emit('pong', { time: Date.now() });
    });
  });

  quizNamespace.on('error', (err) => {
    console.error(`[SocketError] Namespace error:`, err);
  });
}



