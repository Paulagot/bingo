// quizRoomManager.js
// Updated to support combined_questions.json and global question tracking

import fs from 'fs';

import path from 'path';
import { fileURLToPath } from 'url';
import { roundTypeDefinitions, fundraisingExtraDefinitions } from '../quiz/quizMetadata.js';
import { handleGlobalExtra } from './handlers/globalExtrasHandler.js';
import { resetGlobalExtrasForNewRound } from './handlers/globalExtrasHandler.js';
import { FreezeService } from '../quiz/gameplayEngines/services/FreezeServices.js';
import { getPersonalisedRoundByRoom } from '../mgtsystem/services/quizPersonalisedRoundService.js';

const quizRooms = new Map();
const debug = false;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


const resolveClosestPath = () => {
  // Adjust this to your actual file location if different
  // e.g. server/quiz/quizRoomManager.js -> closest.json is at server/data/questions/closest.json
  return path.resolve(process.cwd(), 'server/data/questions/closest.json');
};


/**
 * NEW: Load tie-breaker closest-number questions
 */
export function loadClosestNumberBank() {
  try {
    const filePath = resolveClosestPath();
    const raw = fs.readFileSync(filePath, 'utf-8');
    const arr = JSON.parse(raw);

    const questions = (Array.isArray(arr) ? arr : []).map((q, i) => ({
      id: q.id ?? String(i + 1),
      text: q.text ?? q.question ?? '',
      answerNumber: Number(q.answerNumber ?? q.answer ?? q.value),
    })).filter(q => q.text && Number.isFinite(q.answerNumber));

    // ✅ Shuffle so every game starts from a random position in the bank
    for (let i = questions.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [questions[i], questions[j]] = [questions[j], questions[i]];
    }

    return questions;
  } catch (e) {
    console.error('[TB] failed to load closest.json:', e?.message);
    return [];
  }
}

function toInjectedWipeoutRound(personalised) {
  const qs = Array.isArray(personalised?.questions) ? personalised.questions : [];
  const count = Math.min(qs.length, 6);

  return {
    roundType: 'wipeout',
    category: null,        // you said: don’t need category
    difficulty: 'medium',  // ✅ keep scoring on medium
    roundNumber: 1,        // temporary, we renumber after insert
    config: {
      questionsPerRound: count, // ✅ 6 max
      timePerQuestion: 22,      // keep wipeout defaults unless you want 30
      // keep any wipeout penalties if your scoring uses them:
      pointsLostPerWrong: 2,
      pointsLostPerUnanswered: 3,
    },

    // ✅ marker fields so wipeoutEngine can detect it
    isPersonalised: true,
    personalisedRoundId: personalised.id,
  };
}

function renumberRounds(rounds) {
  return rounds.map((r, idx) => ({ ...r, roundNumber: idx + 1 }));
}

export async function applyPersonalisedRoundIfAny(roomId, clubId) {
  const room = quizRooms.get(roomId);
  if (!room) return false;
  if (room.personalisedUsed) return true;

  const personalised = await getPersonalisedRoundByRoom({ roomId, clubId });
  if (!personalised || personalised.isEnabled === false) {
    room.personalisedUsed = true;
    return false;
  }

  const qCount = Array.isArray(personalised.questions) ? personalised.questions.length : 0;
  if (qCount === 0) {
    room.personalisedUsed = true;
    return false;
  }

  // store it for engine use
  room.personalisedRound = personalised;

  // inject into config.roundDefinitions
  const base = Array.isArray(room.config.roundDefinitions) ? room.config.roundDefinitions : [];
  const injectedRound = toInjectedWipeoutRound(personalised);

  const merged =
    personalised.position === 'first'
      ? [injectedRound, ...base]
      : [...base, injectedRound];

  room.config.roundDefinitions = renumberRounds(merged);
  room.config.roundCount = room.config.roundDefinitions.length;

  room.personalisedUsed = true;

  console.log('[quizRoomManager] ✅ Personalised round injected', {
    roomId,
    position: personalised.position,
    questions: Math.min(qCount, 6),
    totalRounds: room.config.roundCount,
  });

  return true;
}



/**
 * NEW: Load questions from combined_questions.json with global duplicate prevention
 * Replaces the old roundType-specific loading
 */
export function loadQuestionsFromCombinedFile(roomId, category = null, difficulty = null, requiredCount = null) {
  const filePath = path.join(__dirname, '../data/questions', 'combined_questions.json');
  
  if (debug) {
    console.log(`[quizRoomManager] 🔍 Loading questions from combined file for room ${roomId}`);
    console.log(`[quizRoomManager] 📁 File path: ${filePath}`);
    if (category) console.log(`[quizRoomManager] 🏷️ Category filter: "${category}"`);
    if (difficulty) console.log(`[quizRoomManager] ⭐ Difficulty filter: "${difficulty}"`);
    if (requiredCount) console.log(`[quizRoomManager] 🎯 Required questions: ${requiredCount}`);
  }
  
  try {
    const data = fs.readFileSync(filePath, 'utf-8');
    const parsed = JSON.parse(data);
    
    if (!Array.isArray(parsed) || parsed.length === 0) {
      console.warn(`[quizRoomManager] ⚠️ No questions found in "combined_questions.json"`);
      return [];
    }
    
    if (debug) {
      console.log(`[quizRoomManager] 📚 Raw questions loaded: ${parsed.length}`);
    }
    
    // Get the room to access used questions
    const room = quizRooms.get(roomId);
    const usedQuestionIds = room?.usedQuestionIds || new Set();
    
    if (debug) {
      console.log(`[quizRoomManager] 🚫 Previously used questions: ${usedQuestionIds.size}`);
    }
    
    // Filter out already used questions FIRST
    let availableQuestions = parsed.filter(q => !usedQuestionIds.has(q.id));
    
    if (debug) {
      console.log(`[quizRoomManager] ✅ Available questions after global filter: ${availableQuestions.length}`);
    }
    
    // Apply category filter if specified
    if (category) {
      availableQuestions = availableQuestions.filter(q => {
        const questionCategory = q.category || '';
        return questionCategory.toLowerCase() === category.toLowerCase();
      });
      
      if (debug) {
        console.log(`[quizRoomManager] 🏷️ After category "${category}" filter: ${availableQuestions.length} questions`);
      }
    }
    
    // Apply difficulty filter if specified
    if (difficulty) {
      availableQuestions = availableQuestions.filter(q => {
        const questionDifficulty = q.difficulty || '';
        return questionDifficulty.toLowerCase() === difficulty.toLowerCase();
      });
      
      if (debug) {
        console.log(`[quizRoomManager] ⭐ After difficulty "${difficulty}" filter: ${availableQuestions.length} questions`);
      }
    }
    
    // Check if we have enough questions after filtering
    if (availableQuestions.length === 0) {
      console.error(`[quizRoomManager] ❌ No questions available for category="${category}", difficulty="${difficulty}" (${usedQuestionIds.size} already used)`);
      return [];
    }
    
    if (requiredCount && availableQuestions.length < requiredCount) {
      console.warn(`[quizRoomManager] ⚠️ Only ${availableQuestions.length} questions available (${category}/${difficulty}), but ${requiredCount} required`);
    }
    
    // Success log with breakdown
    if (debug) {
      console.log(`[quizRoomManager] ✅ Successfully filtered to ${availableQuestions.length} available questions`);
      
      // Log breakdown by difficulty and category of filtered results
      const breakdown = availableQuestions.reduce((acc, q) => {
        const cat = q.category || 'unknown';
        const diff = q.difficulty || 'unknown';
        const key = `${cat}/${diff}`;
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      }, {});
      if (debug) console.log(`[quizRoomManager] 📊 Available question breakdown:`, breakdown);
    }
    
    return availableQuestions;
    
  } catch (err) {
    if (err.code === 'ENOENT') {
      console.error(`[quizRoomManager] ❌ Question file not found: "combined_questions.json"`);
    } else if (err instanceof SyntaxError) {
      console.error(`[quizRoomManager] ❌ Invalid JSON in "combined_questions.json"`, err.message);
    } else {
      console.error(`[quizRoomManager] ❌ Failed to load "combined_questions.json"`, err);
    }
    return [];
  }
}

/**
 * DEPRECATED: Old function kept for backward compatibility
 * This should not be used anymore, but keeping it to avoid breaking existing code
 */
export function loadQuestionsForRoundType(roundType, category = null, difficulty = null, requiredCount = null) {
  console.warn(`[quizRoomManager] ⚠️ DEPRECATED: loadQuestionsForRoundType called. Use loadQuestionsFromCombinedFile instead.`);
  
  // For backward compatibility, we'll generate a temporary room ID
  // In practice, this should not be called anymore
  const tempRoomId = 'temp_' + Date.now();
  return loadQuestionsFromCombinedFile(tempRoomId, category, difficulty, requiredCount);
}

/**
 * NEW: Mark questions as used for a room to prevent duplicates
 */
export function markQuestionsAsUsed(roomId, questions) {
  const room = quizRooms.get(roomId);
  if (!room) {
    console.warn(`[quizRoomManager] ⚠️ Cannot mark questions as used: Room ${roomId} not found`);
    return;
  }
  
  if (!room.usedQuestionIds) {
    room.usedQuestionIds = new Set();
  }
  
  questions.forEach(question => {
    room.usedQuestionIds.add(question.id);
  });
  
  if (debug) {
    console.log(`[quizRoomManager] ✅ Marked ${questions.length} questions as used for room ${roomId}. Total used: ${room.usedQuestionIds.size}`);
  }
}

/**
 * NEW: Get count of remaining available questions for a room
 */
export function getRemainingQuestionCount(roomId, category = null, difficulty = null) {
  const availableQuestions = loadQuestionsFromCombinedFile(roomId, category, difficulty);
  return availableQuestions.length;
}

export function createQuizRoom(roomId, hostId, config) {
  if (debug) {
    console.log('-----------------------------------------');
    console.log(`[quizRoomManager] 🟢 Starting room creation`);
    console.log(`[quizRoomManager] 🧩 roomId=${roomId}, hostId=${hostId}`);
    console.log(`[quizRoomManager] 📦 Incoming config:\n`, JSON.stringify(config, null, 2));
    console.log(`[quizRoomManager] 📅 Scheduled for: ${config.eventDateTime || 'N/A'} (${config.timeZone || 'N/A'})`);}
  if (config.paymentMethod === 'web3') {
    if (debug) {
      console.log(`[quizRoomManager] 🌐 Web3 Config: Chain=${config.web3Chain}, Token=${config.web3Currency}, Charity=${config.web3Charity}`);
      console.log(`[quizRoomManager] 🎁 Prize Split:`, config.web3PrizeSplit);
      console.log(`[quizRoomManager] 👛 Host Wallet:`, config.hostWallet || 'Not provided');
    }
  }

  if (quizRooms.has(roomId)) {
    const existing = quizRooms.get(roomId);
    const hasPlayers = existing.players.length > 0;
    const isActive = existing.currentPhase !== 'waiting';
    if (hasPlayers || isActive) {
      if (debug) console.log(`[quizRoomManager] ❌ Room already active: ${roomId}`);
      return false;
    }
    if (debug) console.log(`[quizRoomManager] ⚠️ Overwriting inactive room: ${roomId}`);
    quizRooms.delete(roomId);
  }

  const roundDefinitions = config.roundDefinitions || [];
  if (!Array.isArray(roundDefinitions) || roundDefinitions.length === 0) {
    console.error(`[quizRoomManager] ❌ No roundDefinitions found`);
    return false;
  }

  const recDefault = {
  approvedBy: '',
  notes: '',
  approvedAt: null,
  updatedAt: null,
  updatedBy: null,
  ledger: [], 
  prizeAwards: [],
};
const finalConfig = { 
  ...config, 
  roundCount: roundDefinitions.length,
  reconciliation: { ...(config.reconciliation || {}), ...recDefault, ...(config.reconciliation || {}) },
};

  quizRooms.set(roomId, {
    roomCaps: config.roomCaps ?? { maxPlayers: 20, maxRounds: finalConfig.roundCount, roundTypesAllowed: [], extrasAllowed: [] },
    hostId,
    config: finalConfig,
    currentQuestionIndex: -1,
    currentRound: 1,
    questions: [],
    admins: [],
    players: [],
    playerData: {},
    playerSessions: {},
    currentPhase: 'waiting',
    createdAt: Date.now(),
    globalExtrasUsedThisRound: [],
    completedAt: null,
    // NEW: Track used questions globally across all rounds
    usedQuestionIds: new Set(),
    questionBankTiebreak: loadClosestNumberBank(),
    tiebreaker: null,
     tiebreakerAwards: {}, 
       personalisedRound: null,     // ✅ holds DB round + questions once loaded
    personalisedUsed: false,     // ✅ optional: prevent double-inject
  });

  if (debug) console.log(`[quizRoomManager] ✅ Room ${roomId} created with ${roundDefinitions.length} rounds`);
  if (debug) console.log('-----------------------------------------');
  return true;
}

export function updateAssetUploadStatus(roomId, prizeIndex, status, txHash) {
  const room = quizRooms.get(roomId);
  if (!room || !room.config.prizes) return false;
  
  // Find the prize by its place (1-indexed) matching prizeIndex (0-indexed)
  const prizeToUpdate = room.config.prizes.find(p => (p.place - 1) === prizeIndex);
  if (!prizeToUpdate) return false;
  
  // Update the prize object
  prizeToUpdate.uploadStatus = status;
  if (status === 'completed' && txHash) {
    prizeToUpdate.transactionHash = txHash;
    prizeToUpdate.uploadedAt = new Date().toISOString();
  }
  
  if (debug) console.log(`[quizRoomManager] ✅ Updated asset upload for room ${roomId}, prize ${prizeIndex + 1}: ${status}`);
  return true;
}

export function getQuizRoom(roomId) {
  return quizRooms.get(roomId);
}

export function emitRoomState(namespace, roomId) {
  const room = quizRooms.get(roomId);
  if (!room) {
    if (debug) console.log(`[quizRoomManager] ⚠️ emitRoomState skipped - Room ${roomId} not found`);
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
    phase: room.currentPhase,
    caps: room.roomCaps,
    currentReviewIndex: room.currentReviewIndex ?? 0,              // ✅ ADD THIS LINE
    totalReviewQuestions: room.reviewQuestions?.length ?? 0,       // ✅ ADD THIS LINE
  });

  if (debug) console.log(`[quizRoomManager] ✅ Emitted room_state for ${roomId}: Round ${room.currentRound}/${totalRounds}, Type: ${roundTypeName}, Players: ${room.players.length}, Phase: ${room.currentPhase}, Review: ${room.currentReviewIndex ?? 0}/${room.reviewQuestions?.length ?? 0}`);
}

export function addOrUpdatePlayer(roomId, player) {
  const room = quizRooms.get(roomId);
  if (!room) {
    if (debug) console.log(`[quizRoomManager] ❌ addOrUpdatePlayer: Room ${roomId} not found`);
    return false;
  }

  const existing = room.players.find(p => p.id === player.id);
  if (existing) {
    // ✅ Update all player fields including payment info
    Object.assign(existing, player);
    if (debug) console.log(`[quizRoomManager] 🔄 Updated player ${player.id}`, {
      paid: player.paid,
      paymentMethod: player.paymentMethod,
      extras: player.extras
    });
    
    // ✅ CRITICAL FIX: Update purchases AND payment tracking for existing players
    const purchasedExtras = player.extras || [];
    if (room.playerData[player.id]) {
      const playerData = room.playerData[player.id];
      
      // Rebuild purchases object based on current extras
      const newPurchases = {};
      const newUsedExtras = {};
      const newUsedExtrasThisRound = {};
      
      for (const extra of purchasedExtras) {
        newPurchases[extra] = true;
        // Preserve used status if it existed
        newUsedExtras[extra] = playerData.usedExtras?.[extra] || false;
        newUsedExtrasThisRound[extra] = playerData.usedExtrasThisRound?.[extra] || false;
      }
      
      playerData.purchases = newPurchases;
      playerData.usedExtras = newUsedExtras;
      playerData.usedExtrasThisRound = newUsedExtrasThisRound;
      
      // ✅ Store payment method for reconciliation
      playerData.paymentMethod = player.paymentMethod;
      playerData.paid = player.paid;
      
      if (debug) {
        console.log(`[quizRoomManager] ✅ Updated playerData for ${player.id}:`, {
          purchases: newPurchases,
          paymentMethod: player.paymentMethod,
          paid: player.paid
        });
      }
    }
  } else {
    room.players.push(player);
    if (debug) console.log(`[quizRoomManager] ➕ Added new player ${player.id}`);
  }

  const purchasedExtras = player.extras || [];
  if (debug) console.log(`[quizRoomManager] 🎯 Player ${player.id} has extras:`, purchasedExtras);

  // Initialize playerData for new players only
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
      cumulativeNegativePoints: 0,
      pointsRestored: 0,
      // ✅ Store payment info for new players
      paymentMethod: player.paymentMethod,
      paid: player.paid
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

  FreezeService.clearExpiredFreezes(roomId, room.currentQuestionIndex);

  if (debug) console.log(`[quizRoomManager] 🔄 Advanced to Q#${room.currentQuestionIndex} in ${roomId}`);
  return room.questions[room.currentQuestionIndex];
}


export function isEndOfRound(roomId) {
  const room = quizRooms.get(roomId);
  if (!room) return false;

  const totalQuestions = Array.isArray(room.questions) ? room.questions.length : 0;
  if (totalQuestions === 0) return false;

  // End of round when we’re on the final loaded question
  return room.currentQuestionIndex >= totalQuestions - 1;
}


export function startNextRound(roomId) {
  const room = quizRooms.get(roomId);
  if (!room) return false;
  room.currentRound++;
  room.currentQuestionIndex = -1;
  room.currentPhase = 'waiting';
  room.questions = [];

  room.reviewQuestions = undefined;
  // NOTE: We do NOT reset usedQuestionIds here - questions remain used across all rounds
  if (debug) console.log(`[quizRoomManager] ⏭️ Started round ${room.currentRound} in ${roomId}`);
  return true;
}

export function setQuestionsForCurrentRound(roomId, questions) {
  
  const room = quizRooms.get(roomId);
  if (!room) return false;
  
  room.questions = questions;

  room.reviewQuestions = undefined; // clear any previous review scope
  
  // NEW: Mark these questions as used globally
  markQuestionsAsUsed(roomId, questions);
  
  if (debug) console.log(`[quizRoomManager] 📘 Questions set for room ${roomId}. Total: ${questions.length}, Global used: ${room.usedQuestionIds.size}`);
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
    if (debug) console.log(`[quizRoomManager] 🗑️ Room removed: ${roomId}`);
    return true;
  }
  if (debug) console.log(`[quizRoomManager] ⚠️ Tried to remove nonexistent room: ${roomId}`);
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

/**
 * NEW: Freeze final leaderboard when quiz completes
 * This creates a snapshot that becomes the single source of truth for prize assignments
 */
export function freezeFinalLeaderboard(roomId) {
  const room = quizRooms.get(roomId);
  if (!room) {
    console.warn(`[quizRoomManager] ⚠️ Cannot freeze leaderboard: Room ${roomId} not found`);
    return null;
  }

  // Build final leaderboard from current player scores
  const finalLeaderboard = room.players
    .map(player => {
      const playerData = room.playerData[player.id];
      return {
        id: player.id,
        name: player.name || player.id,
        score: playerData?.score || 0, // Use playerData.score as single source
        // Optional: include penalty tracking for display
        cumulativeNegativePoints: playerData?.cumulativeNegativePoints || 0,
        pointsRestored: playerData?.pointsRestored || 0,
      };
    })
    .sort((a, b) => b.score - a.score); // Sort descending by score

  console.log('[quizRoomManager] 🏆 Final leaderboard frozen:', {
    roomId,
    rankings: finalLeaderboard.map((p, i) => `${i + 1}. ${p.name}: ${p.score} pts`),
  });

  // Store in reconciliation
  if (!room.config.reconciliation) {
    room.config.reconciliation = { ledger: [], prizeAwards: [] };
  }
  room.config.reconciliation.finalLeaderboard = finalLeaderboard;

  // Mark quiz as completed
  room.completedAt = new Date().toISOString();
  room.config.completedAt = room.completedAt;

  console.log('[quizRoomManager] ✅ Final leaderboard frozen and stored in reconciliation');

  return finalLeaderboard;
}

/**
 * NEW: Check if quiz is complete (to prevent further score updates)
 */
export function isQuizComplete(roomId) {
  const room = quizRooms.get(roomId);
  return room?.currentPhase === 'complete' || !!room?.completedAt;
}

export function resetRoundExtrasTracking(roomId) {
  const room = quizRooms.get(roomId);
  if (!room) {
    console.warn(`[quizRoomManager] ⚠️ resetRoundExtrasTracking skipped: Room ${roomId} not found`);
    return;
  }

  // Reset global extras tracking for new round
  resetGlobalExtrasForNewRound(roomId);

  for (const pid of Object.keys(room.playerData)) {
    const playerData = room.playerData[pid];
    if (!playerData?.usedExtrasThisRound) continue;
    
    // Reset all round-specific tracking
    for (const extra of Object.keys(playerData.usedExtrasThisRound)) {
      playerData.usedExtrasThisRound[extra] = false;
    }
    
    // Clear freeze flags at round start (but not during questions)
    playerData.frozenNextQuestion = false;
    playerData.frozenForQuestionIndex = undefined;
  }

  if (debug) console.log(`[quizRoomManager] 🔄 Round extras reset for ${roomId}`);
}

// IMPROVED: Centralized Extras Handler with better freeze validation
export function handlePlayerExtra(roomId, playerId, extraId, targetPlayerId, namespace) {
  if (debug) console.log(`[BASIC TEST] handlePlayerExtra called with extraId: ${extraId}`);
  const room = getQuizRoom(roomId);
  if (!room) return { success: false, error: 'Room not found' };

  const playerData = room.playerData[playerId];
  if (!playerData) return { success: false, error: 'Player data not found' };

  // DEBUG: Add logging to see what's happening
  if (debug) {
    console.log(`[DEBUG] extraId: "${extraId}"`);
    console.log(`[DEBUG] fundraisingExtraDefinitions:`, fundraisingExtraDefinitions);
    console.log(`[DEBUG] extraDefinition:`, fundraisingExtraDefinitions[extraId]);
  }
  
  // FIXED: Check if this is a global extra with proper type checking
  const extraDefinition = fundraisingExtraDefinitions[extraId];
  const isGlobalExtra = extraDefinition && (
    extraDefinition.applicableTo === 'global' || 
    extraId === 'restorePoints' || 
    extraId === 'robPoints'
  );
  
  if (isGlobalExtra) {
    if (debug) {
      console.log(`[ExtrasHandler] 🌍 Routing global extra "${extraId}" to globalExtrasHandler`);
    }
    return handleGlobalExtra(roomId, playerId, extraId, targetPlayerId, namespace);
  }

  // Continue with round-based logic for freezeOutTeam and buyHint
  if (debug) console.log(`[DEBUG] Not a global extra, continuing with round-based logic...`);

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

  // Mark as used BEFORE executing (in case execution fails, we'll revert below)
  playerData.usedExtras[extraId] = true;
  playerData.usedExtrasThisRound[extraId] = true;

  const result = executeExtra(roomId, playerId, extraId, targetPlayerId, namespace);

  if (result.success) {
    if (debug) console.log(`[ExtrasHandler] ✅ ${extraId} executed successfully for ${playerId}`);
  } else {
    // Revert the usage flags if execution failed
    playerData.usedExtras[extraId] = false;
    playerData.usedExtrasThisRound[extraId] = false;
    if (debug) console.warn(`[ExtrasHandler] ❌ ${extraId} execution failed for ${playerId}: ${result.error}`);
  }

  return result;
}

function executeExtra(roomId, playerId, extraId, targetPlayerId, namespace) {
  if (debug) console.log(`[executeExtra] Called with: ${extraId}, target: ${targetPlayerId}`);
  
  switch (extraId) {
    case 'buyHint':
      if (debug) console.log(`[executeExtra] Executing buyHint`);
      return executeBuyHint(roomId, playerId, namespace);
    case 'freezeOutTeam':
      if (debug) console.log(`[executeExtra] Executing freezeOutTeam`);
      return executeFreezeOutTeam(roomId, playerId, targetPlayerId, namespace);
    default:
      console.error(`[executeExtra] ❌ Unknown extra type: ${extraId}`);
      return { success: false, error: `Unknown extra type: ${extraId}` };
  }
}

// Execute buyHint logic
function executeBuyHint(roomId, playerId, namespace) {
  const room = getQuizRoom(roomId);
  const question = getCurrentQuestion(roomId);
  if (!question || !question.clue) return { success: false, error: 'No clue available for this question' };

  const player = room.players.find(p => p.id === playerId);
  if (!player?.socketId) return { success: false, error: 'Player socket not found' };

  const targetSocket = namespace.sockets.get(player.socketId);
  if (targetSocket) {
    targetSocket.emit('clue_revealed', { clue: question.clue });
    if (debug) console.log(`[ExtrasHandler] 💡 buyHint: sent clue to ${playerId}: "${question.clue}"`);
    return { success: true };
  }

  return { success: false, error: 'Failed to send clue' };
}

// FIXED: Execute freezeOutTeam logic with correct question timing
function executeFreezeOutTeam(roomId, playerId, targetPlayerId, namespace) {
  return FreezeService.setFreeze(roomId, playerId, targetPlayerId);
}

// NEW: Player session management functions
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
  
  // if (debug) console.log(`[SessionTracker] 📊 Updated session for ${playerId}:`, room.playerSessions[playerId]);
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
  const RECONNECT_WINDOW = 60 * 60 * 1000; // 1 hours
  
  for (const playerId in room.playerSessions) {
    const session = room.playerSessions[playerId];
    const timeSinceActive = now - session.lastActive;
    
    if (timeSinceActive > RECONNECT_WINDOW && session.status === 'disconnected') {
      delete room.playerSessions[playerId];
      // if (debug) console.log(`[SessionTracker] 🧹 Cleaned expired session for ${playerId}`);
    }
  }
}













