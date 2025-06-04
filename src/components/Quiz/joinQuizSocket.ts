//src/components/Quiz/joinQuizSocket.ts
// src/components/Quiz/joinQuizSocket.ts
import type { Socket } from 'socket.io-client';

// We’ll call it “User” now, since that’s what the server is expecting:
interface User {
  id: string;
  name: string;
}

export function joinQuizRoom(socket: Socket, roomId: string, player: User) {
  // 1) Change “player” to “user” and add a literal role string ("player")
  socket.emit('join_quiz_room', {
    roomId,
    user: { id: player.id, name: player.name },
    role: 'player'
  });

  // 2) Listen for errors exactly as before
  socket.on('quiz_error', ({ message }: { message: string }) => {
    alert('Join failed: ' + message);
  });

  // 3) The server now emits “user_joined”
  //    with payload { user, role }. 
  socket.on(
    'user_joined',
    ({ user, role }: { user: User; role: 'host' | 'player' | 'admin' }) => {
      if (role === 'player') {
        console.log(`✅ ${user.name} joined room ${roomId} as a player`);
      }
    }
  );
}

// If your verifyRoomAndPlayer is unchanged, you can leave it alone
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


