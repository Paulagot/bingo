//server/quiz/handlers/blockchainLoggingHelper.js

import { loggers, logBlockchainTx, logStateTransition, logError } from '../../config/logging.js';

const blockchainLogger = loggers.blockchain;
const quizLogger = loggers.quiz;

export function logPrizeDistributionInitiated(roomId, winners, contract, chain, winnersDetailed) {
  blockchainLogger.info({
    roomId,
    stage: 'initiated',
    chain,
    contract,
    winnerCount: winners.length,
    winners: winnersDetailed.map(w => ({
      rank: w.rank,
      playerId: w.playerId,
      playerName: w.playerName,
      address: w.address,
      score: w.score
    }))
  }, `Prize distribution initiated for room ${roomId}`);

  logStateTransition(quizLogger, {
    entity: 'room',
    entityId: roomId,
    from: 'ended',
    to: 'distributing_prizes',
    reason: 'host_triggered_prize_distribution'
  });
}

export function logPrizeDistributionPreparing(roomId, chain, txData) {
  logBlockchainTx(blockchainLogger, {
    txHash: null,
    stage: 'preparing',
    chain,
    ...txData
  }, 'preparing', 'pending');
}

export function logPrizeDistributionSubmitted(roomId, chain, txHash, txData) {
  blockchainLogger.info({
    roomId,
    stage: 'submitted',
    chain,
    txHash,
    ...txData
  }, `Transaction submitted to ${chain} blockchain`);

  logBlockchainTx(blockchainLogger, {
    txHash,
    stage: 'submitting',
    chain,
    ...txData
  }, 'submitting', 'pending');
}

export function logPrizeDistributionSuccess(roomId, chain, txHash, confirmations, blockNumber, charityAmount) {
  blockchainLogger.info({
    roomId,
    stage: 'completed',
    status: 'success',
    chain,
    txHash,
    confirmations,
    blockNumber,
    charityAmount: charityAmount || null // Exact amount sent to charity (from on-chain event)
  }, `Prize distribution completed successfully on ${chain}${charityAmount ? ` - Charity amount: ${charityAmount}` : ''}`);

  logBlockchainTx(blockchainLogger, {
    txHash,
    stage: 'settled',
    chain,
    blockNumber
  }, 'settled', 'success');

  logStateTransition(quizLogger, {
    entity: 'room',
    entityId: roomId,
    from: 'distributing_prizes',
    to: 'complete',
    reason: 'prize_distribution_success'
  });
}

export function logPrizeDistributionFailure(roomId, chain, error, txHash = null, context = {}) {
  blockchainLogger.error({
    roomId,
    stage: 'failed',
    chain,
    txHash,
    error: {
      message: error.message || error,
      code: error.code,
      stack: error.stack
    },
    ...context
  }, `Prize distribution failed for room ${roomId}: ${error.message || error}`);

  if (txHash) {
    logBlockchainTx(blockchainLogger, {
      txHash,
      stage: 'failed',
      chain
    }, 'failed', 'failed');
  }

  logStateTransition(quizLogger, {
    entity: 'room',
    entityId: roomId,
    from: 'distributing_prizes',
    to: 'failed',
    reason: 'prize_distribution_error'
  });
}

export function logWinnerAddressMapping(roomId, winnersDetailed, missingAddresses) {
  if (missingAddresses && missingAddresses.length > 0) {
    blockchainLogger.warn({
      roomId,
      missingAddresses: missingAddresses.map(m => ({
        playerId: m.playerId,
        playerName: m.playerName,
        rank: m.rank
      }))
    }, `Missing Web3 addresses for ${missingAddresses.length} winner(s) in room ${roomId}`);
  }

  blockchainLogger.debug({
    roomId,
    mappedWinners: winnersDetailed.map(w => ({
      rank: w.rank,
      playerId: w.playerId,
      playerName: w.playerName,
      address: w.address
    }))
  }, `Winner address mapping completed for room ${roomId}`);
}

export function logWeb3RoomConfig(roomId, config) {
  quizLogger.debug({
    roomId,
    paymentMethod: config.paymentMethod,
    isWeb3Room: config.isWeb3Room,
    roomContractAddress: config.roomContractAddress,
    web3ContractAddress: config.web3ContractAddress,
    web3Chain: config.web3Chain,
    evmNetwork: config.evmNetwork,
    web3PrizeStructure: config.web3PrizeStructure
  }, `Web3 room configuration for room ${roomId}`);
}
