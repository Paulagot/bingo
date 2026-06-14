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
    settled: false,
    pendingReconciliation: false,
    reconciliationApproved: false,
    closed: false,
    admin: [],

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

    // clubId is not stored on web3 rooms — Stripe Connect is not used for web3
    clubId: null,
    currency: null,
  };

  rooms.set(roomId, room);
  return room;
};

/**
 * Hydrate a scheduled room from a DB config_json record into memory.
 *
 * Used by the management system hydrate endpoint when a host launches
 * a scheduled Web2 elimination from the dashboard. The roomId comes
 * from the DB record — we do NOT generate a new one.
 *
 * @param {string} roomId         - the existing DB room_id
 * @param {string} hostId         - from the DB row
 * @param {string} hostName       - from config_json.hostName
 * @param {object} config         - parsed config_json from the DB row
 * @returns {Object} room         - the in-memory room object
 */
export const createRoomFromConfig = (roomId, hostId, hostName, config = {}) => {
  // If already in memory (e.g. host refreshed), return existing room.
  const existing = getRoom(roomId);
  if (existing) return existing;

  const room = {
    roomId,
    hostId,
    hostName: hostName ?? config.hostName ?? 'Host',
    hostSocketId: null,
    status: ROOM_STATUS.WAITING,
    players: {},
    activeRoundIndex: -1,
    totalRounds: GAME_RULES.TOTAL_ROUNDS,
    roundSequence: [],
    rounds: {},
    eliminatedPlayerIds: [],
    winnerPlayerId: null,
    createdAt: config.createdAt ?? isoNow(),
    startedAt: null,
    endedAt: null,
    settled: false,
    pendingReconciliation: false,
    reconciliationApproved: false,
    closed: false,

    // ── Web2 scheduling fields ────────────────────────────────────────────
    paymentMode: 'web2',
    clubId:      config.clubId    ?? null,
    entryFee:    config.entryFee  ?? null,
    currency:    config.currency  ?? 'EUR',
    maxPlayers:  config.maxPlayers ?? GAME_RULES.MAX_PLAYERS,

    // ── Web3 fields — null for Web2 rooms, kept for shape consistency ─────
    web3Chain:          null,
    solanaCluster:      null,
    feeMint:            null,
    roomPda:            null,
    hostWallet:         null,
    charityOrgId:       null,
    charityName:        null,
    evmChain:           null,
    evmContractAddress: null,
    onChainRoomId:      null,
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
 * Build the canonical player object shape used throughout the room manager.
 * Extracted here so addPlayer and addPlayerWithId share identical field sets.
 */
const buildPlayer = ({
  playerId,
  name,
  socketId,
  txSignature       = null,
  walletAddress     = null,
  paid              = false,
  paymentClaimed    = false,
  payAtDoor         = false,
  paymentMethod     = null,
  paymentReference  = null,
  clubPaymentMethodId = null,
  addedByHost       = false,
}) => ({
  playerId,
  name,
  socketId,
  connected:    !addedByHost && socketId !== null,
  addedByHost,
  eliminated: false,
  eliminatedInRound: null,
  joinedAt: isoNow(),
  lastSeenAt: isoNow(),
  cumulativeScore: 0,
  roundScores: {},
  hasSubmittedCurrentRound: false,
  // ── web3 ──
  txSignature,
  walletAddress,
  // ── web2 payment ──
  paid,
  paymentClaimed,
  payAtDoor,
  paymentMethod,
  paymentReference,
  clubPaymentMethodId,
});

/**
 * Add a new player to a waiting room, generating a fresh playerId.
 *
 * Web3 players supply txSignature + walletAddress.
 * Web2 players supply payment fields (paid, paymentClaimed, payAtDoor, etc.).
 * Free/no-fee players supply nothing extra — all payment fields default to null/false.
 *
 * @returns {{ room: Object, player: Object }} or throws if room full / not waiting.
 */
export const addPlayer = (roomId, {
  name,
  socketId,
  // ── web3 ──
  txSignature       = null,
  walletAddress     = null,
  // ── web2 payment status ──
  paid              = false,
  paymentClaimed    = false,
  payAtDoor         = false,
  paymentMethod     = null,
  paymentReference  = null,
  clubPaymentMethodId = null,
  // ── host-added players (no socket connection of their own) ──
  addedByHost       = false,
}) => {
  const room = getRoom(roomId);
  if (!room) throw new Error('Room not found');
  if (room.status !== ROOM_STATUS.WAITING)
    throw new Error('Game already in progress');
  if (Object.keys(room.players).length >= (room.maxPlayers ?? GAME_RULES.MAX_PLAYERS))
    throw new Error('Room is full');

  const playerId = generatePlayerId();
  const player = buildPlayer({
    playerId,
    name,
    socketId,
    txSignature,
    walletAddress,
    paid,
    paymentClaimed,
    payAtDoor,
    paymentMethod,
    paymentReference,
    clubPaymentMethodId,
    addedByHost,
  });

  room.players[playerId] = player;
  return { room, player };
};

/**
 * Pre-register a player with a KNOWN playerId (Stripe walk-in webhook flow).
 *
 * Called from the Stripe webhook BEFORE the player arrives at the success page,
 * so that when their socket fires `join_elimination_room` with the same playerId
 * the reconnect path in the socket handler finds them immediately.
 *
 * Unlike addPlayer this does NOT throw if the player already exists — the webhook
 * can fire more than once (Stripe retry), so idempotency is important.
 *
 * @param {string} roomId
 * @param {string} playerId   - must be the exact ID stored in Stripe metadata
 * @param {object} fields     - same shape as addPlayer opts minus addedByHost
 * @returns {{ room: Object, player: Object, alreadyExisted: boolean }}
 */
export const addPlayerWithId = (roomId, playerId, {
  name,
  socketId          = null,
  txSignature       = null,
  walletAddress     = null,
  paid              = false,
  paymentClaimed    = false,
  payAtDoor         = false,
  paymentMethod     = null,
  paymentReference  = null,
  clubPaymentMethodId = null,
}) => {
  const room = getRoom(roomId);
  if (!room) throw new Error(`Room not found: ${roomId}`);

  // Idempotency — webhook may fire twice; don't duplicate the player
  if (room.players[playerId]) {
    console.log(`[Elimination] addPlayerWithId: player ${playerId} already in room ${roomId} — skipping`);
    return { room, player: room.players[playerId], alreadyExisted: true };
  }

  if (room.status !== ROOM_STATUS.WAITING) {
    throw new Error(`Cannot pre-register player — room ${roomId} is not in waiting status (status: ${room.status})`);
  }

  if (Object.keys(room.players).length >= (room.maxPlayers ?? GAME_RULES.MAX_PLAYERS)) {
    throw new Error('Room is full');
  }

  const player = buildPlayer({
    playerId,
    name,
    socketId,       // null — player hasn't connected via socket yet
    txSignature,
    walletAddress,
    paid,
    paymentClaimed,
    payAtDoor,
    paymentMethod,
    paymentReference,
    clubPaymentMethodId,
    addedByHost: false,
  });

  room.players[playerId] = player;
  console.log(`[Elimination] addPlayerWithId: pre-registered player ${playerId} ("${name}") in room ${roomId}`);
  return { room, player, alreadyExisted: false };
};

/**
 * Find a player by their socket ID across all rooms.
 * Returns { room, player } or null.
 */
export const findPlayerBySocket = (socketId) => {
  if (!socketId) return null;   // host-added players have no socket — skip
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
  room.roundSequence = roundSequence;
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

export const markReconciliationApproved = (roomId) => {
  const room = rooms.get(roomId);
  if (!room) return false;
  room.reconciliationApproved = true;
  room.pendingReconciliation = false;
  return true;
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

    // ── payment / room config fields — needed by join page ──
    paymentMode:  room.paymentMode,
    entryFee:     room.entryFee,
    currency:     room.currency  ?? 'EUR',
    maxPlayers:   room.maxPlayers ?? GAME_RULES.MAX_PLAYERS,

    // ── web3 fields ──
    web3Chain:    room.web3Chain,
    solanaCluster: room.solanaCluster,
    feeMint:      room.feeMint,
    roomPda:      room.roomPda,
    hostWallet:   room.hostWallet,
    charityOrgId: room.charityOrgId,
    charityName:  room.charityName,
    onChainRoomId: room.onChainRoomId,

    // clubId intentionally omitted from public snapshot —
    // only used server-side for Stripe Connect lookup
  };
};

/**
 * Player snapshot — included in room snapshots sent to all clients.
 * Payment fields are included so the host dashboard can show payment status.
 */
const playerSnapshot = (p) => ({
  playerId:           p.playerId,
  name:               p.name,
  connected:          p.connected,
  eliminated:         p.eliminated,
  eliminatedInRound:  p.eliminatedInRound,
  cumulativeScore:    p.cumulativeScore,
  roundScores:        p.roundScores,
  walletAddress:      p.walletAddress      ?? null,
  // ── web2 payment status ──
  paid:               p.paid               ?? false,
  paymentClaimed:     p.paymentClaimed     ?? false,
  payAtDoor:          p.payAtDoor          ?? false,
  paymentMethod:      p.paymentMethod      ?? null,
  paymentReference:   p.paymentReference   ?? null,
  clubPaymentMethodId: p.clubPaymentMethodId ?? null,
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
          roundId:         activeRound.roundId,
          roundNumber:     activeRound.roundNumber,
          roundType:       activeRound.roundType,
          phase:           activeRound.phase,
          generatedConfig: activeRound.generatedConfig,
          startedAt:       activeRound.startedAt,
          endsAt:          activeRound.endsAt,
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
  const FOUR_HOURS = 4 * 60 * 60 * 1000;
  const now = Date.now();
  for (const [roomId, room] of rooms.entries()) {
    const createdMs = room.createdAt ? new Date(room.createdAt).getTime() : 0;
    const age = now - createdMs;
    const isEnded = room.status === 'ended';
    if (!isEnded) continue;

    // If reconciliation is pending, give the host up to 4 hours.
    if (room.pendingReconciliation && !room.reconciliationApproved && age < FOUR_HOURS) continue;

    rooms.delete(roomId);
    console.log(`[Elimination] Periodic cleanup removed room ${roomId} (age: ${Math.round(age / 60000)}min)`);
  }
}, 30 * 60 * 1000);