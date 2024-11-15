const rooms = new Map();

export function createRoom(roomId, hostId) {
  rooms.set(roomId, {
    players: new Map(),
    gameStarted: false,
    currentNumber: null,
    calledNumbers: [],
    autoPlay: false,
    hostId,
    winnerId: null
  });
  return rooms.get(roomId);
}

export function getRoom(roomId) {
  return rooms.get(roomId);
}

export function deleteRoom(roomId) {
  return rooms.delete(roomId);
}

export function emitRoomUpdate(roomId, io) {
  const room = rooms.get(roomId);
  if (!room) return;

  io.to(roomId).emit('room_update', {
    players: Array.from(room.players.values()),
    gameStarted: room.gameStarted,
    currentNumber: room.currentNumber,
    calledNumbers: room.calledNumbers,
    autoPlay: room.autoPlay,
    winnerId: room.winnerId
  });
}