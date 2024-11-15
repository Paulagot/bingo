import { clearAutoPlayInterval, startAutoPlay, callNextNumber } from './gameLogic.js';
import { createRoom, getRoom, deleteRoom, emitRoomUpdate } from './roomManager.js';

export function setupSocketHandlers(io) {
  io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    socket.on('join_room', ({ roomId, playerName }) => {
      let room = getRoom(roomId);
      
      if (room?.gameStarted) {
        socket.emit('join_error', { 
          message: 'Cannot join a game that is already in progress' 
        });
        return;
      }
      
      socket.join(roomId);
      
      if (!room) {
        room = createRoom(roomId, socket.id);
      }

      const isFirstPlayer = room.players.size === 0;
      
      room.players.set(socket.id, {
        id: socket.id,
        name: playerName,
        isHost: isFirstPlayer,
        isReady: isFirstPlayer,
        card: null
      });

      emitRoomUpdate(roomId, io);
      console.log(`Player ${playerName} joined room ${roomId}`);
    });

    socket.on('toggle_ready', ({ roomId }) => {
      const room = getRoom(roomId);
      if (!room || !room.players.has(socket.id)) return;

      const player = room.players.get(socket.id);
      if (player.isHost) return;
      
      player.isReady = !player.isReady;
      emitRoomUpdate(roomId, io);
    });

    socket.on('start_game', ({ roomId }) => {
      const room = getRoom(roomId);
      if (!room || !room.players.get(socket.id)?.isHost) return;

      const allPlayers = Array.from(room.players.values());
      const isSinglePlayer = allPlayers.length === 1;
      const nonHostPlayers = allPlayers.filter(p => !p.isHost);
      const allNonHostPlayersReady = nonHostPlayers.every(p => p.isReady);

      if (isSinglePlayer || allNonHostPlayersReady) {
        room.gameStarted = true;
        console.log(`Host started ${isSinglePlayer ? 'solo' : 'multiplayer'} game in room ${roomId}`);
        emitRoomUpdate(roomId, io);
      }
    });

    socket.on('update_card', ({ roomId, card }) => {
      const room = getRoom(roomId);
      if (!room || !room.players.has(socket.id)) return;

      const player = room.players.get(socket.id);
      player.card = card;
      
      io.to(roomId).emit('player_card_update', {
        playerId: socket.id,
        card
      });
    });

    socket.on('call_number', ({ roomId }) => {
      const room = getRoom(roomId);
      if (!room || !room.players.get(socket.id)?.isHost || !room.gameStarted) return;

      const newNumber = callNextNumber(room, roomId, io);
      if (newNumber) {
        console.log(`Number ${newNumber} called in room ${roomId}`);
      }
    });

    socket.on('toggle_auto_play', ({ roomId }) => {
      const room = getRoom(roomId);
      if (!room || !room.players.get(socket.id)?.isHost || !room.gameStarted) return;

      room.autoPlay = !room.autoPlay;
      
      if (room.autoPlay) {
        startAutoPlay(roomId, room, io);
      } else {
        clearAutoPlayInterval(roomId);
      }

      io.to(roomId).emit('auto_play_update', { autoPlay: room.autoPlay });
    });

    socket.on('player_won', ({ roomId }) => {
      const room = getRoom(roomId);
      if (!room || !room.gameStarted) return;

      room.winnerId = socket.id;
      room.gameStarted = false;
      clearAutoPlayInterval(roomId);

      io.to(roomId).emit('game_won', { 
        winnerId: socket.id,
        playerName: room.players.get(socket.id).name 
      });
    });

    socket.on('disconnecting', () => {
      for (const roomId of socket.rooms) {
        const room = getRoom(roomId);
        if (room) {
          room.players.delete(socket.id);
          
          if (room.players.size === 0) {
            deleteRoom(roomId);
            clearAutoPlayInterval(roomId);
          } else if (room.hostId === socket.id) {
            const newHost = room.players.values().next().value;
            newHost.isHost = true;
            newHost.isReady = true;
            room.hostId = newHost.id;
          }
          
          emitRoomUpdate(roomId, io);
        }
      }
    });

    socket.on('disconnect', () => {
      console.log('User disconnected:', socket.id);
    });
  });
}