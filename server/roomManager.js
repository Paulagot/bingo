// server/roomManager.js
const rooms = new Map();
export function createRoom(roomId, hostId, contractAddress = null, chainId = null, namespace = 'eip155', entryFee = '0') {
  console.log(`🚀 Creating room - roomId: ${roomId}, hostId: ${hostId}, contractAddress: ${contractAddress}, chainId: ${chainId}, namespace: ${namespace}, entryFee: ${entryFee}`);
  
  if (!roomId || !hostId) {
    console.error('❌ Room creation failed: roomId and hostId are required');
    throw new Error('roomId and hostId are required');
  }
  if (rooms.has(roomId)) {
    console.error(`❌ Room creation failed: Room ${roomId} already exists`);
    throw new Error(`Room ${roomId} already exists`);
  }

  const room = {
    players: new Map(),
    gameStarted: false,
    currentNumber: null,
    calledNumbers: [],
    autoPlay: false,
    hostId,
    contractAddress,
    chainId,
    namespace, // ✅
    lineWinners: [],
    fullHouseWinners: [],
    isPaused: false,
    lineWinClaimed: false,
    createdAt: Date.now(),
    paymentsFinalized: false,
    hostWallet: null,
    entryFee, // ✅ now properly added!
  };

  rooms.set(roomId, room);
  console.log(`✅ Room ${roomId} created successfully at ${new Date(room.createdAt).toISOString()}`);
  console.log(`🔍 Room details: Host: ${hostId}, Contract: ${contractAddress}, Chain: ${chainId}, Namespace: ${namespace}, Entry Fee: ${entryFee}`);
  return room;
}



export function getRoom(roomId) {
  console.log(`🔍 Getting room - roomId: ${roomId}`);
  if (!roomId) {
    console.warn('⚠️ getRoom called with null/undefined roomId');
    return null;
  }
  const room = rooms.get(roomId);
  if (!room) {
    console.warn(`⚠️ Room ${roomId} not found`);
    return null;
  }
  console.log(`✅ Found room ${roomId} with ${room.players.size} players`);
  return room;
}

export function deleteRoom(roomId) {
  console.log(`🗑️ Deleting room - roomId: ${roomId}`);
  if (!roomId) {
    console.warn('⚠️ deleteRoom called with null/undefined roomId');
    return false;
  }
  const deleted = rooms.delete(roomId);
  console.log(`${deleted ? '✅' : '❌'} Room ${roomId} ${deleted ? 'deleted' : 'not found'}`);
  return deleted;
}

export function emitRoomUpdate(roomId, io) {
  console.log(`📢 Emitting room update - roomId: ${roomId}`);
  const room = getRoom(roomId);
  if (!room) {
    console.warn(`⚠️ Cannot emit update - Room ${roomId} not found`);
    return;
  }

  const playersArray = Array.from(room.players.values());
  const roomState = {
    players: playersArray,
    gameStarted: room.gameStarted,
    currentNumber: room.currentNumber,
    calledNumbers: room.calledNumbers,
    autoPlay: room.autoPlay,
    lineWinners: room.lineWinners,
    fullHouseWinners: room.fullHouseWinners,
    isPaused: room.isPaused,
    lineWinClaimed: room.lineWinClaimed,
    gameOver: room.gameOver || false,
    contractAddress: room.contractAddress || null,
    chainId: room.chainId || null,
    namespace: room.namespace || 'eip155', // ✅ Added here
    paymentsFinalized: room.paymentsFinalized || false,
    entryFee: room.entryFee || '0',
  };

  console.log(`📣 Sending room_update for ${roomId} with ${playersArray.length} players`);
  console.log(`🔍 Room state: Started: ${roomState.gameStarted}, Current number: ${roomState.currentNumber}, Numbers called: ${roomState.calledNumbers.length}`);
  console.log(`🏆 Winners - Line: ${roomState.lineWinners.length}, Full House: ${roomState.fullHouseWinners.length}`);
  io.to(roomId).emit('room_update', roomState);
}

export function setContractAddress(roomId, address, chainId) {
  console.log(`🔄 Setting contract - roomId: ${roomId}, address: ${address}, chainId: ${chainId}`);
  const room = rooms.get(roomId);
  if (room) {
    console.log(`💾 Setting contract address for room ${roomId}: ${address} on chain ${chainId}`);
    room.contractAddress = address;
    room.chainId = chainId;
  } else {
    console.warn(`⚠️ Cannot set contract - Room ${roomId} not found`);
  }
}

export function setPaymentsFinalized(roomId, status = true) {
  console.log(`💰 Setting payments finalized - roomId: ${roomId}, status: ${status}`);
  const room = rooms.get(roomId);
  if (room) {
    room.paymentsFinalized = status;
    console.log(`✅ Payments finalized status set to ${status} for room ${roomId}`);
  } else {
    console.warn(`⚠️ Cannot set payments finalized - Room ${roomId} not found`);
  }
}

export function logAllRooms() {
  console.log(`\n[RoomManager] 🧾 Logging all active rooms (${rooms.size} total):`);

  const roomSummaries = [];

  for (const [roomId, room] of rooms.entries()) {
    const summary = {
      roomId,
      playerCount: room.players.size,
      hostId: room.hostId,
      chain: `${room.namespace}:${room.chainId || 'unknown'}`,
      contractAddress: room.contractAddress || 'N/A',
      gameStarted: room.gameStarted,
      gameOver: room.gameOver || false,
      paymentsFinalized: room.paymentsFinalized,
      roomAgeSeconds: Math.floor((Date.now() - room.createdAt) / 1000),
      calledNumbersCount: room.calledNumbers.length,
      lineWinnersCount: room.lineWinners.length,
      fullHouseWinnersCount: room.fullHouseWinners.length,
    };

    console.log(`📦 Room: ${summary.roomId}`);
    console.log(`   👥 Players: ${summary.playerCount}`);
    console.log(`   🧑 Host ID: ${summary.hostId}`);
    console.log(`   🌐 Chain: ${summary.chain}`);
    console.log(`   💼 Contract: ${summary.contractAddress}`);
    console.log(`   🎮 Game Started: ${summary.gameStarted}`);
    console.log(`   🏁 Game Over: ${summary.gameOver}`);
    console.log(`   💸 Payments Finalized: ${summary.paymentsFinalized}`);
    console.log(`   ⌛ Room Age: ${summary.roomAgeSeconds}s`);
    console.log(`   🧾 Called Numbers: ${summary.calledNumbersCount}`);
    console.log(`   🏆 Line Winners: ${summary.lineWinnersCount}`);
    console.log(`   🏆 Full House Winners: ${summary.fullHouseWinnersCount}`);
    console.log('----------------------------------------');

    roomSummaries.push(summary);
  }

  if (rooms.size === 0) {
    console.log('[RoomManager] 🚫 No active rooms');
  }

  return roomSummaries;
}

