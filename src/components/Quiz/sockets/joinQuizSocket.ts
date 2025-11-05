// src/components/Quiz/joinQuizSocket.ts
import type { Socket } from 'socket.io-client';

export type RoomRole = 'player' | 'admin' | 'host';

interface User {
  id: string;
  name: string;
}

export function joinQuizRoom(socket: Socket, roomId: string, user: User, role: RoomRole) {
  socket.emit('join_quiz_room', {
    roomId,
    user: { id: user.id, name: user.name },
    role, // 'player' | 'admin' | 'host'
  });

  // Keep a per-role localStorage key so UIs can distinguish who joined
  localStorage.setItem(`quizUser:${roomId}:${role}`, user.id);

  socket.on('quiz_error', ({ message }: { message: string }) => {
    alert('Join failed: ' + message);
  });

  socket.on('user_joined', ({ user: u, role: r }: { user: User; role: RoomRole }) => {
    // Optional: reduce noise, but nice for debugging
    if (r === role && u.id === user.id) {
      console.log(`✅ ${u.name} joined room ${roomId} as ${r}`);
    }
  });
}

// Convenience wrappers (optional)
export const joinAsPlayer = (s: Socket, roomId: string, u: User) => joinQuizRoom(s, roomId, u, 'player');
export const joinAsAdmin  = (s: Socket, roomId: string, u: User) => joinQuizRoom(s, roomId, u, 'admin');
export const joinAsHost   = (s: Socket, roomId: string, u: User) => joinQuizRoom(s, roomId, u, 'host');

// unchanged
export function verifyRoomAndPlayer(
  socket: Socket,
  roomId: string,
  playerId: string,
  callback: (data: { roomExists: boolean; playerApproved: boolean }) => void
) {
  socket.emit('verify_quiz_room_and_player', { roomId, playerId });
  socket.once('quiz_room_player_verification_result', (data) => {
    callback(data);
  });
}



