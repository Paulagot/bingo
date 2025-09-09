import {
  createQuizRoom,
  getQuizRoom,
  getCurrentRound,
  getTotalRounds,
  resetRoundExtrasTracking,
  startNextRound,
  removeQuizRoom,
  emitRoomState
} from '../quizRoomManager.js';

import { getEngine } from '../gameplayEngines/gameplayEngineRouter.js';
import { isRateLimited } from '../../socketRateLimiter.js';
import { getCurrentRoundStats } from './globalExtrasHandler.js';
import { getRoundScoring } from './scoringUtils.js';
import { StatsService } from '../gameplayEngines/services/StatsService.js'
const debug = true;

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

  // ✅ next_round_or_end (unchanged)
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

        if (debug) {
          console.log(`[Host] 🔄 Updated final round ${room.currentRound} stats with leaderboard extras:`, {
            hintsUsed: finalRoundStats.hintsUsed,
            freezesUsed: finalRoundStats.freezesUsed,
            pointsRobbed: finalRoundStats.pointsRobbed,
            pointsRestored: finalRoundStats.pointsRestored,
            totalExtrasUsed: finalRoundStats.totalExtrasUsed
          });
        }
      }

      calculateAndSendFinalStats(roomId, namespace);

      room.currentPhase = 'complete';
      namespace.to(roomId).emit('quiz_end', { message: 'Quiz complete. Thank you!' });
      emitRoomState(namespace, roomId);

      if (debug) console.log(`[Host] ✅ Quiz completed for ${roomId} with final stats sent`);
    } else {
      startNextRound(roomId);
      room.currentPhase = 'waiting';
      emitRoomState(namespace, roomId);
    }
  });

  // ✅ end_quiz_and_distribute_prizes (unchanged from your version)
  socket.on('end_quiz_and_distribute_prizes', ({ roomId }) => {
    if (debug) console.log(`[Host] 🏆 end_quiz_and_distribute_prizes for ${roomId}`);

    const room = getQuizRoom(roomId);
    if (!room) {
      socket.emit('quiz_error', { message: 'Room not found' });
      return;
    }

    if (debug) {
      console.log(`[Host] 🔍 Room config debug:`, {
        paymentMethod: room.config?.paymentMethod,
        isWeb3Room: room.config?.isWeb3Room,
        web3ContractAddress: room.config?.web3ContractAddress,
        web3Chain: room.config?.web3Chain,
        web3PrizeStructure: room.config?.web3PrizeStructure,
        hasWeb3AddressMap: !!room.web3AddressMap,
        web3AddressMapKeys: room.web3AddressMap ? Object.keys(room.web3AddressMap) : []
      });
      console.log('[Host] 🔍 Web3 Address Map Debug:', {
        hasWeb3AddressMap: !!(room.web3AddressMap && room.web3AddressMap.size > 0),
        web3AddressMapSize: room.web3AddressMap ? room.web3AddressMap.size : 0,
        web3AddressEntries: room.web3AddressMap ? Array.from(room.web3AddressMap.entries()) : [],
        configAddresses: room.config?.web3PlayerAddresses || {}
      })
    }

    if (room.hostSocketId !== socket.id) {
      socket.emit('quiz_error', { message: 'Only the host can end the quiz and distribute prizes' });
      return;
    }

    const isWeb3Room = room.config?.paymentMethod === 'web3' || room.config?.isWeb3Room;

    if (debug) console.log(`[Host] 🌐 Web3 room check: paymentMethod=${room.config?.paymentMethod}, isWeb3Room=${room.config?.isWeb3Room}, result=${isWeb3Room}`);
    if (!isWeb3Room) {
      socket.emit('quiz_error', { message: 'Prize distribution is only available for Web3 rooms' });
      return;
    }

    if (!room.web3AddressMap) {
      socket.emit('quiz_error', { message: 'No Web3 address mapping found. Players may not have joined properly.' });
      return;
    }

    const finalLeaderboard = calculateOverallLeaderboard(roomId);
    if (finalLeaderboard.length === 0) {
      socket.emit('quiz_error', { message: 'No players found for prize distribution' });
      return;
    }

    const { web3PrizeStructure } = room.config;
    const hasSecondPrize = web3PrizeStructure?.secondPlace && web3PrizeStructure.secondPlace > 0;
    const hasThirdPrize = web3PrizeStructure?.thirdPlace && web3PrizeStructure.thirdPlace > 0;

    const winnerAddresses = [];
    const winnerPlayerIds = [];

    if (debug) console.log('[Host] 🔍 Winner mapping debug:', {
      winners: finalLeaderboard.slice(0, 3).map(p => p.name),
      allPlayers: room.players.map(p => ({ id: p.id, name: p.name })),
      web3AddressMap: Array.from(room.web3AddressMap?.entries() || []).map(([id, info]) => ({
        playerId: id,
        playerName: info.playerName,
        address: info.address
      }))
    });

    // 1st
    if (finalLeaderboard[0]) {
      const playerObj = room.players.find(p => p.name === finalLeaderboard[0].name);
      if (!playerObj) {
        socket.emit('quiz_error', { message: `Cannot find player data for winner: ${finalLeaderboard[0].name}` });
        return;
      }
      const playerId = playerObj.id;
      const addressInfo = room.web3AddressMap?.get(playerId);
      if (!addressInfo || !addressInfo.address) {
        socket.emit('quiz_error', { message: `Cannot find Web3 address for winner: ${finalLeaderboard[0].name}` });
        return;
      }
      winnerAddresses.push(addressInfo.address);
      winnerPlayerIds.push(playerId);
      if (debug) console.log(`[Host] 🥇 First place: ${finalLeaderboard[0].name} -> ${addressInfo.address.slice(0, 8)}...`);
    }

    // 2nd
    if (hasSecondPrize && finalLeaderboard[1]) {
      const playerObj = room.players.find(p => p.name === finalLeaderboard[1].name);
      if (playerObj) {
        const playerId = playerObj.id;
        const addressInfo = room.web3AddressMap?.get(playerId);
        if (addressInfo && addressInfo.address) {
          winnerAddresses.push(addressInfo.address);
          winnerPlayerIds.push(playerId);
          if (debug) console.log(`[Host] 🥈 Second place: ${finalLeaderboard[1].name} -> ${addressInfo.address.slice(0, 8)}...`);
        } else {
          console.warn(`[Host] ⚠️ No Web3 address found for second place: ${finalLeaderboard[1].name}`);
        }
      }
    }

    // 3rd
    if (hasThirdPrize && finalLeaderboard[2]) {
      const playerObj = room.players.find(p => p.name === finalLeaderboard[2].name);
      if (playerObj) {
        const playerId = playerObj.id;
        const addressInfo = room.web3AddressMap?.get(playerId);
        if (addressInfo && addressInfo.address) {
          winnerAddresses.push(addressInfo.address);
          winnerPlayerIds.push(playerId);
          if (debug) console.log(`[Host] 🥉 Third place: ${finalLeaderboard[2].name} -> ${addressInfo.address.slice(0, 8)}...`);
        } else {
          console.warn(`[Host] ⚠️ No Web3 address found for third place: ${finalLeaderboard[2].name}`);
        }
      }
    }

    if (winnerAddresses.length === 0) {
      socket.emit('quiz_error', { message: 'No valid winner addresses found for prize distribution' });
      return;
    }

    const winners = winnerAddresses;

    room.finalWinners = winners;
    room.finalLeaderboard = finalLeaderboard;
    room.prizeDistributionStatus = 'initiated';
    room.currentPhase = 'distributing_prizes';

    if (debug) {
      console.log(`[Host] 🎯 Prize distribution initiated:`);
      console.log(`  - Room: ${roomId}`);
      console.log(`  - Winners: ${winners.length}`);
      console.log(`  - Contract: ${room.config.web3ContractAddress}`);
      finalLeaderboard.slice(0, 3).forEach((player, idx) => {
        const address = room.web3AddressMap[player.id] || room.web3AddressMap[player.name];
        console.log(`    ${idx + 1}. ${player.name} (${player.score} pts) -> ${address}`);
      });
    }

    socket.emit('initiate_prize_distribution', {
      roomId,
      winners,
      finalLeaderboard: finalLeaderboard.slice(0, 5),
      prizeStructure: web3PrizeStructure,
      web3Chain: room.config.web3Chain || 'stellar'
    });

    namespace.to(roomId).emit('prize_distribution_started', {
      message: 'Prize distribution has begun! Please wait...',
      finalLeaderboard: finalLeaderboard.slice(0, 5)
    });

    emitRoomState(namespace, roomId);

    if (debug) console.log(`[Host] ✅ Prize distribution data sent to host for contract execution`);
  });

  // ✅ prize_distribution_completed (unchanged)

// ✅ prize_distribution_completed (FIXED VERSION)
socket.on('prize_distribution_completed', ({ roomId, success, txHash, error }) => {
  if (debug) console.log(`[Host] 💰 Prize distribution result: ${success ? 'SUCCESS' : 'FAILED'}`);

  const room = getQuizRoom(roomId);
  if (!room) return;

  if (success) {
    room.prizeDistributionStatus = 'completed';
    room.prizeDistributionTxHash = txHash;
    room.currentPhase = 'complete';

    namespace.to(roomId).emit('prize_distribution_success', {
      message: 'Prizes have been distributed successfully!',
      txHash,
      finalLeaderboard: room.finalLeaderboard?.slice(0, 5),
      explorerUrl: room.config.web3Chain === 'stellar'
        ? `https://stellarchain.io/tx/${txHash}`
        : `https://etherscan.io/tx/${txHash}`
    });

    // 🚨 ADD THIS: Emit back to the host frontend to update UI state
    socket.emit('prize_distribution_completed', {
      roomId,
      success: true,
      txHash
    });

    calculateAndSendFinalStats(roomId, namespace);

    if (debug) console.log(`[Host] 🎉 Quiz completed with successful prize distribution: ${txHash}`);
  } else {
    room.prizeDistributionStatus = 'failed';
    room.prizeDistributionError = error;

    namespace.to(roomId).emit('prize_distribution_failed', {
      message: 'Prize distribution failed. Please contact support.',
      error: error,
      finalLeaderboard: room.finalLeaderboard?.slice(0, 5)
    });

    // 🚨 ADD THIS: Emit back to the host frontend to update UI state
    socket.emit('prize_distribution_completed', {
      roomId,
      success: false,
      error
    });

    if (debug) console.log(`[Host] ❌ Prize distribution failed: ${error}`);
  }

  emitRoomState(namespace, roomId);
});

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
    if (debug) console.log(`[Host] 📊 show_round_results for ${roomId}`);

    const room = getQuizRoom(roomId);
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
      ...currentRoundStats,  // This now contains the correct question stats from StatsService!
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

    // 🆕 NEW: Initialize and update cumulative stats (MOVED INSIDE the handler)
    // Initialize cumulative stats if this is the first round
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

    namespace.to(roomId).emit('round_leaderboard', roundLeaderboard);

    if (room.currentRoundStats) {
      socket.emit('host_current_round_stats', room.currentRoundStats);
    }
    emitRoomState(namespace, roomId);

    if (debug) console.log(`[Host] ✅ Round ${room.currentRound} results shown to all players`);
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

  socket.on('delete_quiz_room', ({ roomId }) => {
    if (debug) console.log(`[Host] delete_quiz_room for ${roomId}`);

    const room = getQuizRoom(roomId);
    if (!room) {
      socket.emit('quiz_error', { message: 'Room not found' });
      return;
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

  // ✅ Launch quiz
  socket.on('launch_quiz', ({ roomId }) => {
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

    namespace.to(roomId).emit('quiz_launched', {
      roomId,
      message: 'Quiz is starting! Redirecting to game...'
    });

    emitRoomState(namespace, roomId);

    if (debug) console.log(`[Host] ✅ Quiz launched for room ${roomId}, players will be redirected`);
  });
}



