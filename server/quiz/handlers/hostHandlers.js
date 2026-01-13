import {
  createQuizRoom,
  getQuizRoom,
  getCurrentRound,
  getTotalRounds,
  resetRoundExtrasTracking,
  startNextRound,
  removeQuizRoom,
  emitRoomState,
   freezeFinalLeaderboard 
} from '../quizRoomManager.js';

import { 
  markRoomAsLive, 
  markRoomAsCompleted, 
  markRoomAsCancelled 
} from './roomStatusManager.js';

import { getEngine } from '../gameplayEngines/gameplayEngineRouter.js';
import { isRateLimited } from '../../socketRateLimiter.js';
import { getCurrentRoundStats } from './globalExtrasHandler.js';
import { getRoundScoring } from './scoringUtils.js';
import { StatsService } from '../gameplayEngines/services/StatsService.js'
import { TiebreakerService } from '../gameplayEngines/services/TiebreakerService.js';
import { saveImpactCampaignEvent } from './saveImpactCampaignEvent.js';
import { syncImpactEventToFundraiselyClubMgmt } from '../handlers/syncImpactEventToFundraiselyClubMgmt.js';
import { rollupFundraiselyCampaignFinancials } from '../handlers/rollupFundraiselyCampaignFinancials.js';


import { logPrizeDistributionInitiated, logPrizeDistributionSuccess, logPrizeDistributionFailure, logWeb3RoomConfig, logWinnerAddressMapping } from './blockchainLoggingHelper.js';
const debug = true;
console.log('[BOOT] hostHandlers loaded from:', import.meta.url);
console.log('[BOOT] saveImpactCampaignEvent typeof:', typeof saveImpactCampaignEvent);


export function setupHostHandlers(socket, namespace) {

  function emitFullRoomState(roomId) {
    const room = getQuizRoom(roomId);
    if (!room) return;
    const cfgWithCaps = { ...room.config, roomCaps: room.roomCaps };
    namespace.to(roomId).emit('room_config', cfgWithCaps);
    namespace.to(roomId).emit('player_list_updated', { players: room.players });
    namespace.to(roomId).emit('admin_list_updated', { admins: room.admins });
    emitRoomState(namespace, roomId);
  }

  // 🆕 --- Debt settlement helpers ------------------------------------------

  function settleBankedScoreAgainstDebt(room) {
  for (const player of room.players) {
    const pd = room.playerData[player.id];
    if (!pd) continue;
    const bank = Math.max(0, pd.score || 0);
    const debt = Math.max(0, pd.penaltyDebt || 0);
    if (debt <= 0 || bank <= 0) continue;

    const settledFromBank = Math.min(bank, debt);
    pd.score = bank - settledFromBank;
    pd.penaltyDebt = debt - settledFromBank;

    console.log(
      `[Settlement] ${player.name}: banked=${bank}, debt=${debt}, ` +
      `settledFromBank=${settledFromBank}, newScore=${pd.score}, carryDebt=${pd.penaltyDebt}`
    );
  }
}

  // 🆕 Sum *positive* points earned this round (from per-question pointsDelta)
  function sumRoundPositive(room, playerId) {
    let total = 0;
    for (const q of room.questions || []) {
      const key = `${q.id}_round${room.currentRound}`;
      const ans = room.playerData[playerId]?.answers?.[key];
      if (ans && typeof ans.pointsDelta === 'number' && ans.pointsDelta > 0) {
        total += ans.pointsDelta;
      }
    }
    return total;
  }


  // 🆕 End-of-round settlement:
  // Use this round's earned positives to pay down penaltyDebt.
  // - Reduces playerData.score by settled amount
  // - Reduces playerData.penaltyDebt by settled amount
  // - Stores pd.settlementThisRound for display (used by round leaderboard)
  function settleRoundDebt(roomId) {
    const room = getQuizRoom(roomId);
    if (!room) return;

    for (const player of room.players) {
      const pd = room.playerData[player.id];
      if (!pd) continue;

      const debt = Math.max(0, pd.penaltyDebt || 0);
      if (debt === 0) {
        pd.settlementThisRound = 0;
        continue;
      }

      const earnedThisRound = sumRoundPositive(room, player.id);
      const settle = Math.min(earnedThisRound, debt);

      if (settle > 0) {
        pd.score = Math.max(0, (pd.score || 0) - settle);
        pd.penaltyDebt = debt - settle;
        pd.settlementThisRound = settle;

        if (debug) {
          console.log(`[Settlement] ${player.name}: earned=${earnedThisRound}, debt=${debt}, settled=${settle}, carryDebt=${pd.penaltyDebt}, newScore=${pd.score}`);
        }
      } else {
        pd.settlementThisRound = 0;
        if (debug) {
          console.log(`[Settlement] ${player.name}: earned=0, debt=${debt}, settled=0, carryDebt=${pd.penaltyDebt}`);
        }
      }
    }
  }

function computeImpactEventTotals(room) {
  const entryFee = Number(room.config?.entryFee || 0);

  const paidPlayers = (room.players || []).filter(
    p => p.paid && !p.disqualified
  );

  const totalEntryReceived = paidPlayers.length * entryFee;

  let extrasRevenue = 0;
  for (const p of room.players || []) {
    if (!p.extraPayments) continue;
    for (const val of Object.values(p.extraPayments)) {
      extrasRevenue += Number(val?.amount || 0);
    }
  }

  const totalRaised = totalEntryReceived + extrasRevenue;

  const split = room.config?.web3PrizeSplit || {};
  const charityPercent = Number(split.charity ?? 0);
  const hostPercent = Number(
    split.host ?? split.hostFee ?? split.hostFeePercent ?? 0
  );

  // ✅ FIX: Use 4 decimals for micro-transactions
  const charityAmount =
    charityPercent > 0
      ? Number((totalRaised * charityPercent / 100).toFixed(4))
      : null;

  const hostFeeAmount =
    hostPercent > 0
      ? Number((totalRaised * hostPercent / 100).toFixed(4))
      : null;

  return {
    entryFee,
    paidPlayersCount: paidPlayers.length,
    totalEntryReceived: Number(totalEntryReceived.toFixed(4)),
    extrasRevenue: Number(extrasRevenue.toFixed(4)),
    totalRaised: Number(totalRaised.toFixed(4)),
    charityPercent,
    hostPercent,
    charityAmount,
    hostFeeAmount,
  };
}


  // ✅ Calculate round-specific leaderboard scores WITHOUT re-applying penalties
 function calculateRoundLeaderboard(roomId) {
  const room = getQuizRoom(roomId);
  if (!room) {
    console.error(`[RoundLeaderboard] ❌ Room not found: ${roomId}`);
    return [];
  }



  if (debug) {
    console.log(`[RoundLeaderboard] 📊 Calculating for Round ${room.currentRound}`);
  }

  const roundLeaderboard = [];

  for (const player of room.players) {
    const playerData = room.playerData[player.id];
    if (!playerData) {
      console.warn(`[RoundLeaderboard] ⚠️ No data found for player ${player.id}`);
      continue;
    }

    // FIXED: Calculate round score properly
    // Round score = current cumulative - score at round start
    const roundStartScore = playerData.roundStartScore || 0;
    const currentCumulativeScore = playerData.score || 0;
    const roundScore = currentCumulativeScore - roundStartScore;

    // REMOVED: No more settlement or debt calculations
    // const settled = playerData.settlementThisRound || 0;
    // const visibleScore = roundScore - settled;

    roundLeaderboard.push({
      id: player.id,
      name: player.name,
      score: roundScore,  // FIXED: This is now the actual round score
      roundScore: roundScore,
    
      // Keep these for backward compatibility but they should be 0
      penaltyDebt: 0,
      settledThisRound: 0,
      cumulativeNegativePoints: playerData.cumulativeNegativePoints || 0,  // ← Make sure this exists
  pointsRestored: playerData.pointsRestored || 0,
      carryDebt: 0
    });

    if (debug) {
      console.log(`[RoundLeaderboard] 🎯 ${player.name}: roundStart=${roundStartScore}, cumulative=${currentCumulativeScore}, roundScore=${roundScore}, cumulativeNegative=${playerData.cumulativeNegativePoints || 0}`);
    }
  }

  // Sort by round score (highest first, allow negatives)
  roundLeaderboard.sort((a, b) => b.score - a.score);

  if (debug) {
    console.log(`[RoundLeaderboard] 🏆 Final Round ${room.currentRound} Rankings:`);
    roundLeaderboard.forEach((entry, index) => {
      console.log(`  ${index + 1}. ${entry.name}: ${entry.score} round points`);
    });
  }

  if (debug) {
  console.log(`[DEBUG] Round leaderboard data being sent:`, JSON.stringify(roundLeaderboard, null, 2));
}


  return roundLeaderboard;
}

  // ✅ Calculate overall cumulative leaderboard
  function calculateOverallLeaderboard(roomId) {
    const room = getQuizRoom(roomId);
    if (!room) {
      console.error(`[OverallLeaderboard] ❌ Room not found: ${roomId}`);
      return [];
    }

    const overallLeaderboard = [];

    for (const player of room.players) {
      const playerData = room.playerData[player.id];
      if (!playerData) {
        console.warn(`[OverallLeaderboard] ⚠️ No data found for player ${player.id}`);
        continue;
      }

      overallLeaderboard.push({
        id: player.id,
        name: player.name,
        score: playerData.score || 0,
        cumulativeNegativePoints: playerData.cumulativeNegativePoints || 0,
        pointsRestored: playerData.pointsRestored || 0,
        penaltyDebt: playerData.penaltyDebt || 0
        
      });
    }

    overallLeaderboard.sort((a, b) => b.score - a.score);

    if (debug) {
      console.log(`[OverallLeaderboard] 🏆 Overall Rankings through Round ${room.currentRound}:`);
      overallLeaderboard.forEach((entry, index) => {
        console.log(`  ${index + 1}. ${entry.name}: ${entry.score} points total`);
      });
    }

    return overallLeaderboard;
  }

  // ---------- Tie-breaker helpers (inside setupHostHandlers) ----------
function findPrizeBoundaryTies(leaderboard, prizeCount) {
  if (!leaderboard?.length) return [];

  const ties = [];

  // First place tie
  const topScore = leaderboard[0]?.score ?? 0;
  const firstGroup = leaderboard.filter(e => (e.score ?? 0) === topScore).map(e => e.id);
  if (firstGroup.length > 1) ties.push({ boundary: 1, playerIds: firstGroup });

  // Other prize boundaries (e.g., tie for 2nd/3rd)
  for (let k = 2; k <= prizeCount; k++) {
    const idx = k - 1;
    const kthScore = leaderboard[idx]?.score;
    if (kthScore == null) continue;
    const group = leaderboard.filter(e => e.score === kthScore).map(e => e.id);
    if (group.length > 1) ties.push({ boundary: k, playerIds: group });
  }

  // De-duplicate
  return ties.filter((t, i, a) => a.findIndex(z => z.boundary === t.boundary) === i);
}

function detectTie(roomId, prizeCount) {
  // Reuse your canonical overall computation
  const leaderboard = calculateOverallLeaderboard(roomId);
  const ties = findPrizeBoundaryTies(leaderboard, prizeCount);
  return ties.length > 0;
}


function maybeStartTiebreaker(
  roomId,
  room,
  namespace,
  { prizeCount = 3, mode = 'closest_number' } = {}
) {
  // 🔒 If a TB is already running, don't start again
  if (room.tiebreaker?.isActive) return true;

  // 🔒 If we already awarded a TB (winner has been applied), do NOT start again
  // (TiebreakerService.resolve sets room.tiebreaker.awarded = true)
  if (room.tiebreaker?.awarded) return false;

  const leaderboard = calculateOverallLeaderboard(roomId);
  const ties = findPrizeBoundaryTies(leaderboard, prizeCount);
  if (!ties.length) return false;

  // Resolve highest-value boundary first
  ties.sort((a, b) => a.boundary - b.boundary);
  const { playerIds } = ties[0];

  room.tiebreaker = {
    isActive: true,
    awarded: false,          // 👈 track award state
    mode,
    participants: playerIds,
    questionIndex: 0,
    history: [],
    winnerIds: [],
  };
  room.currentPhase = 'tiebreaker';

  TiebreakerService.start(room, namespace, roomId);
  if (debug) {
    console.log(
      '[TB] start with participants:',
      room.tiebreaker?.participants,
      'bank size:',
      room.questionBankTiebreak?.length
    );
  }
  return true;
}




  // ✅ Calculate and send final quiz statistics
  function calculateAndSendFinalStats(roomId, namespace) {
    const room = getQuizRoom(roomId);
    if (!room) {
      console.error(`[FinalStats] ❌ Room not found: ${roomId}`);
      return;
    }

    if (debug) {
      console.log(`[FinalStats] 📊 Calculating final stats using stored round data`);
      console.log(`[DEBUG] 🔍 room.storedRoundStats:`, room.storedRoundStats);
      console.log(`[DEBUG] 📝 Available stored rounds:`, Object.keys(room.storedRoundStats || {}));
    }

    const allRoundsStats = [];

    for (let roundIndex = 0; roundIndex < room.config.roundDefinitions.length; roundIndex++) {
      const roundNumber = roundIndex + 1;
      const roundConfig = room.config.roundDefinitions[roundIndex];
      if (!roundConfig) continue;

      let roundStats;

      if (debug) console.log(`[DEBUG] 🔍 Looking for stored stats for round ${roundNumber}:`, {
        hasStoredRoundStats: !!room.storedRoundStats,
        hasThisRound: !!(room.storedRoundStats && room.storedRoundStats[roundNumber]),
        storedData: room.storedRoundStats?.[roundNumber]
      });

      if (room.storedRoundStats && room.storedRoundStats[roundNumber]) {
        roundStats = {
          ...room.storedRoundStats[roundNumber],
          roundType: roundConfig.roundType,
          totalQuestions: roundConfig.config.questionsPerRound || 6
        };

        if (debug) {
          console.log(`[FinalStats] 📊 Round ${roundNumber} stats (from storage):`, {
            questions: `${roundStats.questionsAnswered}/${roundStats.totalQuestions}`,
            answers: `${roundStats.correctAnswers} correct, ${roundStats.wrongAnswers} wrong, ${roundStats.noAnswers} no answer`,
            extras: `${roundStats.totalExtrasUsed} total (H:${roundStats.hintsUsed}, F:${roundStats.freezesUsed}, R:${roundStats.pointsRobbed}, Re:${roundStats.pointsRestored})`
          });
        }
      } else {
        if (debug) console.log(`[DEBUG] ⚠️ No stored data for round ${roundNumber}, using fallback`);
        roundStats = {
          roundNumber,
          roundType: roundConfig.roundType,
          hintsUsed: 0,
          freezesUsed: 0,
          pointsRobbed: 0,
          pointsRestored: 0,
          extrasByPlayer: {},
          questionsWithExtras: 0,
          totalExtrasUsed: 0,
          questionsAnswered: 0,
          totalQuestions: roundConfig.config.questionsPerRound || 6,
          correctAnswers: 0,
          wrongAnswers: 0,
          noAnswers: 0
        };

        room.players.forEach(player => {
          roundStats.extrasByPlayer[player.name] = [];
        });

        if (debug) {
          console.log(`[FinalStats] 📊 Round ${roundNumber} stats (fallback):`, {
            questions: `${roundStats.questionsAnswered}/${roundStats.totalQuestions}`,
            extras: `${roundStats.totalExtrasUsed} total`
          });
        }
      }

      allRoundsStats.push(roundStats);
    }

    namespace.to(`${roomId}:host`).emit('host_final_stats', allRoundsStats);
    room.finalQuizStats = allRoundsStats;

    if (debug) {
      console.log(`[FinalStats] 📈 Final quiz stats sent to host for ${allRoundsStats.length} rounds`);
      const totalExtrasAcrossAllRounds = allRoundsStats.reduce((sum, round) => sum + round.totalExtrasUsed, 0);
      const totalPointsRestored = allRoundsStats.reduce((sum, round) => sum + round.pointsRestored, 0);
      const totalPointsRobbed = allRoundsStats.reduce((sum, round) => sum + round.pointsRobbed, 0);
      const totalHints = allRoundsStats.reduce((sum, round) => sum + round.hintsUsed, 0);
      const totalFreezes = allRoundsStats.reduce((sum, round) => sum + round.freezesUsed, 0);
      console.log(`[FinalStats] 🎯 TOTALS: ${totalExtrasAcrossAllRounds} extras, ${totalPointsRestored} points restored, ${totalPointsRobbed} robs, ${totalHints} hints, ${totalFreezes} freezes`);
    }

    return allRoundsStats;
  }

// UPDATED: generateEnhancedPlayerStats function
// ✅ FIX: Now includes global extras (rob points, restore points) used during leaderboard phase

function generateEnhancedPlayerStats(room, playerId) {
  const playerData = room.playerData[playerId];
  const player = room.players.find(p => p.id === playerId);
  
  if (!playerData || !player) {
    return null;
  }

  // Calculate question performance across all rounds
  const allAnswers = Object.values(playerData.answers || {});
  const totalAnswered = allAnswers.length;
  const correctAnswers = allAnswers.filter(a => a.correct).length;
  const wrongAnswers = allAnswers.filter(a => !a.correct && !a.noAnswer).length;
  const noAnswers = allAnswers.filter(a => a.noAnswer).length;
  
  // ✅ NEW: Handle skipped answers (for speed rounds)
  const skippedAnswers = allAnswers.filter(a => a.skipped).length;
  
  const accuracyRate = totalAnswered > 0 ? Math.round((correctAnswers / totalAnswered) * 100) : 0;

  // Calculate round progression
  const roundContributions = playerData.roundContributions || {};
  const roundScores = Object.values(roundContributions);
  const bestRound = Math.max(...roundScores.map(s => s || 0));
  const worstRound = Math.min(...roundScores.map(s => s || 0));

  // ✅ FIX: Count strategic extras usage INCLUDING global extras
  // Step 1: Get extras from playerData.usedExtras (per-question extras)
  const perQuestionExtras = new Set(
    Object.keys(playerData.usedExtras || {}).filter(key => playerData.usedExtras[key])
  );
  
  // Step 2: Add global extras used by this player across all rounds
  const globalExtrasUsed = room.globalExtrasUsedThisRound || [];
  for (const extra of globalExtrasUsed) {
    if (extra.playerId === playerId) {
      perQuestionExtras.add(extra.extraId);
    }
  }
  
  // Also check previous rounds' global extras if stored
  if (room.globalExtrasHistory) {
    for (const roundExtras of Object.values(room.globalExtrasHistory)) {
      if (Array.isArray(roundExtras)) {
        for (const extra of roundExtras) {
          if (extra.playerId === playerId) {
            perQuestionExtras.add(extra.extraId);
          }
        }
      }
    }
  }

  const extrasUsed = perQuestionExtras.size;
  const extrasTypes = Array.from(perQuestionExtras);

  // ✅ Calculate actual pointsRestored from playerData
  // This should already be correctly tracked in playerData.pointsRestored
  const pointsRestored = playerData.pointsRestored || 0;

  return {
    playerId,
    playerName: player.name,
    
    // Question Performance
    questionPerformance: {
      totalAnswered,
      correctAnswers,
      wrongAnswers, 
      noAnswers,
      skippedAnswers, // ✅ NEW: Include skipped answers for speed rounds
      accuracyRate,
      pointsPerQuestion: totalAnswered > 0 ? Math.round(playerData.score / totalAnswered) : 0
    },
    
    // Round Progression  
    roundProgression: {
      scoreByRound: Object.values(roundContributions),
      bestRoundScore: bestRound,
      worstRoundScore: worstRound,
      totalRounds: Object.keys(roundContributions).length,
      trendDirection: roundScores.length >= 2 && roundScores[roundScores.length - 1] > roundScores[0] ? 'improving' : 'consistent'
    },
    
    // Strategic Play
    strategicPlay: {
      extrasUsed,          // ✅ FIXED: Now includes global extras
      extrasTypes,          // ✅ FIXED: Now includes global extras
      penaltiesReceived: playerData.cumulativeNegativePoints || 0,
      pointsRestored       // ✅ This should already be correct from playerData
    },
    
    // Final Stats
    finalStats: {
      finalScore: playerData.score || 0,
      cumulativeNegativePoints: playerData.cumulativeNegativePoints || 0,
      pointsRestored       // ✅ This should already be correct from playerData
    }
  };
}

  // ✅ next_round_or_end (unchanged)
 // ✅ next_round_or_end (patched to include tiebreaker)
socket.on('next_round_or_end', ({ roomId }) => {
  if (debug) console.log(`[Host] next_round_or_end for ${roomId}`);

  const room = getQuizRoom(roomId);
  if (!room) {
    socket.emit('quiz_error', { message: 'Room not found' });
    return;
  }

  const totalRounds = getTotalRounds(roomId);
  const nextRound = getCurrentRound(roomId) + 1;

  if (nextRound > totalRounds) {
    // --- keep your final round stats update as-is ---
    const finalRoundStats = getCurrentRoundStats(roomId);
    if (room.storedRoundStats && room.storedRoundStats[room.currentRound]) {
      room.storedRoundStats[room.currentRound] = {
        ...room.storedRoundStats[room.currentRound],
        hintsUsed: finalRoundStats.hintsUsed,
        freezesUsed: finalRoundStats.freezesUsed,
        pointsRobbed: finalRoundStats.pointsRobbed,
        pointsRestored: finalRoundStats.pointsRestored,
        extrasByPlayer: finalRoundStats.extrasByPlayer,
        totalExtrasUsed: finalRoundStats.totalExtrasUsed
      };
    }

    // 🔎 Build a preview of the final leaderboard (no emit yet)
    const finalLeaderboardPreview = calculateOverallLeaderboard(roomId);

    // 🧩 Try to start a tiebreaker BEFORE completion
    const prizeCount =
      (Array.isArray(room.config?.prizes) && room.config.prizes.length) ||
      (Array.isArray(room.config?.web3PrizeSplit) && room.config.web3PrizeSplit.length) ||
      3;

   const startedTB = maybeStartTiebreaker(
  roomId,
  room,
  namespace,
  {
    prizeCount,
    mode: room.config?.tiebreakMode ?? 'closest_number',
  }
);

    if (startedTB) {
      // Tiebreaker is now active; pause normal completion flow
      emitRoomState(namespace, roomId);
      return;
    }

    // --- No tie → proceed to completion (original flow) ---
    calculateAndSendFinalStats(roomId, namespace);

  // If tiebreaker already resolved, prefer the merged board it produced
const finalLeaderboard = (room.finalLeaderboard && room.finalLeaderboard.length > 0)
  ? room.finalLeaderboard
  : calculateOverallLeaderboard(roomId);

room.finalLeaderboard = finalLeaderboard; // ensure it's stored
namespace.to(roomId).emit('leaderboard', finalLeaderboard);
namespace.to(`${roomId}:host`).emit('host_final_leaderboard', finalLeaderboard);


    // Enhanced stats per player
   // Enhanced stats per player
    room.players.forEach(player => {
      const playerSocket = namespace.sockets.get(player.socketId);
      if (playerSocket) {
        const enhancedStats = generateEnhancedPlayerStats(room, player.id);
        if (enhancedStats) {
          playerSocket.emit('enhanced_player_stats', enhancedStats);
          if (debug) console.log(`[Complete] 📊 Sent enhanced stats to ${player.name}`);
        }
      }
    });

    // ✅ NEW: Freeze the leaderboard BEFORE setting phase to complete
    room.currentPhase = 'complete';
    const frozenLeaderboard = freezeFinalLeaderboard(roomId);
    
    // ✅ NEW: Send frozen leaderboard in room_config
    if (frozenLeaderboard) {
      namespace.to(roomId).emit('room_config', {
        ...room.config,
        currentPhase: 'complete',
        completedAt: room.completedAt,
        reconciliation: {
          ...room.config.reconciliation,
          finalLeaderboard: frozenLeaderboard,
        },
      });
      
      if (debug) {
        console.log('[Complete] 🏆 Frozen leaderboard sent to clients:', 
          frozenLeaderboard.map((p, i) => `${i + 1}. ${p.name}: ${p.score} pts`)
        );
      }
    }
    
    namespace.to(roomId).emit('quiz_end', { 
      message: 'Quiz complete. Thank you! Prizes being distributed',
      finalLeaderboard: frozenLeaderboard  // ✅ Include in completion event
    });
    emitRoomState(namespace, roomId);
    room.completedAt = Date.now();

    if (debug) console.log(`[Host] ✅ Quiz completed for ${roomId}`);
  } else {
    // Continue to next round
    startNextRound(roomId);
    room.currentPhase = 'waiting';
    emitRoomState(namespace, roomId);
  }
});

// When the TiebreakerService resolves, it emits this so we finish normally.
socket.on('tiebreak:proceed_to_completion', ({ roomId }) => {
  // Re-use the same path; nextRound>totalRounds will still be true,
  // and now there is no tie, so it will fall through to completion.
  socket.emit('next_round_or_end', { roomId });
});


  // ✅ end_quiz_and_distribute_prizes - UPDATED VERSION
 socket.on('end_quiz_and_distribute_prizes', async ({ roomId }) => {
  if (debug) console.log(`[Host] 🏆 end_quiz_and_distribute_prizes for ${roomId}`);

  const room = getQuizRoom(roomId);
  if (!room) {
    socket.emit('quiz_error', { message: 'Room not found' });
    return;
  }

  if (room.hostSocketId !== socket.id) {
    socket.emit('quiz_error', { message: 'Only the host can end the quiz and distribute prizes' });
    return;
  }

  const isWeb3Room = room.config?.paymentMethod === 'web3' || room.config?.isWeb3Room;

  logWeb3RoomConfig(roomId, room.config);

  if (debug) {
    console.log(`[Host] 🔍 Room config debug:`, {
      paymentMethod: room.config?.paymentMethod,
      isWeb3Room: room.config?.isWeb3Room,
      roomContractAddress: room.config?.roomContractAddress,
      web3ContractAddress: room.config?.web3ContractAddress,
      web3Chain: room.config?.web3Chain,
      evmNetwork: room.config?.evmNetwork,
      web3PrizeStructure: room.config?.web3PrizeStructure,
      hasWeb3AddressMap: !!room.web3AddressMap,
      web3AddressMapKeys: room.web3AddressMap ? Array.from(room.web3AddressMap.keys()) : [],
      // ✅ ADD: Log charity info
      web3CharityId: room.config?.web3CharityId,
      web3CharityName: room.config?.web3CharityName,
      web3CharityAddress: room.config?.web3CharityAddress,
    });
  }

  if (!isWeb3Room) {
    socket.emit('quiz_error', { message: 'Prize distribution is only available for Web3 rooms' });
    return;
  }

  if (!room.web3AddressMap || room.web3AddressMap.size === 0) {
    socket.emit('quiz_error', { message: 'No Web3 address mapping found. Players may not have joined properly.' });
    return;
  }

  const finalLeaderboard = calculateOverallLeaderboard(roomId);
  if (!finalLeaderboard.length) {
    socket.emit('quiz_error', { message: 'No players found for prize distribution' });
    return;
  }

  const { web3PrizeStructure, web3Chain } = room.config;

  const playerCount = finalLeaderboard.length;
  let actualWinnerCount;

  if (playerCount <= 3) {
    actualWinnerCount = playerCount;
    if (debug) {
      console.log(`[Host] 🏆 ${playerCount} player(s) joined - all are winners by default`);
    }
  } else {
    const hasSecondPrize = web3PrizeStructure?.secondPlace && web3PrizeStructure.secondPlace > 0;
    const hasThirdPrize  = web3PrizeStructure?.thirdPlace  && web3PrizeStructure.thirdPlace  > 0;
    actualWinnerCount = 1 + (hasSecondPrize ? 1 : 0) + (hasThirdPrize ? 1 : 0);
    if (debug) {
      console.log(`[Host] 🏆 ${playerCount} players joined - using leaderboard for top ${actualWinnerCount} winners`);
    }
  }

  const prizeCount = Math.min(actualWinnerCount, playerCount);

  const winnerAddresses = [];
  const winnerPlayerIds = [];
  const winnersDetailed = [];
  const missing = [];

  if (debug) {
    console.log('[Host] 🔍 Winner mapping debug:', {
      winnersPreview: finalLeaderboard.slice(0, prizeCount).map(p => ({ id: p.id, name: p.name, score: p.score })),
      allPlayers: room.players.map(p => ({ id: p.id, name: p.name })),
      web3AddressMap: Array.from(room.web3AddressMap?.entries() || []).map(([id, info]) => ({
        playerId: id, playerName: info.playerName, address: info.address
      }))
    });
  }

  for (let rank = 0; rank < prizeCount; rank++) {
    const entry = finalLeaderboard[rank];

    if (!entry) {
      if (winnerAddresses.length > 0) {
        const firstWinnerAddress = winnerAddresses[0];
        winnerAddresses.push(firstWinnerAddress);
        if (debug) {
          console.log(`[Host] 🏅 Rank ${rank + 1}: NO PLAYER - padding with first winner`);
        }
      }
      continue;
    }

    const playerId = entry.id;
    const playerName = entry.name;
    const addressInfo = room.web3AddressMap.get(playerId);

    if (!addressInfo?.address) {
      missing.push({ playerId, playerName, rank: rank + 1 });
      continue;
    }

    winnerAddresses.push(addressInfo.address);
    winnerPlayerIds.push(playerId);
    winnersDetailed.push({
      playerId,
      playerName,
      address: addressInfo.address,
      rank: rank + 1,
      score: entry.score
    });

    if (debug) {
      console.log(`[Host] 🏅 Rank ${rank + 1}: ${playerName} -> ${addressInfo.address.slice(0, 10)}...`);
    }
  }

  logWinnerAddressMapping(roomId, winnersDetailed, missing);

  if (missing.length) {
    const firstMissing = missing[0];
    socket.emit('quiz_error', {
      message: `Cannot find Web3 address for winner: ${firstMissing.playerName} (rank ${firstMissing.rank}).`
    });
    return;
  }

  if (!winnerAddresses.length) {
    socket.emit('quiz_error', { message: 'No valid winner addresses found for prize distribution' });
    return;
  }

  const winners = winnerAddresses;

  room.finalWinners = winners;
  room.finalLeaderboard = finalLeaderboard;
  room.prizeDistributionStatus = 'initiated';
  room.currentPhase = 'distributing_prizes';

  // ✅ NEW: Also freeze leaderboard here for Web3 completion path
  const frozenLeaderboard = freezeFinalLeaderboard(roomId);
  if (frozenLeaderboard && debug) {
    console.log('[Prize Distribution] 🏆 Leaderboard frozen for Web3 prize distribution');
  }

  // ✅ CALCULATE charityAmountPreview for frontend (for both chains)
  let charityAmountPreview = null;

  // Only calculate for Solana (EVM gets it from contract)
  if (web3Chain === 'solana') {
    try {
      const entryFee = parseFloat(room.config.entryFee || '0');
      const paidPlayers = room.players.filter((p) => p.paid && !p.disqualified);
      const totalEntryReceived = paidPlayers.length * entryFee;
      
      let totalExtrasReceived = 0;
      for (const player of room.players) {
        if (player.extraPayments) {
          for (const [, val] of Object.entries(player.extraPayments)) {
            totalExtrasReceived += val.amount || 0;
          }
        }
      }
      
      const totalRaised = totalEntryReceived + totalExtrasReceived;
      
      if (room.config.web3PrizeSplit && room.config.web3PrizeSplit.charity) {
        charityAmountPreview = ((totalRaised * room.config.web3PrizeSplit.charity) / 100).toFixed(4); // ✅ Changed to 4 decimals
      } else {
        charityAmountPreview = totalRaised.toFixed(4); // ✅ Changed to 4 decimals
      }
      
      if (debug) {
        console.log(`[Host] 💰 Backend calculated charityAmountPreview for Solana:`, {
          totalEntryReceived,
          totalExtrasReceived,
          totalRaised,
          charityPercentage: room.config.web3PrizeSplit?.charity || 100,
          charityAmountPreview,
        });
        console.log(`[Host] ℹ️  Frontend will use previewCharityPayout() for on-chain amount`);
      }
    } catch (calcError) {
      console.error(`[Host] ❌ Error calculating charityAmountPreview:`, calcError);
      charityAmountPreview = null;
    }
  }

  logPrizeDistributionInitiated(
    roomId,
    winners,
    room.config.roomContractAddress || room.config.web3ContractAddress,
    room.config.web3Chain,
    winnersDetailed
  );

  if (debug) {
    console.log(`[Host] 🎯 Prize distribution initiated:`);
    console.log(`  - Room: ${roomId}`);
    console.log(`  - Winners: ${winners.length}`);
    console.log(`  - Contract: ${room.config.roomContractAddress || room.config.web3ContractAddress}`);
    winnersDetailed.forEach(w => {
      console.log(`    ${w.rank}. ${w.playerName} (${w.score} pts) -> ${w.address}`);
    });
    
    // ✅ ADD: Log charity info being sent
    console.log('[Host] 📤 Charity info being sent to frontend:', {
      charityOrgId: room.config.web3CharityId,
      charityName: room.config.web3CharityName,
      charityAddress: room.config.web3CharityAddress,
      charityAmountPreview,
    });
  }

  // ✅ Send everything to frontend - it will handle TGB call
  socket.emit('initiate_prize_distribution', {
    roomId,
    winners,
    winnersDetailed,
    finalLeaderboard: finalLeaderboard.slice(0, 5),
    prizeStructure: web3PrizeStructure,
    prizeMode: room.config.prizeMode,
    web3Chain: room.config.web3Chain || 'stellar',
    evmNetwork: room.config.evmNetwork,
    roomAddress: room.config.roomContractAddress || room.config.web3ContractAddress,
    charityOrgId: room.config.web3CharityId,
    charityName: room.config.web3CharityName,
    charityAddress: room.config.web3CharityAddress,
    charityCurrency: room.config.web3Currency || 'USDC',
    charityAmountPreview,
  });

  namespace.to(roomId).emit('prize_distribution_started', {
    message: 'Prize distribution has begun! Please wait...',
    finalLeaderboard: finalLeaderboard.slice(0, 5)
  });

  emitRoomState(namespace, roomId);
  if (debug) console.log(`[Host] ✅ Prize distribution data sent to host for contract execution`);
});

  // ✅ prize_distribution_completed (unchanged)
socket.on(
  'prize_distribution_completed',
  ({
    roomId,
    success,
    txHash,
    error,
    confirmations,
    blockNumber,
    charityAmount,
    charityWallet,
    charityName,
    network,        // ✅ ADD THIS LINE
    web3Chain,      // ✅ ADD THIS LINE
  }) => {
    if (debug) {
      console.log(`[Host] 💰 Prize distribution result: ${success ? 'SUCCESS' : 'FAILED'}`);
      console.log('[Host] 📥 Received prize_distribution_completed:', {
        roomId,
        success,
        txHash,
        charityWallet,
        charityName,
        charityAmount,
        network,      // ✅ ADD THIS LINE
        web3Chain,    // ✅ ADD THIS LINE
      });
    }

    const room = getQuizRoom(roomId);
    if (!room) return;

    // ✅ Always ACK the sender so UI can stop spinners reliably
    socket.emit('prize_distribution_completed_ack', {
      roomId,
      success,
      txHash: txHash || null,
      error: error || null,
    });

    if (success) {
      room.prizeDistributionStatus = 'completed';
      room.prizeDistributionTxHash = txHash;
      room.currentPhase = 'complete';

      // ✅ Store the final charity wallet IF provided
      if (charityWallet) {
        room.config.web3CharityAddress = charityWallet;
        room.config.web3CharityName = room.config.web3CharityName || charityName || null;

        if (debug) {
          console.log('[Host] ✅ Stored charity wallet on room.config:', {
            roomId,
            web3CharityAddress: room.config.web3CharityAddress,
            web3CharityName: room.config.web3CharityName,
          });
        }
      } else if (debug) {
        console.warn('[Host] ⚠️ No charityWallet provided in prize_distribution_completed payload');
      }
      // ✅ NEW: Store network if provided (for Solana especially)
      if (network) {
        room.config.web3Network = network;
        
        if (debug) {
          console.log('[Host] ✅ Stored network on room.config:', {
            roomId,
            web3Network: network,
          });
        }
      }

      // ✅ NEW: Update chain if provided
      if (web3Chain) {
        room.config.web3Chain = web3Chain;
        
        if (debug) {
          console.log('[Host] ✅ Stored web3Chain on room.config:', {
            roomId,
            web3Chain: web3Chain,
          });
        }
      }

      // ✅ Also store host wallet if available
      if (!room.config.hostWallet && room.config.hostWalletConfirmed) {
        room.config.hostWallet = room.config.hostWalletConfirmed;
        if (debug) {
          console.log('[Host] ✅ Stored hostWallet from hostWalletConfirmed:', room.config.hostWallet);
        }
      }

      // ✅ Store exact charity amount from on-chain event
      if (charityAmount) {
        room.charityAmount = charityAmount;
        if (debug) console.log(`[Host] 💰 Charity amount from blockchain: ${charityAmount}`);
      } else if (debug) {
        console.warn(`[Host] ⚠️ No charityAmount provided from blockchain`);
      }

      logPrizeDistributionSuccess(
        roomId,
        room.config.web3Chain,
        txHash,
        confirmations,
        blockNumber,
        charityAmount
      );

      // ✅ IMPORTANT: broadcast ONE canonical “finalized” event to everyone in the room
      namespace.to(roomId).emit('prize_distribution_finalized', {
        roomId,
        success: true,
        txHash,
        charityWallet: charityWallet || room.config.web3CharityAddress || null,
        charityName: charityName || room.config.web3CharityName || null,
        charityAmount: charityAmount || room.charityAmount || null,
        finalLeaderboard: room.finalLeaderboard?.slice(0, 5) || [],
      });

      // (Optional) keep these older events if your UI depends on them
      namespace.to(roomId).emit('prize_distribution_success', {
        message: 'Prizes have been distributed successfully!',
        txHash,
        finalLeaderboard: room.finalLeaderboard?.slice(0, 5),
      });

      calculateAndSendFinalStats(roomId, namespace);

      if (debug) {
        console.log(`[Host] 🎉 Quiz completed with successful prize distribution: ${txHash}`);
      }
    } else {
      room.prizeDistributionStatus = 'failed';
      room.prizeDistributionError = error;

      logPrizeDistributionFailure(roomId, room.config.web3Chain, error, txHash, {
        winners: room.finalWinners,
        contract: room.config.roomContractAddress || room.config.web3ContractAddress,
      });

      namespace.to(roomId).emit('prize_distribution_finalized', {
        roomId,
        success: false,
        txHash: txHash || null,
        error: error || 'unknown_error',
        finalLeaderboard: room.finalLeaderboard?.slice(0, 5) || [],
      });

      namespace.to(roomId).emit('prize_distribution_failed', {
        message: 'Prize distribution failed. Please contact support.',
        error: error,
        finalLeaderboard: room.finalLeaderboard?.slice(0, 5),
      });

      if (debug) console.log(`[Host] ❌ Prize distribution failed: ${error}`);
    }

    emitRoomState(namespace, roomId);
  }
);



  socket.on('create_quiz_room', ({ roomId, hostId, config }) => {
    if (debug) console.log(`[Host] create_quiz_room for: ${roomId}, host: ${hostId}`);

    socket.join(roomId);
    const success = createQuizRoom(roomId, hostId, config);
    if (!success) {
      socket.emit('quiz_error', { message: 'Room already exists' });
      socket.leave(roomId);
      return;
    }

    socket.emit('quiz_room_created', { roomId });
    emitFullRoomState(roomId);
  });

  socket.on('start_round', ({ roomId }) => {
    if (debug) console.log(`[Host] start_round for ${roomId}`);

    const room = getQuizRoom(roomId);
    if (!room) {
      socket.emit('quiz_error', { message: 'Room not found' });
      return;
    }

    resetRoundExtrasTracking(roomId);
    const engine = getEngine(room);
    if (!engine || typeof engine.initRound !== 'function') {
      socket.emit('quiz_error', { message: 'No gameplay engine found for this round type' });
      return;
    }

    engine.initRound(roomId, namespace);
  });

  socket.on('next_review', ({ roomId }) => {
    if (debug) console.log(`[Host] next_review for ${roomId}`);

    const room = getQuizRoom(roomId);
    if (!room) {
      socket.emit('quiz_error', { message: 'Room not found' });
      return;
    }

    const engine = getEngine(room);
    if (!engine || typeof engine.emitNextReviewQuestion !== 'function') {
      socket.emit('quiz_error', { message: 'No review phase supported for this round type' });
      return;
    }

    engine.emitNextReviewQuestion(roomId, namespace);
  });

  // ✅ Show round results
  socket.on('show_round_results', ({ roomId }) => {
     const room = getQuizRoom(roomId);
  
    if (debug)  console.log('🟢 [HOST] show_round_results START:', {
    currentPhase: room.currentPhase,
    currentRound: room.currentRound,
    timestamp: Date.now()
  })

   
    if (!room) {
      socket.emit('quiz_error', { message: 'Room not found' });
      return;
    }

    if (room.hostSocketId !== socket.id) {
      socket.emit('quiz_error', { message: 'Only the host can show round results' });
      return;
    }

    if (room.currentPhase !== 'reviewing') {
      socket.emit('quiz_error', { message: 'Can only show round results during review phase' });
      return;
    }

    // 👉 NEW: hard settle banked score vs. penaltyDebt at end of WIPEOUT rounds
    const roundDef = room.config.roundDefinitions?.[room.currentRound - 1];
    const isWipeout = roundDef?.roundType === 'wipeout';
    if (isWipeout) {
      settleBankedScoreAgainstDebt(room);
    }

    // 🆕 1) Settle this round's earnings against penalty debt (creates carryover debt)
    settleRoundDebt(roomId);

    // 🆕 2) Now compute NET-OF-DEBT round leaderboard
    const roundLeaderboard = calculateRoundLeaderboard(roomId);

    if (roundLeaderboard.length === 0) {
      socket.emit('quiz_error', { message: 'No round data available for leaderboard' });
      return;
    }

    // Stats capture
    const currentRoundStats = StatsService.calculateAndSendRoundStats(roomId, namespace);
    room.currentRoundStats = currentRoundStats;
    if (debug) console.log(`[DEBUG] 🔍 getCurrentRoundStats for round ${room.currentRound}:`, currentRoundStats);

    if (!room.storedRoundStats) {
      room.storedRoundStats = {};
      if (debug) console.log(`[DEBUG] 🆕 Initialized storedRoundStats object`);
    }

    room.storedRoundStats[room.currentRound] = {
      ...currentRoundStats,
      timestamp: Date.now()
    };   

    if (debug) {
      console.log(`[Host] 💾 Stored round ${room.currentRound} stats:`, {
        roundNumber: currentRoundStats.roundNumber,
        hintsUsed: currentRoundStats.hintsUsed,
        freezesUsed: currentRoundStats.freezesUsed,
        pointsRobbed: currentRoundStats.pointsRobbed,
        pointsRestored: currentRoundStats.pointsRestored,
        totalExtrasUsed: currentRoundStats.totalExtrasUsed,
        questionsAnswered: currentRoundStats.questionsAnswered,
        correctAnswers: currentRoundStats.correctAnswers,
        wrongAnswers: currentRoundStats.wrongAnswers,
        noAnswers: currentRoundStats.noAnswers,
        extrasByPlayer: Object.keys(currentRoundStats.extrasByPlayer || {}).length + ' players'
      });
    }

    // 🆕 NEW: Initialize and update cumulative stats
    if (!room.cumulativeStats) {
      room.cumulativeStats = {
        totalQuestionsAnswered: 0,
        totalCorrectAnswers: 0,
        totalWrongAnswers: 0,
        totalNoAnswers: 0,
        totalExtrasUsed: 0,
        totalHintsUsed: 0,
        totalFreezesUsed: 0,
        totalPointsRobbed: 0,
        totalPointsRestored: 0,
        roundsCompleted: 0,
        overallSuccessRate: 0
      };
      if (debug) console.log(`[Host] 🆕 Initialized cumulative stats tracking`);
    }

    // Update cumulative stats with this round's data
    room.cumulativeStats.totalQuestionsAnswered += currentRoundStats.questionsAnswered || 0;
    room.cumulativeStats.totalCorrectAnswers += currentRoundStats.correctAnswers || 0;
    room.cumulativeStats.totalWrongAnswers += currentRoundStats.wrongAnswers || 0;
    room.cumulativeStats.totalNoAnswers += currentRoundStats.noAnswers || 0;
    room.cumulativeStats.totalExtrasUsed += currentRoundStats.totalExtrasUsed || 0;
    room.cumulativeStats.totalHintsUsed += currentRoundStats.hintsUsed || 0;
    room.cumulativeStats.totalFreezesUsed += currentRoundStats.freezesUsed || 0;
    room.cumulativeStats.totalPointsRobbed += currentRoundStats.pointsRobbed || 0;
    room.cumulativeStats.totalPointsRestored += currentRoundStats.pointsRestored || 0;
    room.cumulativeStats.roundsCompleted = room.currentRound;
    
    // Calculate overall success rate
    room.cumulativeStats.overallSuccessRate = room.cumulativeStats.totalQuestionsAnswered > 0 
      ? ((room.cumulativeStats.totalCorrectAnswers / room.cumulativeStats.totalQuestionsAnswered) * 100).toFixed(1)
      : 0;

    if (debug) {
      console.log(`[Host] 📊 Updated cumulative stats:`, {
        totalCorrect: room.cumulativeStats.totalCorrectAnswers,
        totalResponses: room.cumulativeStats.totalQuestionsAnswered,
        successRate: room.cumulativeStats.overallSuccessRate + '%',
        totalExtras: room.cumulativeStats.totalExtrasUsed,
        roundsCompleted: room.cumulativeStats.roundsCompleted
      });
    }

    // Store cumulative stats for recovery
    room.cumulativeStatsForRecovery = { ...room.cumulativeStats };

    // Store for recovery & broadcast
    room.currentRoundResults = roundLeaderboard;
    room.currentRoundStats = currentRoundStats;
    room.currentPhase = 'leaderboard';
    console.log('[NameCheck:round]', room.players.map(p => ({ id: p.id, name: p.name })));

    namespace.to(roomId).emit('round_leaderboard', roundLeaderboard);

      console.log('🟢 [HOST] Emitted round_leaderboard:', {
    entryCount: roundLeaderboard.length,
    topThree: roundLeaderboard.slice(0,3).map(p => `${p.name}:${p.score}`),
    timestamp: Date.now()
  });

    if (room.currentRoundStats) {
      socket.emit('host_current_round_stats', room.currentRoundStats);
    }
  

    if (debug) console.log(`[Host] ✅ Round ${room.currentRound} results shown to all players`);
      console.log('🟢 [HOST] About to call emitRoomState with phase:', room.currentPhase);
  emitRoomState(namespace, roomId);
  console.log('🟢 [HOST] show_round_results COMPLETE');
  });

  // ✅ Continue to overall leaderboard
socket.on('continue_to_overall_leaderboard', ({ roomId }) => {
  if (debug) console.log(`[Host] ➡️ continue_to_overall_leaderboard for ${roomId}`);

  const room = getQuizRoom(roomId);
  if (!room) {
    socket.emit('quiz_error', { message: 'Room not found' });
    return;
  }

  if (room.hostSocketId !== socket.id) {
    socket.emit('quiz_error', { message: 'Only the host can continue to overall leaderboard' });
    return;
  }

  if (room.currentPhase !== 'leaderboard') {
    socket.emit('quiz_error', { message: 'Can only continue to overall leaderboard from leaderboard phase' });
    return;
  }

  // ✅ CRITICAL FIX: Recalculate round stats to capture global extras used during leaderboard phase
  const updatedRoundStats = getCurrentRoundStats(roomId);
  if (updatedRoundStats && room.storedRoundStats) {
    room.storedRoundStats[room.currentRound] = {
      ...room.storedRoundStats[room.currentRound],
      ...updatedRoundStats,
      timestamp: Date.now()
    };
    
    // ✅ Re-emit updated stats to host so they have the corrected data
    socket.emit('host_current_round_stats', room.storedRoundStats[room.currentRound]);
    
    if (debug) {
      console.log(`[Host] 📊 Updated round ${room.currentRound} stats with global extras:`, {
        hintsUsed: updatedRoundStats.hintsUsed,
        freezesUsed: updatedRoundStats.freezesUsed,
        pointsRobbed: updatedRoundStats.pointsRobbed,
        pointsRestored: updatedRoundStats.pointsRestored,
        totalExtrasUsed: updatedRoundStats.totalExtrasUsed
      });
    }
  }

  const overallLeaderboard = calculateOverallLeaderboard(roomId);
  room.currentOverallLeaderboard = overallLeaderboard;

  namespace.to(roomId).emit('leaderboard', overallLeaderboard);

  if (debug) console.log(`[Host] ✅ Overall leaderboard shown to all players`);
});

  socket.on('end_quiz', ({ roomId }) => {
    if (debug) console.log(`[Host] end_quiz for ${roomId}`);

    const room = getQuizRoom(roomId);
    if (!room) {
      socket.emit('quiz_error', { message: 'Room not found' });
      return;
    }

    room.currentPhase = 'complete';
    namespace.to(roomId).emit('quiz_end', { message: 'Quiz ended by host.' });
    emitRoomState(namespace, roomId);
  });
socket.on('delete_quiz_room', async ({ roomId }) => {  // ✅ Make async
  if (debug) console.log(`[Host] delete_quiz_room for ${roomId}`);

  const room = getQuizRoom(roomId);
  if (!room) {
    socket.emit('quiz_error', { message: 'Room not found' });
    return;
  }

  // ✅ NEW: Mark as cancelled in database
  const isWeb2 = room.config?.paymentMethod !== 'web3' && !room.config?.isWeb3Room;
  if (isWeb2) {
    await markRoomAsCancelled(roomId);
  }

  namespace.to(roomId).emit('quiz_cancelled', { message: 'Quiz cancelled by host', roomId });
  if (debug) console.log(`[Host] 📢 Sent cancellation notice to room ${roomId}`);

  setTimeout(() => {
    const removed = removeQuizRoom(roomId);
    if (removed) {
      namespace.in(roomId).socketsLeave(roomId);
      namespace.in(`${roomId}:host`).socketsLeave(`${roomId}:host`);
      namespace.in(`${roomId}:admin`).socketsLeave(`${roomId}:admin`);
      namespace.in(`${roomId}:player`).socketsLeave(`${roomId}:player`);
      if (debug) console.log(`[Host] ✅ Room ${roomId} deleted and clients disconnected`);
    }
  }, 2000);
});

socket.on('end_quiz_cleanup', async ({ roomId }) => {
  if (debug) console.log(`[Host] 🧹 end_quiz_cleanup for ${roomId}`);

  const room = getQuizRoom(roomId);
  if (!room) {
    console.warn(`[Host] ⚠️ Room ${roomId} not found for cleanup`);
    return;
  }

  if (room.hostSocketId !== socket.id) {
    socket.emit('quiz_error', { message: 'Only the host can end the quiz' });
    return;
  }

  if (room.currentPhase !== 'complete') {
    room.currentPhase = 'complete';
  }

  const isWeb3Room = room.config?.paymentMethod === 'web3' || room.config?.isWeb3Room;

   await markRoomAsCompleted(roomId); 

  /* ------------------------------------------------------------------
     ⭐ SAVE IMPACT CAMPAIGN EVENT TO DATABASE (Web3 rooms only)
  ------------------------------------------------------------------ */
try {
  if (isWeb3Room) {
    // ✅ 1) Compute totals from players + config
    const totals = computeImpactEventTotals(room);

    console.log('📊 [ImpactCampaign] Computed totals', {
      roomId,
      entryFee: totals.entryFee,
      paidPlayersCount: totals.paidPlayersCount,
      totalEntryReceived: totals.totalEntryReceived,
      extrasRevenue: totals.extrasRevenue,
      totalRaised: totals.totalRaised,
      charityPercent: totals.charityPercent,
      hostPercent: totals.hostPercent,
      charityAmount: totals.charityAmount,
      hostFeeAmount: totals.hostFeeAmount,
    });

    // ✅ 2) Log what's available in room.config for charity
    console.log('🔍 [ImpactCampaign] Room config charity values:', {
      web3CharityAddress: room.config?.web3CharityAddress,
      web3Charity: room.config?.web3Charity,
      charityWallet: room.config?.charityWallet,
      web3CharityName: room.config?.web3CharityName,
      web3CharityId: room.config?.web3CharityId,
      hostWallet: room.config?.hostWallet,
      hostWalletConfirmed: room.config?.hostWalletConfirmed,
    });

    // ✅ 3) Build the payload we insert into MySQL (impact ledger)
    const eventData = {
      platformCampaignId: 1,
      campaignId: 'dba6e181-254f-4da2-ade3-67a05652a26d', // FundRaisely mgmt campaign_id
      roomId,
      hostId: room.hostId || null,
      chain: room.config?.web3Chain || 'unknown',
        network: room.config?.web3Network || room.config?.evmNetwork || 'unknown',
      feeToken: room.config?.web3Currency || 'unknown',
      hostName: room.config?.hostName || room.hostName || null,

      // ✅ Try multiple fallback sources for host wallet
      hostWallet:
        room.config?.hostWallet ||
        room.config?.hostWalletConfirmed ||
        null,

      // ✅ Try multiple fallback sources for charity wallet
      charityWallet:
        room.config?.web3CharityAddress ||
        room.config?.charityWallet ||
        room.charityWallet ||
        null,

      // ✅ Try multiple fallback sources for charity name
      charityName:
        room.config?.web3CharityName ||
        room.config?.web3Charity ||
        room.config?.charityName ||
        null,

      // ✅ Totals from computed values
      totalRaised: totals.totalRaised,
      charityAmount: totals.charityAmount ?? 0,
      extrasRevenue: totals.extrasRevenue,
      hostFeeAmount: totals.hostFeeAmount ?? 0,
      numberOfPlayers: (room.players || []).length,
    };

    // ✅ 4) Log exactly what you are sending to DB
       console.log('🧾 [ImpactCampaign] Event data being saved', {
      ...eventData,
      // ✅ Highlight the critical fields for debugging
      _debug: {
        network: eventData.network,
        charityWallet: eventData.charityWallet,
        source: {
          network: {
            web3Network: room.config?.web3Network,
            evmNetwork: room.config?.evmNetwork,
          },
          charityWallet: {
            web3CharityAddress: room.config?.web3CharityAddress,
            charityWallet: room.config?.charityWallet,
            roomCharityWallet: room.charityWallet,
          }
        }
      }
    });

    // ✅ 5) Save impact campaign event ledger row
    const result = await saveImpactCampaignEvent(eventData);

    if (!result.success) {
      console.error(
        `[ImpactCampaign] ❌ Failed to save impact ledger event for room ${roomId}:`,
        result.error
      );
      // If the ledger insert failed, do NOT sync into club mgmt
      return;
    }

    console.log(
      `[ImpactCampaign] 💾 Impact ledger event saved for room ${roomId} → OK (insertId: ${result.insertId})`
    );

    const explorerUrl = room?.config?.explorerUrl || null;

    // ✅ 6) Sync into FundRaisely Club Mgmt system (creates/updates event + income, idempotent)
    try {
      const syncResult = await syncImpactEventToFundraiselyClubMgmt({
        roomId,
        eventData,
        totals,
         explorerUrl,
      });

      console.log(`[ImpactCampaign] ✅ Synced to FundRaisely club mgmt`, {
        roomId,
        eventId: syncResult?.eventId,
        platformRevenue: syncResult?.platformRevenue,
        dedupe: syncResult?.dedupe,
      });
    } catch (syncErr) {
      console.error(
        `[ImpactCampaign] ❌ Failed to sync to FundRaisely club mgmt for room ${roomId}:`,
        syncErr
      );
    }

    // ✅ 7) Roll up campaign financials in mgmt system (so dashboards update immediately)
    try {
      const rollup = await rollupFundraiselyCampaignFinancials({
        campaignId: 'dba6e181-254f-4da2-ade3-67a05652a26d',
      });

      console.log(`[ImpactCampaign] 📈 Campaign rollup updated`, {
        campaignId: 'dba6e181-254f-4da2-ade3-67a05652a26d',
        ...rollup,
      });
    } catch (rollupErr) {
      console.error(
        `[ImpactCampaign] ❌ Failed to roll up FundRaisely campaign financials:`,
        rollupErr
      );
    }
  }
} catch (err) {
  console.error(`[ImpactCampaign] ❌ Error saving/syncing impact event:`, err);
}


  /* ------------------------------------------------------------------
     ⭐ FRONTEND CLEANUP & REDIRECT
  ------------------------------------------------------------------ */
  namespace.to(roomId).emit('quiz_cleanup_complete', {
    message: isWeb3Room
      ? 'Quiz has ended. Thank you for your contribution!'
      : 'Quiz has ended. Thank you for playing!',
    roomId,
    isWeb3Room,
  });

  if (debug) {
    console.log(`[Host] 📢 Sent cleanup completion notice to room ${roomId}`);
    console.log(
      `[Host] 🌐 isWeb3Room: ${isWeb3Room}, redirect → ${
        isWeb3Room ? '/web3/impact-campaign/' : '/'
      }`
    );
  }

  /* ------------------------------------------------------------------
     ⭐ ACTUAL ROOM / SOCKET MEMORY CLEANUP
  ------------------------------------------------------------------ */
  setTimeout(() => {
    const removed = removeQuizRoom(roomId);

    if (removed) {
      namespace.in(roomId).socketsLeave(roomId);
      namespace.in(`${roomId}:host`).socketsLeave(`${roomId}:host`);
      namespace.in(`${roomId}:admin`).socketsLeave(`${roomId}:admin`);
      namespace.in(`${roomId}:player`).socketsLeave(`${roomId}:player`);

      if (debug) {
        console.log(`[Host] ✅ Room ${roomId} cleaned up successfully`);
      }
    }
  }, 2000);
});


 socket.on('launch_quiz', async ({ roomId }) => {  // ✅ Make async
  if (debug) console.log(`[Host] launch_quiz for ${roomId}`);

  const room = getQuizRoom(roomId);
  if (!room) {
    socket.emit('quiz_error', { message: 'Room not found' });
    return;
  }

  if (room.hostSocketId !== socket.id) {
    socket.emit('quiz_error', { message: 'Only the host can launch the quiz' });
    return;
  }

  room.currentPhase = 'launched';

  // ✅ NEW: Update database status to 'live' for Web2 rooms
  const isWeb2 = room.config?.paymentMethod !== 'web3' && !room.config?.isWeb3Room;
  if (isWeb2) {
    await markRoomAsLive(roomId);
  }

  namespace.to(roomId).emit('quiz_launched', {
    roomId,
    message: 'Quiz is starting! Redirecting to game...'
  });

  emitRoomState(namespace, roomId);

  if (debug) console.log(`[Host] ✅ Quiz launched for room ${roomId}, players will be redirected`);
});
}



