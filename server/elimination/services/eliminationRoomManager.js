import {
  generateRoomId,
  generatePlayerId,
  isoNow,
} from '../utils/eliminationHelpers.js';
import { ROOM_STATUS, GAME_RULES } from '../utils/eliminationConstants.js';

/**
 * In-memory store: roomId → room object.
 * Matches the quiz manager pattern already in use on FundRaisely.
 */
const rooms = new Map();

// ─── Room CRUD ────────────────────────────────────────────────────────────────

/**
 * Create a new waiting room.
 * @param {{ hostId: string, hostName: string, hostSocketId: string }} opts
 * @returns {Object} room
 */
export const createRoom = ({
  hostId,
  hostName,
  hostSocketId,
  // ── web3 fields (all optional — null for web2 rooms) ──
  paymentMode = 'web2',       // 'web2' | 'web3'
  web3Chain = null,           // 'solana' | 'evm'
  solanaCluster = null,       // 'devnet' | 'mainnet'
  feeMint = null,             // token mint pubkey string
  entryFee = null,            // number in token base units
  roomPda = null,             // on-chain room PDA address string
  hostWallet = null,          // host's wallet pubkey string
  charityOrgId = null,        // TGB org ID (resolved to wallet at finalize)
  charityName = null, 
  evmChain = null,            // for future EVM support
  evmContractAddress = null,  // for future EVM support
   onChainRoomId = null,  
}) => {
  const roomId = generateRoomId();

  const room = {
    roomId,
    hostId,
    hostName,
    hostSocketId,
    status: ROOM_STATUS.WAITING,
    players: {},
    activeRoundIndex: -1,
    totalRounds: GAME_RULES.TOTAL_ROUNDS,
    roundSequence: [],
    rounds: {},
    eliminatedPlayerIds: [],
    winnerPlayerId: null,
    createdAt: isoNow(),
    startedAt: null,
    endedAt: null,
    

    // ── web3 fields ──────────────────────────────────────
    paymentMode,
    web3Chain,
    solanaCluster,
    feeMint,
    entryFee,
    roomPda,
    hostWallet,
    charityOrgId,
    evmChain,
    charityName,
    evmContractAddress,
     onChainRoomId,
  };

  rooms.set(roomId, room);
  return room;
};

/**
 * Get a room by ID. Returns null if not found.
 */
export const getRoom = (roomId) => rooms.get(roomId) ?? null;

/**
 * Delete a room entirely (cleanup after game ends).
 */
export const deleteRoom = (roomId) => rooms.delete(roomId);

/**
 * Return all rooms (for debugging / admin use).
 */
export const getAllRooms = () => [...rooms.values()];

// ─── Player Management ────────────────────────────────────────────────────────

/**
 * Add a new player to a waiting room.
 * @returns {{ room: Object, player: Object }} or throws if room full / not waiting.
 */
export const addPlayer = (roomId, { name, socketId, txSignature = null, walletAddress = null }) => {
  const room = getRoom(roomId);
  if (!room) throw new Error('Room not found');
  if (room.status !== ROOM_STATUS.WAITING)
    throw new Error('Game already in progress');
  if (Object.keys(room.players).length >= GAME_RULES.MAX_PLAYERS)
    throw new Error('Room is full');

  const playerId = generatePlayerId();
  const player = {
    playerId,
    name,
    socketId,
    connected: true,
    eliminated: false,
    eliminatedInRound: null,
    joinedAt: isoNow(),
    lastSeenAt: isoNow(),
    cumulativeScore: 0,
    roundScores: {},
    hasSubmittedCurrentRound: false,
    txSignature: txSignature,
    walletAddress: walletAddress,
  };

  room.players[playerId] = player;
  return { room, player };
};

/**
 * Find a player by their socket ID across all rooms.
 * Returns { room, player } or null.
 */
export const findPlayerBySocket = (socketId) => {
  for (const room of rooms.values()) {
    for (const player of Object.values(room.players)) {
      if (player.socketId === socketId) return { room, player };
    }
  }
  return null;
};

/**
 * Find a player by playerId within a specific room.
 */
export const getPlayer = (roomId, playerId) => {
  const room = getRoom(roomId);
  return room?.players[playerId] ?? null;
};

/**
 * Update a player's socket ID (used on reconnect).
 */
export const updatePlayerSocket = (roomId, playerId, socketId) => {
  const player = getPlayer(roomId, playerId);
  if (!player) return null;
  player.socketId = socketId;
  player.connected = true;
  player.lastSeenAt = isoNow();
  return player;
};

/**
 * Mark a player as disconnected (keep in room).
 */
export const markPlayerDisconnected = (roomId, playerId) => {
  const player = getPlayer(roomId, playerId);
  if (!player) return;
  player.connected = false;
  player.lastSeenAt = isoNow();
};

/**
 * Mark a player as eliminated.
 */
export const eliminatePlayer = (roomId, playerId, roundNumber) => {
  const room = getRoom(roomId);
  const player = getPlayer(roomId, playerId);
  if (!room || !player) return;

  player.eliminated = true;
  player.eliminatedInRound = roundNumber;
  if (!room.eliminatedPlayerIds.includes(playerId)) {
    room.eliminatedPlayerIds.push(playerId);
  }
};

/**
 * Reset submission flag for all active players (called at start of each round).
 */
export const resetSubmissionFlags = (roomId) => {
  const room = getRoom(roomId);
  if (!room) return;
  for (const player of Object.values(room.players)) {
    player.hasSubmittedCurrentRound = false;
  }
};

/**
 * Mark a player as having submitted for the current round.
 */
export const markPlayerSubmitted = (roomId, playerId) => {
  const player = getPlayer(roomId, playerId);
  if (player) player.hasSubmittedCurrentRound = true;
};

// ─── Round State ──────────────────────────────────────────────────────────────

/**
 * Store a round state object on the room.
 */
export const setRoundState = (roomId, roundId, roundState) => {
  const room = getRoom(roomId);
  if (!room) return;
  room.rounds[roundId] = roundState;
};

/**
 * Get a round state by ID.
 */
export const getRoundState = (roomId, roundId) => {
  const room = getRoom(roomId);
  return room?.rounds[roundId] ?? null;
};

/**
 * Get the currently active round for a room.
 */
export const getActiveRound = (roomId) => {
  const room = getRoom(roomId);
  if (!room || room.activeRoundIndex < 0) return null;
  const roundId = room.roundSequence[room.activeRoundIndex];
  // roundSequence stores roundIds once the game is started
  return room.rounds[roundId] ?? null;
};

// ─── Score Tracking ───────────────────────────────────────────────────────────

/**
 * Record a score for a player in a specific round and update cumulative.
 */
export const recordPlayerScore = (roomId, playerId, roundNumber, score) => {
  const player = getPlayer(roomId, playerId);
  if (!player) return;
  player.roundScores[roundNumber] = score;
  player.cumulativeScore += score;
};

// ─── Game Lifecycle ───────────────────────────────────────────────────────────

/**
 * Transition room to ACTIVE status and record start time.
 */
export const startRoom = (roomId, roundSequence) => {
  const room = getRoom(roomId);
  if (!room) return null;
  room.status = ROOM_STATUS.ACTIVE;
  room.startedAt = isoNow();
  room.roundSequence = roundSequence; // array of round IDs in order
  room.activeRoundIndex = 0;
  return room;
};

/**
 * Advance to the next round (increments activeRoundIndex).
 */
export const advanceRound = (roomId) => {
  const room = getRoom(roomId);
  if (!room) return null;
  room.activeRoundIndex += 1;
  return room;
};

/**
 * Mark the room as ended and record the winner.
 */
export const endRoom = (roomId, winnerPlayerId) => {
  const room = getRoom(roomId);
  if (!room) return null;
  room.status = ROOM_STATUS.ENDED;
  room.winnerPlayerId = winnerPlayerId;
  room.endedAt = isoNow();
  return room;
};

// ─── Snapshot / Serialisation ─────────────────────────────────────────────────

/**
 * Return a safe snapshot of a room for sending to clients.
 * Strips internal refs not needed by the frontend.
 */
export const getRoomSnapshot = (roomId) => {
  const room = getRoom(roomId);
  if (!room) return null;

  return {
    roomId: room.roomId,
    hostId: room.hostId,
    hostName: room.hostName,
    status: room.status,
    players: Object.values(room.players).map(playerSnapshot),
    activeRoundIndex: room.activeRoundIndex,
    totalRounds: room.totalRounds,
    eliminatedPlayerIds: room.eliminatedPlayerIds,
    winnerPlayerId: room.winnerPlayerId,
    createdAt: room.createdAt,
    startedAt: room.startedAt,
    endedAt: room.endedAt,

    // ── web3 fields — needed by join page to detect mode ──
    paymentMode: room.paymentMode,
    web3Chain: room.web3Chain,
    solanaCluster: room.solanaCluster,
    feeMint: room.feeMint,
    entryFee: room.entryFee,
    roomPda: room.roomPda,
    hostWallet: room.hostWallet,
    charityOrgId: room.charityOrgId,
    onChainRoomId: room.onChainRoomId, 
     charityName: room.charityName,
  };
};

const playerSnapshot = (p) => ({
  playerId: p.playerId,
  name: p.name,
  connected: p.connected,
  eliminated: p.eliminated,
  eliminatedInRound: p.eliminatedInRound,
  cumulativeScore: p.cumulativeScore,
  roundScores: p.roundScores,
  walletAddress: p.walletAddress ?? null,
});

/**
 * Return the reconnect payload for a specific player.
 */
export const getReconnectSnapshot = (roomId, playerId) => {
  const room = getRoom(roomId);
  const player = getPlayer(roomId, playerId);
  if (!room || !player) return null;

  const activeRound = getActiveRound(roomId);

  return {
    roomSnapshot: getRoomSnapshot(roomId),
    playerState: {
      ...playerSnapshot(player),
      hasSubmittedCurrentRound: player.hasSubmittedCurrentRound,
    },
    activeRound: activeRound
      ? {
          roundId: activeRound.roundId,
          roundNumber: activeRound.roundNumber,
          roundType: activeRound.roundType,
          phase: activeRound.phase,
          generatedConfig: activeRound.generatedConfig,
          startedAt: activeRound.startedAt,
          endsAt: activeRound.endsAt,
        }
      : null,
  };
};

// ─── Active Player Helpers ────────────────────────────────────────────────────

/**
 * Return all players who have not been eliminated.
 */
export const getActivePlayers = (roomId) => {
  const room = getRoom(roomId);
  if (!room) return [];
  return Object.values(room.players).filter((p) => !p.eliminated);
};

/**
 * Return active player count.
 */
export const getActivePlayerCount = (roomId) =>
  getActivePlayers(roomId).length;

// ─── Periodic cleanup ─────────────────────────────────────────────────────────
// Remove ended/stale rooms from memory every 30 minutes
setInterval(() => {
  const TWO_HOURS = 2 * 60 * 60 * 1000;
  const now = Date.now();
  for (const [roomId, room] of rooms.entries()) {
    const age = now - (room.createdAt ?? 0);
    const isEnded = room.status === 'ended';
    if (isEnded && age > TWO_HOURS) {
      rooms.delete(roomId);
      // console.log('[Elimination] Cleaned up stale room:', roomId);
    }
  }
}, 30 * 60 * 1000);