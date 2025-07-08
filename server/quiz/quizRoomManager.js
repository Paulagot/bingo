// quizRoomManager.js
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { roundTypeDefinitions, fundraisingExtraDefinitions } from '../quiz/quizMetadata.js';
import { handleGlobalExtra } from './handlers/globalExtrasHandler.js';


const quizRooms = new Map();
const debug = true;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function loadQuestionsForRoundType(roundType) {
  const filePath = path.join(__dirname, '../data/questions', `${roundType}.json`);
  try {
    const data = fs.readFileSync(filePath, 'utf-8');
    const parsed = JSON.parse(data);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      console.warn(`[quizRoomManager] ⚠️ No questions found for "${roundType}"`);
      return [];
    }
    return parsed;
  } catch (err) {
    console.error(`[quizRoomManager] ❌ Failed to load "${roundType}.json"`, err);
    return [];
  }
}

export function createQuizRoom(roomId, hostId, config) {
  console.log('-----------------------------------------');
  console.log(`[quizRoomManager] 🟢 Starting room creation`);
  console.log(`[quizRoomManager] 🧩 roomId=${roomId}, hostId=${hostId}`);
  console.log(`[quizRoomManager] 📦 Incoming config:\n`, JSON.stringify(config, null, 2));
  console.log(`[quizRoomManager] 📅 Scheduled for: ${config.eventDateTime || 'N/A'} (${config.timeZone || 'N/A'})`);
if (config.paymentMethod === 'web3') {
  console.log(`[quizRoomManager] 🌐 Web3 Config: Chain=${config.web3Chain}, Token=${config.web3Currency}, Charity=${config.web3Charity}`);
  console.log(`[quizRoomManager] 🎁 Prize Split:`, config.web3PrizeSplit);
  console.log(`[quizRoomManager] 👛 Host Wallet:`, config.hostWallet || 'Not provided');
}

  if (quizRooms.has(roomId)) {
    const existing = quizRooms.get(roomId);
    const hasPlayers = existing.players.length > 0;
    const isActive = existing.currentPhase !== 'waiting';
    if (hasPlayers || isActive) {
      console.log(`[quizRoomManager] ❌ Room already active: ${roomId}`);
      return false;
    }
    console.log(`[quizRoomManager] ⚠️ Overwriting inactive room: ${roomId}`);
    quizRooms.delete(roomId);
  }

  const roundDefinitions = config.roundDefinitions || [];
  if (!Array.isArray(roundDefinitions) || roundDefinitions.length === 0) {
    console.error(`[quizRoomManager] ❌ No roundDefinitions found`);
    return false;
  }

  const finalConfig = { ...config, roundCount: roundDefinitions.length };

 quizRooms.set(roomId, {
  hostId,
  config: finalConfig,
  currentQuestionIndex: -1,
  currentRound: 1,
  questions: [],
  admins: [],
  players: [],
  playerData: {},
  playerSessions: {}, // ← ADD THIS LINE ONLY
  currentPhase: 'waiting',
  createdAt: Date.now()
});


  console.log(`[quizRoomManager] ✅ Room ${roomId} created with ${roundDefinitions.length} rounds`);
  console.log('-----------------------------------------');
  return true;
}

export function getQuizRoom(roomId) {
  return quizRooms.get(roomId);
}

export function emitRoomState(namespace, roomId) {
  const room = quizRooms.get(roomId);
  if (!room) {
    console.warn(`[quizRoomManager] ⚠️ emitRoomState skipped - Room ${roomId} not found`);
    return;
  }

  const totalRounds = room.config.roundDefinitions?.length || 1;
  const roundIndex = room.currentRound - 1;
  const roundTypeId = room.config.roundDefinitions?.[roundIndex]?.roundType || '';
  const roundTypeName = roundTypeDefinitions[roundTypeId]?.name || roundTypeId || '';

  namespace.to(roomId).emit('room_state', {
    currentRound: room.currentRound,
    totalRounds,
    roundTypeId,
    roundTypeName,
    totalPlayers: room.players.length,
    phase: room.currentPhase
  });

  console.log(`[quizRoomManager] ✅ Emitted room_state for ${roomId}: Round ${room.currentRound}/${totalRounds}, Type: ${roundTypeName}, Players: ${room.players.length}, Phase: ${room.currentPhase}`);
}

export function addOrUpdatePlayer(roomId, player) {
  const room = quizRooms.get(roomId);
  if (!room) {
    console.warn(`[quizRoomManager] ❌ addOrUpdatePlayer: Room ${roomId} not found`);
    return false;
  }

  const existing = room.players.find(p => p.id === player.id);
  if (existing) {
    Object.assign(existing, player);
    if (debug) console.log(`[quizRoomManager] 🔄 Updated player ${player.id}`);
  } else {
    room.players.push(player);
    if (debug) console.log(`[quizRoomManager] ➕ Added new player ${player.id}`);
  }

  const purchasedExtras = player.extras || [];
  if (debug) console.log(`[quizRoomManager] 🎯 Player ${player.id} has extras:`, purchasedExtras);

  if (!room.playerData[player.id]) {
    const extraPurchases = {};
    const usedExtras = {};
    const usedExtrasThisRound = {};

    for (const extra of purchasedExtras) {
      extraPurchases[extra] = true;
      usedExtras[extra] = false;
      usedExtrasThisRound[extra] = false;
    }

    room.playerData[player.id] = {
      status: 'active',
      score: 0,
      answers: {},
      purchases: extraPurchases,
      usedExtras,
      usedExtrasThisRound,
      frozenNextQuestion: false,
      frozenForQuestionIndex: undefined,
       cumulativeNegativePoints: 0,    // ✅ NEW: Track total negative points across all rounds
  pointsRestored: 0   
    };

    if (debug) console.log(`[quizRoomManager] ✅ Initialized playerData for ${player.id}`);
  }

  return true;
}

export function updateHostSocketId(roomId, socketId) {
  const room = quizRooms.get(roomId);
  if (!room) return false;
  room.hostSocketId = socketId;
  if (debug) console.log(`[quizRoomManager] 🎤 Host socket updated for ${roomId}: ${socketId}`);
  return true;
}

export function updateAdminSocketId(roomId, adminId, socketId) {
  const room = quizRooms.get(roomId);
  if (!room) return false;
  const admin = room.admins.find(a => a.id === adminId);
  if (!admin) return false;
  admin.socketId = socketId;
  if (debug) console.log(`[quizRoomManager] 🛠️ Admin socket updated: ${adminId}`);
  return true;
}

export function updatePlayerSocketId(roomId, playerId, socketId) {
  const room = quizRooms.get(roomId);
  if (!room) return false;
  const player = room.players.find(p => p.id === playerId);
  if (!player) return false;
  player.socketId = socketId;
  if (debug) console.log(`[quizRoomManager] 🎮 Player socket updated: ${playerId}`);
  return true;
}

export function addAdminToQuizRoom(roomId, admin) {
  const room = quizRooms.get(roomId);
  if (!room) return false;
  const exists = room.admins.find(a => a.id === admin.id);
  if (!exists) {
    room.admins.push(admin);
    if (debug) console.log(`[quizRoomManager] ➕ Admin added: ${admin.id}`);
  }
  return true;
}

export function advanceToNextQuestion(roomId) {
  const room = quizRooms.get(roomId);
  if (!room) return null;

  room.currentQuestionIndex++;
  if (room.currentQuestionIndex >= room.questions.length) return null;

  clearExpiredFreezeFlags(roomId);

  if (debug) console.log(`[quizRoomManager] 🔄 Advanced to Q#${room.currentQuestionIndex} in ${roomId}`);
  return room.questions[room.currentQuestionIndex];
}

// ✅ FIXED: Clear freeze flags for players who have missed their question
function clearExpiredFreezeFlags(roomId) {
  const room = quizRooms.get(roomId);
  if (!room) return;

  console.log(`[quizRoomManager] 🔍 clearExpiredFreezeFlags called for ${roomId}, currentQuestionIndex: ${room.currentQuestionIndex}`);

  for (const pid of Object.keys(room.playerData)) {
    const playerData = room.playerData[pid];
    if (playerData?.frozenNextQuestion && playerData?.frozenForQuestionIndex !== undefined) {
      console.log(`[quizRoomManager] 🔍 Player ${pid}: frozenForQuestionIndex=${playerData.frozenForQuestionIndex}, currentQuestionIndex=${room.currentQuestionIndex}`);
      
      if (room.currentQuestionIndex > playerData.frozenForQuestionIndex) {
        playerData.frozenNextQuestion = false;
        const missedQuestion = playerData.frozenForQuestionIndex;
        playerData.frozenForQuestionIndex = undefined;
        if (debug) console.log(`[quizRoomManager] ❄️ Cleared freeze flag for ${pid} (missed question ${missedQuestion})`);
      } else {
        console.log(`[quizRoomManager] 🔍 NOT clearing ${pid}: ${room.currentQuestionIndex} <= ${playerData.frozenForQuestionIndex}`);
      }
    }
  }
}

export function isEndOfRound(roomId) {
  const room = quizRooms.get(roomId);
  if (!room) return false;
  const perRound = room.config.questionsPerRound || 5;
  return ((room.currentQuestionIndex + 1) % perRound) === 0;
}

export function startNextRound(roomId) {
  const room = quizRooms.get(roomId);
  if (!room) return false;
  room.currentRound++;
  room.currentQuestionIndex = -1;
  room.currentPhase = 'waiting';
  room.questions = [];
  if (debug) console.log(`[quizRoomManager] ⏭️ Started round ${room.currentRound} in ${roomId}`);
  return true;
}

export function setQuestionsForCurrentRound(roomId, questions) {
  const room = quizRooms.get(roomId);
  if (!room) return false;
  room.questions = questions;
  if (debug) console.log(`[quizRoomManager] 📘 Questions set for room ${roomId}. Total: ${questions.length}`);
  return true;
}

export function getCurrentQuestion(roomId) {
  const room = quizRooms.get(roomId);
  if (!room) return null;
  return room.questions[room.currentQuestionIndex] || null;
}

export function getTotalRounds(roomId) {
  const room = quizRooms.get(roomId);
  return room?.config.roundCount || 1;
}

export function getCurrentRound(roomId) {
  const room = quizRooms.get(roomId);
  return room?.currentRound || 1;
}

export function removeQuizRoom(roomId) {
  if (quizRooms.has(roomId)) {
    quizRooms.delete(roomId);
    console.log(`[quizRoomManager] 🗑️ Room removed: ${roomId}`);
    return true;
  }
  console.warn(`[quizRoomManager] ⚠️ Tried to remove nonexistent room: ${roomId}`);
  return false;
}

export function listQuizRooms() {
  return Array.from(quizRooms.entries()).map(([id, room]) => ({
    id,
    hostId: room.hostId,
    players: room.players.length,
    admins: room.admins.length,
    started: room.currentRound > 1 || room.currentQuestionIndex > 0
  }));
}

export function resetRoundExtrasTracking(roomId) {
  const room = quizRooms.get(roomId);
  if (!room) {
    console.warn(`[quizRoomManager] ⚠️ resetRoundExtrasTracking skipped: Room ${roomId} not found`);
    return;
  }

  for (const pid of Object.keys(room.playerData)) {
    const playerData = room.playerData[pid];
    if (!playerData?.usedExtrasThisRound) continue;
    
    // ✅ Reset all round-specific tracking
    for (const extra of Object.keys(playerData.usedExtrasThisRound)) {
      playerData.usedExtrasThisRound[extra] = false;
    }
    
    // ✅ Clear freeze flags at round start (but not during questions)
    playerData.frozenNextQuestion = false;
    playerData.frozenForQuestionIndex = undefined;
  }

  if (debug) console.log(`[quizRoomManager] 🔄 Round extras reset for ${roomId}`);
}

// ✅ IMPROVED: Centralized Extras Handler with better freeze validation
export function handlePlayerExtra(roomId, playerId, extraId, targetPlayerId, namespace) {
  console.log(`[BASIC TEST] handlePlayerExtra called with extraId: ${extraId}`);
  const room = getQuizRoom(roomId);
  if (!room) return { success: false, error: 'Room not found' };

  const playerData = room.playerData[playerId];
  if (!playerData) return { success: false, error: 'Player data not found' };

  // ✅ DEBUG: Add logging to see what's happening
  console.log(`[DEBUG] extraId: "${extraId}"`);
  console.log(`[DEBUG] fundraisingExtraDefinitions:`, fundraisingExtraDefinitions);
  console.log(`[DEBUG] extraDefinition:`, fundraisingExtraDefinitions[extraId]);
  
  // ✅ NEW: Check if this is a global extra
 const extraDefinition = fundraisingExtraDefinitions[extraId];
  if ((extraDefinition && extraDefinition.applicableTo === 'global') || extraId === 'restorePoints') {
    if (debug) {
      console.log(`[ExtrasHandler] 🌍 Routing ${extraId === 'restorePoints' ? 'special case restorePoints' : 'global extra'} "${extraId}" to globalExtrasHandler`);
    }
    return handleGlobalExtra(roomId, playerId, extraId, targetPlayerId, namespace);
  }

  console.log(`[DEBUG] Not a global extra, continuing with round-based logic...`);

  

  if (playerData.frozenNextQuestion) {
    console.warn(`[ExtrasHandler] ❄️ ${playerId} is frozen and cannot use extras`);
    return { success: false, error: 'You are frozen and cannot use extras!' };
  }

  if (debug) {
    console.log(`[ExtrasHandler] 🧪 ${playerId} using "${extraId}"${targetPlayerId ? ` on ${targetPlayerId}` : ''}`);
  }

  if (!playerData.purchases[extraId]) {
    return { success: false, error: 'You have not purchased this extra' };
  }

  if (playerData.usedExtras[extraId]) {
    return { success: false, error: 'You have already used this extra in a previous round' };
  }

  playerData.usedExtras[extraId] = true;
  playerData.usedExtrasThisRound[extraId] = true;

  const result = executeExtra(roomId, playerId, extraId, targetPlayerId, namespace);

  if (result.success) {
    console.log(`[ExtrasHandler] ✅ ${extraId} executed successfully for ${playerId}`);
  } else {
    playerData.usedExtras[extraId] = false;
    playerData.usedExtrasThisRound[extraId] = false;
    console.warn(`[ExtrasHandler] ❌ ${extraId} execution failed for ${playerId}: ${result.error}`);
  }

  return result;
}

function executeExtra(roomId, playerId, extraId, targetPlayerId, namespace) {
  switch (extraId) {
    case 'buyHint':
      return executeBuyHint(roomId, playerId, namespace);
    case 'freezeOutTeam':
      return executeFreezeOutTeam(roomId, playerId, targetPlayerId, namespace);
    default:
      return { success: false, error: 'Unknown extra type' };
  }
}

// ✅ Execute buyHint logic
function executeBuyHint(roomId, playerId, namespace) {
  const room = getQuizRoom(roomId);
  const question = getCurrentQuestion(roomId);
  if (!question || !question.clue) return { success: false, error: 'No clue available for this question' };

  const player = room.players.find(p => p.id === playerId);
  if (!player?.socketId) return { success: false, error: 'Player socket not found' };

  const targetSocket = namespace.sockets.get(player.socketId);
  if (targetSocket) {
    targetSocket.emit('clue_revealed', { clue: question.clue });
    console.log(`[ExtrasHandler] 💡 buyHint: sent clue to ${playerId}: "${question.clue}"`);
    return { success: true };
  }

  return { success: false, error: 'Failed to send clue' };
}

// ✅ FIXED: Execute freezeOutTeam logic with correct question timing

  function executeFreezeOutTeam(roomId, playerId, targetPlayerId, namespace) {
  if (!targetPlayerId) return { success: false, error: 'Target player required for freeze' };

  const room = getQuizRoom(roomId);

  if (playerId === targetPlayerId) return { success: false, error: 'You cannot freeze yourself!' };

  const questionsRemaining = room.questions.length - (room.currentQuestionIndex + 1);
  if (questionsRemaining <= 1) return { success: false, error: 'Cannot freeze player - this is the last question of the round!' };

  if (room.currentPhase !== 'asking') return { success: false, error: 'Can only freeze players during active questions!' };

  const targetData = room.playerData[targetPlayerId];
  if (!targetData) return { success: false, error: 'Target player not found' };

  if (targetData.frozenNextQuestion) return { success: false, error: 'That player is already frozen for the next question!' };

  const targetPlayer = room.players.find(p => p.id === targetPlayerId);
  if (!targetPlayer) return { success: false, error: 'Target player not found in room' };

  if (!targetPlayer.socketId) return { success: false, error: 'Target player is not actively connected' };

  if (room.currentQuestionIndex < 0) return { success: false, error: 'Cannot freeze players during round setup!' };

  const freezeForQuestionIndex = room.currentQuestionIndex + 1;

  targetData.frozenNextQuestion = true;
  targetData.frozenForQuestionIndex = freezeForQuestionIndex;
  targetData.frozenBy = playerId;

  if (debug) {
    console.log(`[ExtrasHandler] ❄️ freezeOutTeam: ${targetPlayerId} frozen by ${playerId} for question index ${freezeForQuestionIndex} (Q${freezeForQuestionIndex + 1} to user)`);
  }

  // ❌ No emit here — notification handled in generalTriviaEngine.js when question is sent
  return { success: true };
}

// ✅ NEW: Player session management functions
export function updatePlayerSession(roomId, playerId, sessionData) {
  const room = quizRooms.get(roomId);
  if (!room) return false;
  
  if (!room.playerSessions) {
    room.playerSessions = {};
  }
  
  room.playerSessions[playerId] = {
    ...room.playerSessions[playerId],
    ...sessionData,
    lastActive: Date.now()
  };
  
  if (debug) console.log(`[SessionTracker] 📊 Updated session for ${playerId}:`, room.playerSessions[playerId]);
  return true;
}

export function getPlayerSession(roomId, playerId) {
  const room = quizRooms.get(roomId);
  return room?.playerSessions?.[playerId] || null;
}

export function isPlayerInActiveSession(roomId, playerId) {
  const session = getPlayerSession(roomId, playerId);
  if (!session) return false;
  
  const now = Date.now();
  const timeSinceActive = now - session.lastActive;
  const RECONNECT_WINDOW = 45 * 1000; // 45 seconds
  
  // Player is in active session if:
  // 1. Status is 'playing' AND inPlayRoute is true AND within reconnect window
  if (session.status === 'playing' && session.inPlayRoute && timeSinceActive < RECONNECT_WINDOW) {
    return true;
  }
  
  return false;
}

export function cleanExpiredSessions(roomId) {
  const room = quizRooms.get(roomId);
  if (!room || !room.playerSessions) return;
  
  const now = Date.now();
  const RECONNECT_WINDOW = 45 * 1000; // 45 seconds
  
  for (const playerId in room.playerSessions) {
    const session = room.playerSessions[playerId];
    const timeSinceActive = now - session.lastActive;
    
    if (timeSinceActive > RECONNECT_WINDOW && session.status === 'disconnected') {
      delete room.playerSessions[playerId];
      if (debug) console.log(`[SessionTracker] 🧹 Cleaned expired session for ${playerId}`);
    }
  }
}













