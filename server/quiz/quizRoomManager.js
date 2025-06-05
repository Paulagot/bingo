// server/quiz/quizRoomManager.js

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { roundTypeDefinitions } from '../../server/quiz/quizMetadata.js';

// In-memory storage of quiz rooms
const quizRooms = new Map();
const debug = true;

function loadQuestionsForRoundTypes(roundDefinitions) {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const allQuestions = [];

  for (const round of roundDefinitions) {
    const roundType = round.roundType;
    const filePath = path.join(__dirname, '../data/questions', `${roundType}.json`);
    try {
      const data = fs.readFileSync(filePath, 'utf-8');
      const parsed = JSON.parse(data);
      if (!Array.isArray(parsed) || parsed.length === 0) {
        console.warn(`[loadQuestions] ⚠️ No questions for roundType "${roundType}"`);
        continue;
      }
      allQuestions.push(...parsed);
    } catch (err) {
      console.error(`[loadQuestions] ❌ Failed to load "${roundType}.json"`, err);
    }
  }
  return allQuestions;
}

export function createQuizRoom(roomId, hostId, config) {
  console.log('-----------------------------------------');
  console.log(`[createQuizRoom] 🟢 Starting room creation`);
  console.log(`[createQuizRoom] 🧩 roomId=${roomId}, hostId=${hostId}`);
  console.log(`[createQuizRoom] 📦 Incoming config:`);
  console.log(JSON.stringify(config, null, 2));

  if (quizRooms.has(roomId)) {
    const existing = quizRooms.get(roomId);
    const hasPlayers = existing.players.length > 0;
    const isActive = existing.currentPhase !== 'waiting';
    if (hasPlayers || isActive) {
      console.log(`[createQuizRoom] ❌ Room already active: ${roomId}`);
      return false;
    }
    console.log(`[createQuizRoom] ⚠️ Overwriting inactive room: ${roomId}`);
    quizRooms.delete(roomId);
  }

  const roundDefinitions = config.roundDefinitions || [];
  if (!Array.isArray(roundDefinitions) || roundDefinitions.length === 0) {
    console.error(`[createQuizRoom] ❌ No roundDefinitions found`);
    return false;
  }

  console.log(`[createQuizRoom] 📝 Total rounds: ${roundDefinitions.length}`);

  const questions = loadQuestionsForRoundTypes(roundDefinitions);
  console.log(`[createQuizRoom] 📚 Loaded total questions: ${questions.length}`);

  if (!questions.length) {
    console.error(`[createQuizRoom] ❌ No questions loaded`);
    return false;
  }

  const finalConfig = { ...config, roundCount: roundDefinitions.length };
  quizRooms.set(roomId, {
    hostId,
    config: finalConfig,
    currentQuestionIndex: -1,
    currentRound: 1,
    questions,
    admins: [],
    players: [],
    playerData: {},
    currentPhase: 'waiting',
    createdAt: Date.now()
  });

  console.log(`[createQuizRoom] ✅ Room ${roomId} successfully created`);
  console.log('-----------------------------------------');
  return true;
}


export function getQuizRoom(roomId) {
  return quizRooms.get(roomId);
}

export function emitRoomState(namespace, roomId) {
  const room = quizRooms.get(roomId);
  if (!room) {
    console.warn(`[emitRoomState] ⚠️ Room ${roomId} not found`);
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

  console.log(`[emitRoomState] ✅ Emitted room_state for ${roomId}: Round ${room.currentRound}/${totalRounds}, Type: ${roundTypeName}, Players: ${room.players.length}, Phase: ${room.currentPhase}`);
}

// --------------------------
// State update helpers
// --------------------------

export function addOrUpdatePlayer(roomId, player) {
  const room = quizRooms.get(roomId);
  if (!room) return false;

  const existing = room.players.find(p => p.id === player.id);
  if (existing) {
    Object.assign(existing, player);
    if (debug) console.log(`[addOrUpdatePlayer] Updated existing player: ${player.id}`);
  } else {
    room.players.push(player);
    if (debug) console.log(`[addOrUpdatePlayer] Added new player: ${player.id}`);
  }

  room.playerData[player.id] = room.playerData[player.id] || {
    status: 'active',
    usedClues: 0,
    usedCluesThisRound: 0,
    usedLifeline: false,
    usedSecondChance: false,
    score: 0,
    answers: {},
    purchases: {
      lifeline: (player.extras || []).includes('lifeline'),
      secondChance: (player.extras || []).includes('secondChance')
    }
  };

  return true;
}

export function updateHostSocketId(roomId, socketId) {
  const room = quizRooms.get(roomId);
  if (!room) return false;
  room.hostSocketId = socketId;
  return true;
}

export function updateAdminSocketId(roomId, adminId, socketId) {
  const room = quizRooms.get(roomId);
  if (!room) return false;
  const admin = room.admins.find(a => a.id === adminId);
  if (!admin) return false;
  admin.socketId = socketId;
  return true;
}

export function updatePlayerSocketId(roomId, playerId, socketId) {
  const room = quizRooms.get(roomId);
  if (!room) return false;
  const player = room.players.find(p => p.id === playerId);
  if (!player) return false;
  player.socketId = socketId;
  return true;
}

export function addAdminToQuizRoom(roomId, admin) {
  const room = quizRooms.get(roomId);
  if (!room) return false;
  const exists = room.admins.find(a => a.id === admin.id);
  if (!exists) room.admins.push(admin);
  return true;
}

// --------------------------
// Gameplay helpers
// --------------------------

export function advanceToNextQuestion(roomId) {
  const room = quizRooms.get(roomId);
  if (!room) return null;
  room.currentQuestionIndex++;
  if (room.currentQuestionIndex >= room.questions.length) return null;
  if (debug) console.log(`[advanceToNextQuestion] 🔄 Room ${roomId} now at Q#${room.currentQuestionIndex}`);
  return room.questions[room.currentQuestionIndex];
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
    console.log(`[removeQuizRoom] ✅ Removed room ${roomId}`);
    return true;
  }
  console.log(`[removeQuizRoom] ❌ Room not found: ${roomId}`);
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

export function resetRoundClueTracking(roomId) {
  const room = quizRooms.get(roomId);
  if (!room) return;
  for (const pid of Object.keys(room.playerData)) {
    room.playerData[pid].usedCluesThisRound = 0;
  }
  if (debug) console.log(`[resetRoundClueTracking] 🔄 Reset clues for ${roomId}`);
}

export function useClue(roomId, playerId) {
  const room = quizRooms.get(roomId);
  if (!room) return false;
  const playerData = room.playerData[playerId];
  if (!playerData) return false;

  playerData.usedClues++;
  playerData.usedCluesThisRound++;
  if (debug) console.log(`[useClue] 💡 Player ${playerId} used clue in room ${roomId}`);
  return true;
}










