// server/quiz/handlers/playerHandlers.js 
import { 
  getQuizRoom, 
  addOrUpdatePlayer, 
  updateHostSocketId, 
  updateAdminSocketId, 
  updatePlayerSocketId, 
  addAdminToQuizRoom, 
  getCurrentQuestion,
  handlePlayerExtra,
  emitRoomState,
  updatePlayerSession,
  getPlayerSession,
  cleanExpiredSessions,

} from '../quizRoomManager.js';
import { emitFullRoomState } from '../handlers/sharedUtils.js';

import { normalizePaymentMethod }  from '../../utils/paymentMethods.js';
import { 
  createExpectedPayment,
  confirmPayment, 
  updateDonationLedgerAmount,

} from '../../mgtsystem/services/quizPaymentLedgerService.js'

import { canJoinAsWalkIn } from '../../mgtsystem/services/quizCapacityService.js';

const debug = true;

// --- Payment method normalization ---

function normalizeExtraPayments(extraPayments) {
  if (!extraPayments || typeof extraPayments !== 'object') return {};
  return Object.fromEntries(
    Object.entries(extraPayments).map(([key, val]) => {
      const method = normalizePaymentMethod(val?.method);
      const amount = Number(val?.amount || 0);
      return [key, { method, amount }];
    })
  );
}
function currencyFromSymbol(symbol) {
  if (symbol === '€') return 'EUR';
  if (symbol === '£') return 'GBP';
  if (symbol === '$') return 'USD';
  return 'EUR';
}

function getIncludedDonationExtras(room) {
  return Object.entries(room?.config?.fundraisingOptions || {})
    .filter(([_, enabled]) => !!enabled)
    .map(([extraId]) => extraId);
}


function getEngine(room) {
  const roundType = room.config.roundDefinitions?.[room.currentRound - 1]?.roundType;

  switch (roundType) {
    case 'general_trivia':
      return import('../gameplayEngines/generalTriviaEngine.js');
    case 'wipeout':
      return import('../gameplayEngines/wipeoutEngine.js');
    case 'speed_round':
      return import('../gameplayEngines/speedRoundEngine.js');
    case 'hidden_object':
  return import('../gameplayEngines/hiddenObjectEngine.js');
    case 'order_image':
      return import('../gameplayEngines/orderImageEngine.js');
    default:
      console.warn(`[getEngine] ❓ Unknown round type: ${roundType}`);
      return null;
  }
}

export function setupPlayerHandlers(socket, namespace) {
socket.on('join_quiz_room', async (payload) => {
  if (!payload) {
    socket.emit('quiz_error', { message: 'Invalid join_quiz_room payload.' });
    return;
  }

  const {
    roomId,
    user,
    role,
    ticketId = null,
    paymentAlreadyRecorded = false,
  } = payload;

  const isStripePostJoin = paymentAlreadyRecorded === true;

  if (!roomId || !user || !role) {
    console.error(`[join_quiz_room] ❌ Missing data:`, { roomId, user, role });
    socket.emit('quiz_error', { message: 'Invalid join_quiz_room payload.' });
    return;
  }

  if (debug) {
    console.log(`[Join Player Handler] 🚪 ${role.toUpperCase()} "${user.name || user.id}" joining room ${roomId}`, {
      ticketId,
      paid: user.paid,
      paymentMethod: user.paymentMethod,
      isStripePostJoin,
    });
  }

  const room = getQuizRoom(roomId);
  if (!room) {
    console.warn(`[Join] ⚠️ Room not found: ${roomId}`);
    socket.emit('quiz_error', { message: `Room ${roomId} not found.` });
    return;
  }

    // Validate BEFORE joining rooms
   if (role === 'player') {
  const isWeb3 = room.config?.paymentMethod === 'web3' || room.config?.isWeb3Room === true;
  
  // ✅ Handle ticket joins - set payment flags
if (ticketId) {
  user.paid = true;
  user.paymentClaimed = true;
  user.paymentConfirmedBy = user.paymentConfirmedBy || 'ticket_system';

  if (!user.paymentMethod || user.paymentMethod === 'unknown') {
    user.paymentMethod = 'instant_payment';
  }

  if (debug) {
    console.log('[Join] 🎟️ Player joining via ticket:', {
      ticketId,
      paymentMethod: user.paymentMethod,
      donationAmount: user.donationAmount,
      totalAmount: user.totalAmount,
      clubPaymentMethodId: user.clubPaymentMethodId,
      paymentReference: user.paymentReference,
    });
  }
}

  // ✅ Capacity check for Web2 rooms
  if (!isWeb3) {
    if (!ticketId) {
      // Walk-in: check capacity
     const currentCount = room.players.filter(p => p.id !== user.id).length;
      const capacityCheck = await canJoinAsWalkIn(roomId, currentCount);
      
      if (!capacityCheck.allowed) {
        console.warn(`[Join] 🚫 Walk-in blocked:`, {
          roomId,
          playerId: user.id,
          reason: capacityCheck.reason,
        });
        
        socket.emit('quiz_error', { 
          message: capacityCheck.reason,
          code: 'ROOM_FULL',
        });
        return;
      }
      
      if (debug) {
        console.log('[Join] ✅ Walk-in capacity check passed:', {
          roomId,
          playerId: user.id,
          availableForWalkIns: capacityCheck.capacity.availableForWalkIns,
        });
      }
    } else {
      // Ticket holder: bypass capacity check
      if (debug) {
        console.log('[Join] 🎟️ Ticket holder bypasses capacity check (has reserved spot)');
      }
    }
  }
}

// Join AFTER validation
socket.join(roomId);
socket.join(`${roomId}:${role}`);

// ✅ FIX: Declare joinedUser in outer scope ONCE
let joinedUser = null;

    if (role === 'host') {
      updateHostSocketId(roomId, socket.id);
      if (debug) console.log(`[Join] 👑 Host "${room.config.hostName}" (${user.id}) joined with socket ${socket.id}`);

    } else if (role === 'admin') {
      const existingAdmin = room.admins.find(a => a.id === user.id);
      if (existingAdmin) {
        if (user.name) existingAdmin.name = user.name;
        existingAdmin.socketId = socket.id;
      } else {
        addAdminToQuizRoom(roomId, { ...user, socketId: socket.id });
      }
      updateAdminSocketId(roomId, user.id, socket.id);
      if (debug) console.log(`[Join] 🛠️ Admin "${user.name || user.id}" joined with socket ${socket.id}`);

} else if (role === 'player') {
  // Capacity checks (Web2 only; allow overflow for Web3 rooms)
  const isWeb3 = room.config?.paymentMethod === 'web3' || room.config?.isWeb3Room === true;
  
  if (!isWeb3) {
    const limit =
      room.roomCaps?.maxPlayers ??
      room.config?.roomCaps?.maxPlayers ??
      20;

    // Ticket holders have a pre-reserved spot — never block them here
    if (!ticketId && room.players.length >= limit) {
      console.warn(`[Join] 🚫 Player limit reached (${limit}) in room ${roomId}`);
      socket.emit('quiz_error', { message: `Room is full (limit ${limit}).` });
      return;
    }
  }

  
  // ✅ Session housekeeping
  cleanExpiredSessions(roomId);

  // Sanitize/normalize payment fields from client
  const normalizedPaymentMethod = normalizePaymentMethod(user.paymentMethod);
  const normalizedExtraPayments = normalizeExtraPayments(user.extraPayments);

  // 🔎 Determine if player exists and/or has a session
  const existingPlayer = room.players.find(p => p.id === user.id);
  const existingSession = getPlayerSession(roomId, user.id);

  // Build the user object we'll store/propagate
const isDonationRoom = room.config?.fundraisingMode === 'donation';
const includedDonationExtras = isDonationRoom ? getIncludedDonationExtras(room) : [];

let normalizedDonationAmount = Number(user?.donationAmount ?? 0);
if (!Number.isFinite(normalizedDonationAmount) || normalizedDonationAmount < 0) {
  normalizedDonationAmount = 0;
}

const isZeroDonationAutoConfirmed = isDonationRoom && normalizedDonationAmount === 0;

const sanitizedUser = {
  ...user,
  paymentMethod: normalizedPaymentMethod,
  extraPayments: normalizedExtraPayments,
  socketId: socket.id,

  paymentLedgerRecorded: user.paymentLedgerRecorded === true,
  paymentStatus: user.paymentStatus || null,
  web3TxHash: user.web3TxHash || null,
  web3TransactionId: user.web3TransactionId || null,

  donationAmount: isDonationRoom ? normalizedDonationAmount : undefined,
  extras: isDonationRoom
    ? includedDonationExtras
    : (Array.isArray(user.extras) ? user.extras : []),

  // ✅ auto-confirm zero donation joins
  paid: isZeroDonationAutoConfirmed ? true : !!user.paid,
  paymentClaimed: isZeroDonationAutoConfirmed ? true : !!user.paymentClaimed,
  paymentConfirmedBy: isZeroDonationAutoConfirmed ? 'system_zero_donation' : user.paymentConfirmedBy,
  paymentConfirmedByName: isZeroDonationAutoConfirmed ? 'System' : user.paymentConfirmedByName,
  paymentConfirmedRole: isZeroDonationAutoConfirmed ? 'admin' : user.paymentConfirmedRole,
  paymentConfirmedAt: isZeroDonationAutoConfirmed ? new Date().toISOString() : user.paymentConfirmedAt,
};

    // ✅ Ticket join: force paid + claimed/confirmed flags
  if (ticketId) {
    sanitizedUser.paid = true;
    sanitizedUser.paymentClaimed = true;
    sanitizedUser.paymentConfirmedBy = 'ticket_system';

    // if no payment method came through, set a sensible default
    if (!sanitizedUser.paymentMethod || sanitizedUser.paymentMethod === 'unknown') {
      sanitizedUser.paymentMethod = normalizePaymentMethod('instant_payment');
    }

    if (debug) {
      console.log('[Join] 🎟️ Player joining via ticket:', {
        ticketId,
        id: sanitizedUser.id,
        name: sanitizedUser.name,
        paymentMethod: sanitizedUser.paymentMethod,
      });
    }
  }

  // ✅ Ensure name never falls back to ID
  if (!sanitizedUser.name || !String(sanitizedUser.name).trim()) {
    sanitizedUser.name = 'Player';
  }

  // ✅ Preserve an existing real name if incoming is blank/placeholder
  if (existingPlayer?.name && existingPlayer.name !== 'Player') {
    if (!user.name || user.name === 'Player') {
      sanitizedUser.name = existingPlayer.name;
    }
  }

  // ──────────────────────────────────────────────────────────────
  // 🔒 ENFORCE UNIQUENESS: disconnect any previous PLAYER socket
  // ──────────────────────────────────────────────────────────────
  const prevSocketId = existingSession?.socketId || existingPlayer?.socketId;
  if (prevSocketId && prevSocketId !== socket.id) {
    const prevSocket = namespace.sockets.get(prevSocketId);
    if (prevSocket && prevSocket.connected) {
      const isPrevPlayerSocket =
        prevSocket.rooms.has(roomId) &&
        prevSocket.rooms.has(`${roomId}:player`) &&
        !prevSocket.rooms.has(`${roomId}:host`);

      if (isPrevPlayerSocket) {
        prevSocket.emit('quiz_error', {
          message: 'You were signed in from another tab. This session is now active.',
        });
        try { prevSocket.disconnect(true); } catch {}
      } else if (debug) {
        console.warn('[Join] Skipping disconnect of non-player socket:', {
          prevSocketId,
          rooms: [...prevSocket.rooms]
        });
      }
    }
  }

  // Add or update player + session
  if (!existingPlayer) {
    addOrUpdatePlayer(roomId, sanitizedUser);
    joinedUser = sanitizedUser;

    updatePlayerSocketId(roomId, user.id, socket.id);
    updatePlayerSession(roomId, user.id, {
      socketId: socket.id,
      status: 'waiting',
      inPlayRoute: false,
      lastActive: Date.now(),
    });
  } else {
    const mergedExisting = {
      ...existingPlayer,
      ...sanitizedUser,
      extraPayments: {
        ...(existingPlayer.extraPayments || {}),
        ...(sanitizedUser.extraPayments || {}),
      },
      socketId: socket.id,
    };

    addOrUpdatePlayer(roomId, mergedExisting);
    joinedUser = mergedExisting;

    updatePlayerSocketId(roomId, user.id, socket.id);
    updatePlayerSession(roomId, user.id, {
      socketId: socket.id,
      status: existingSession?.status || 'waiting',
      inPlayRoute: !!existingSession?.inPlayRoute,
      lastActive: Date.now(),
    });
  }

  if (debug) console.log(`[Join] 🎮 Player "${joinedUser?.name || user.name}" (${user.id}) connected with socket ${socket.id}`);

// Around line 195-250 in playerHandlers.js

// ✅ NEW: Create ledger entries AFTER sanitizedUser exists
const isWeb2 = !isWeb3;
const joinedViaTicket = !!ticketId || sanitizedUser.paymentConfirmedBy === 'ticket_system';

if (isWeb2 && !joinedViaTicket && !isStripePostJoin) {
  try {
    const clubId = room.config?.clubId || room.config?.hostId || 'unknown';
    const currency = currencyFromSymbol(room.config?.currencySymbol || '€');

    const isHostSocket = room.hostSocketId === socket.id;
    const adminFromSocket = Array.isArray(room.admins)
      ? room.admins.find(a => a?.socketId && a.socketId === socket.id)
      : null;

    const isAdminInitiated = isHostSocket || !!adminFromSocket;

    let ledgerSource, ledgerStatus, claimedAt, confirmedAt, confirmedBy, confirmedByName, confirmedByRole;

    if (isAdminInitiated && sanitizedUser.paid) {
      ledgerSource = 'admin_assigned';
      ledgerStatus = 'confirmed';
      claimedAt = null;
      confirmedAt = new Date();

      if (isHostSocket) {
        confirmedBy = room.hostId || room.createdBy || 'host';
        confirmedByName = room.hostName || room.config?.hostName || 'Host';
        confirmedByRole = 'host';
      } else {
        confirmedBy = adminFromSocket.id;
        confirmedByName = adminFromSocket.name || 'Admin';
        confirmedByRole = 'admin';
      }
    } else {
      ledgerSource = sanitizedUser.paymentClaimed ? 'player_claimed' : 'player_selected';
      ledgerStatus = sanitizedUser.paymentClaimed ? 'claimed' : 'expected';
      claimedAt = sanitizedUser.paymentClaimed ? new Date() : null;
      confirmedAt = null;
      confirmedBy = null;
      confirmedByName = null;
      confirmedByRole = null;
    }

    const isDonationRoom = room.config?.fundraisingMode === 'donation';

    if (isDonationRoom) {
  const donationAmount = Number(sanitizedUser.donationAmount ?? 0);

  const isZeroDonationAutoConfirmed =
    isDonationRoom &&
    normalizedDonationAmount === 0 &&
    !ticketId &&
    !isStripePostJoin &&
    normalizedPaymentMethod !== 'stripe';

  const paymentLedgerAlreadyRecorded =
    sanitizedUser.paymentLedgerRecorded === true ||
    (
      sanitizedUser.paymentMethod === 'crypto' &&
      !!sanitizedUser.web3TxHash
    );

  if (paymentLedgerAlreadyRecorded) {
    if (debug) {
      console.log('[Ledger] ⏭️ Skipping donation ledger creation because payment was already recorded', {
        roomId,
        playerId: user.id,
        playerName: sanitizedUser.name,
        paymentMethod: sanitizedUser.paymentMethod,
        paymentReference: sanitizedUser.paymentReference || null,
        web3TxHash: sanitizedUser.web3TxHash || null,
        web3TransactionId: sanitizedUser.web3TransactionId || null,
        donationAmount,
      });
    }
  } else {
    // ✅ Donation rooms: one ledger row only, amount may be 0
    await createExpectedPayment({
      roomId,
      clubId,
      playerId: user.id,
      playerName: sanitizedUser.name,
      ledgerType: 'entry_fee',
      amount: donationAmount,
      currency,
      paymentMethod: sanitizedUser.paymentMethod,
      paymentSource: isZeroDonationAutoConfirmed ? 'system_zero_donation' : ledgerSource,
      status: isZeroDonationAutoConfirmed ? 'confirmed' : ledgerStatus,
      clubPaymentMethodId: sanitizedUser.clubPaymentMethodId || null,
      paymentReference: sanitizedUser.paymentReference || null,
      claimedAt: isZeroDonationAutoConfirmed ? null : claimedAt,
      confirmedAt: isZeroDonationAutoConfirmed ? new Date() : confirmedAt,
      confirmedBy: isZeroDonationAutoConfirmed ? 'system_zero_donation' : confirmedBy,
      confirmedByName: isZeroDonationAutoConfirmed ? 'System' : confirmedByName,
      confirmedByRole: isZeroDonationAutoConfirmed ? 'admin' : confirmedByRole,
      ticketId: null,
      extraMetadata: {
        fundraisingMode: 'donation',
        donationAmount,
        autoConfirmed: isZeroDonationAutoConfirmed,
      },
    });

    if (debug) {
      console.log(`[Ledger] ✅ Created donation ledger entry for ${user.id}`, {
        donationAmount,
        paymentMethod: sanitizedUser.paymentMethod,
        paymentSource: isZeroDonationAutoConfirmed ? 'system_zero_donation' : ledgerSource,
        status: isZeroDonationAutoConfirmed ? 'confirmed' : ledgerStatus,
        isAdminInitiated,
        paid: sanitizedUser.paid,
      });
    }
  }
} else {
      const entryFee = parseFloat(room.config?.entryFee || 0);

      if (entryFee > 0) {
        await createExpectedPayment({
          roomId,
          clubId,
          playerId: user.id,
          playerName: sanitizedUser.name,
          ledgerType: 'entry_fee',
          amount: entryFee,
          currency,
          paymentMethod: sanitizedUser.paymentMethod,
          paymentSource: ledgerSource,
          status: ledgerStatus,
          clubPaymentMethodId: sanitizedUser.clubPaymentMethodId || null,
          paymentReference: sanitizedUser.paymentReference || null,
          claimedAt,
          confirmedAt,
          confirmedBy,
          confirmedByName,
          confirmedByRole,
          ticketId: null,
        });
      }

      if (sanitizedUser.extras && Array.isArray(sanitizedUser.extras)) {
        for (const extraId of sanitizedUser.extras) {
          const extraPrice = room.config.fundraisingPrices?.[extraId];
          if (extraPrice && extraPrice > 0) {
            await createExpectedPayment({
              roomId,
              clubId,
              playerId: user.id,
              playerName: sanitizedUser.name,
              ledgerType: 'extra_purchase',
              amount: extraPrice,
              currency,
              paymentMethod: sanitizedUser.paymentMethod,
              paymentSource: ledgerSource,
              status: ledgerStatus,
              clubPaymentMethodId: sanitizedUser.clubPaymentMethodId || null,
              paymentReference: sanitizedUser.paymentReference || null,
              claimedAt,
              confirmedAt,
              confirmedBy,
              confirmedByName,
              confirmedByRole,
              extraId,
              extraMetadata: { extraId, price: extraPrice },
              ticketId: null,
            });
          }
        }
      }

      if (debug) {
        console.log(`[Ledger] ✅ Created fixed-fee ledger entries for ${user.id}`, {
          entryFee,
          extrasCount: sanitizedUser.extras?.length || 0,
          paymentMethod: sanitizedUser.paymentMethod,
          paymentSource: ledgerSource,
          status: ledgerStatus,
          isAdminInitiated,
          paid: sanitizedUser.paid,
        });
      }
    }
  } catch (ledgerErr) {
    console.error(`[Ledger] ❌ Failed to create ledger entries for ${user.id}:`, ledgerErr);
  }
} else if (joinedViaTicket) {
  if (debug) {
    console.log(
      `[Ledger] ⏭️ Skipping ledger creation for ticket user ${user.id} - entries already exist from ticket purchase`
    );
  }
}

  // OPTIONAL: store Web3 wallet details for payouts (players only)
  if (user.web3Address && user.web3Chain) {
    if (!room.web3AddressMap) room.web3AddressMap = new Map();
    room.web3AddressMap.set(user.id, {
      address: user.web3Address,
      chain: user.web3Chain,
      txHash: user.web3TxHash || null,
      playerName: joinedUser?.name || user.name || 'Unknown'
    });
    if (!room.config.web3PlayerAddresses) room.config.web3PlayerAddresses = {};
    room.config.web3PlayerAddresses[user.id] = {
      address: user.web3Address,
      chain: user.web3Chain,
      name: joinedUser?.name || user.name
    };
  }

} else {
 
      if (debug) console.error(`[Join] ❌ Unknown role: "${role}"`);
      socket.emit('quiz_error', { message: `Unknown role "${role}".` });
      return;
    }

    // Emit room state after processing join
    emitRoomState(namespace, roomId);
    emitFullRoomState(socket, namespace, roomId);
    
    // ✅ FIX: Now joinedUser will have the correct player data
    const broadcastUser = joinedUser || { ...user, socketId: socket.id };
    if (role === 'player') {
  namespace.to(roomId).emit('user_joined', { user: broadcastUser, role: 'player' });
} else if (role === 'host') {
  namespace.to(roomId).emit('host_joined', { user: { id: user.id, name: room.config?.hostName || user.name }, role: 'host' });
} else if (role === 'admin') {
  namespace.to(roomId).emit('admin_joined', { user: { id: user.id, name: user.name }, role: 'admin' });
}


    setTimeout(() => {
      namespace.in(roomId).allSockets().then(clients => {
        // if (debug) console.log(`[JoinDebug] 🔎 Clients in ${roomId}:`, [...clients]);
      });
    }, 50);
  });

    /**
   * Host/Admin player editor:
   * Update an existing player (paid flag, extras, payment method, etc.)
   *
   * payload: { roomId, playerId, updates }
   */
socket.on('update_player', async (payload, ack) => {  // ✅ Already async - good!
  const sendAck = typeof ack === 'function' ? ack : () => {};
  try {
    const { roomId, playerId, updates } = payload || {};
    if (!roomId || !playerId || !updates || typeof updates !== 'object') {
      if (debug) console.warn('[update_player] ❌ Invalid payload', payload);
      return sendAck({ ok: false, error: 'Invalid payload' });
    }

    if (debug) {
      console.log('[update_player] raw updates.paymentMethod =', updates.paymentMethod);
      console.log('[update_player] raw updates.extraPayments =', updates.extraPayments);
      console.log('[update_player] raw updates.extras =', updates.extras);
      console.log('[update_player] raw updates.paid =', updates.paid);
    }

    const room = getQuizRoom(roomId);
    if (!room) {
      if (debug) console.warn('[update_player] ❌ Room not found', roomId);
      return sendAck({ ok: false, error: 'Room not found' });
    }

    const existing = room.players.find((p) => p.id === playerId);
    if (!existing) {
      if (debug) console.warn('[update_player] ❌ Player not found', { roomId, playerId });
      return sendAck({ ok: false, error: 'Player not found' });
    }

    // ✅ Track if paid status changed from false to true
    const wasPaid = !!existing.paid;
    const nowPaid = !!updates.paid;
    const paidStatusChanged = !wasPaid && nowPaid;

    if (debug) {
      console.log('[update_player] 🔍 Payment status check:', {
        wasPaid,
        nowPaid,
        paidStatusChanged,
        existingPaymentMethod: existing.paymentMethod,
        newPaymentMethod: updates.paymentMethod,
      });
    }

    // Normalise payment method if it's in the updates
    const nextPaymentMethod =
      updates.paymentMethod != null
        ? normalizePaymentMethod(updates.paymentMethod)
        : existing.paymentMethod;

    const nextExtras =
      Array.isArray(updates.extras) ? updates.extras : (existing.extras || []);

    let nextExtraPayments;
    if (updates.extraPayments != null) {
      nextExtraPayments = normalizeExtraPayments(updates.extraPayments);
    } else if (Array.isArray(updates.extras)) {
      nextExtraPayments = {};
      for (const extraId of nextExtras) {
        const existingPayment = existing.extraPayments?.[extraId];
        nextExtraPayments[extraId] = existingPayment
          ? { ...existingPayment, method: nextPaymentMethod }
          : {
              method: nextPaymentMethod,
              amount: room.config?.fundraisingPrices?.[extraId] || 0,
            };
      }
    } else {
      nextExtraPayments = existing.extraPayments || {};
    }

    const merged = {
      ...existing,
      ...updates,
      paymentMethod: nextPaymentMethod,
      extras: nextExtras,
      extraPayments: nextExtraPayments,
    };

    // ✅ NEW: If payment status changed to paid, update ledger BEFORE updating player
    if (paidStatusChanged) {
      console.log('[update_player] 🏦 Payment status changed to paid - updating ledger...');
      
      try {
        const adminId = room.hostId || 'unknown';
        const adminName = room.config?.hostName || 'Admin';
        const adminRole = 'host';

        // ✅ CRITICAL: Determine which payment method to use
        // If method changed during edit, use new method; otherwise keep existing
        const methodChanged = updates.paymentMethod && 
                             normalizePaymentMethod(updates.paymentMethod) !== existing.paymentMethod;
        
        const ledgerPaymentMethod = methodChanged ? nextPaymentMethod : null;
        
        console.log('[update_player] 📝 Calling confirmPayment with:', {
          roomId,
          playerId,
          confirmedBy: adminId,
          confirmedByName: adminName,
          confirmedByRole: adminRole,
          paymentMethod: ledgerPaymentMethod,
          adminNotes: 'Marked as paid via player edit',
        });

        const ledgerResult = await confirmPayment({
          roomId,
          playerId,
          confirmedBy: adminId,
          confirmedByName: adminName,
          confirmedByRole: adminRole,
          adminNotes: 'Marked as paid via player edit',
          paymentMethod: ledgerPaymentMethod,
          clubPaymentMethodId: updates.clubPaymentMethodId || null,
        });

        console.log('[update_player] 🏦 Ledger confirmPayment result:', ledgerResult);

        if (!ledgerResult.ok) {
          console.error('[update_player] ❌ Ledger update failed:', ledgerResult);
          // Continue anyway - don't block the player update
        } else {
          console.log('[update_player] ✅ Ledger updated successfully', {
            roomId,
            playerId,
            playerName: merged.name,
            paymentMethod: nextPaymentMethod,
            ledgerRowsUpdated: ledgerResult.updated,
          });
        }
      } catch (ledgerErr) {
        console.error('[update_player] ❌ Exception updating ledger:', ledgerErr);
        console.error('[update_player] ❌ Stack trace:', ledgerErr.stack);
        // Don't block the player update, just log the error
      }
    } else if (debug) {
      console.log('[update_player] ⏭️ Payment status unchanged - skipping ledger update');
    }

    const isDonationRoom = room.config?.fundraisingMode === 'donation';

if (isDonationRoom && Object.prototype.hasOwnProperty.call(updates, 'donationAmount')) {
  const donationAmount = Number(updates.donationAmount || 0);

  if (!Number.isFinite(donationAmount) || donationAmount < 0) {
    return sendAck({ ok: false, error: 'Invalid donation amount' });
  }

  const ledgerResult = await updateDonationLedgerAmount({
    roomId,
    playerId,
    amount: donationAmount,
    paymentMethod: nextPaymentMethod,
    clubPaymentMethodId: updates.clubPaymentMethodId ?? existing.clubPaymentMethodId ?? null,
  });

  if (!ledgerResult.ok) {
    return sendAck({ ok: false, error: 'Failed to update donation ledger' });
  }

  merged.donationAmount = donationAmount;
}

    // ✅ Now update the player in memory
    addOrUpdatePlayer(roomId, merged);

    if (debug) {
      console.log('[update_player] ✅ Updated player', {
        roomId,
        playerId,
        name: merged.name,
        paid: merged.paid,
        paidStatusChanged,
        paymentMethod: merged.paymentMethod,
        extras: merged.extras,
        extraPayments: merged.extraPayments,
      });
    }

    const playersLite = room.players.map((p) => ({
      id: p.id,
      name: p.name,
      paid: !!p.paid,
      paymentMethod: p.paymentMethod,
      paymentClaimed: !!p.paymentClaimed,
      paymentReference: p.paymentReference || null,
      clubPaymentMethodId: p.clubPaymentMethodId || null,
      paymentConfirmedBy: p.paymentConfirmedBy,
      extras: p.extras || [],
      extraPayments: p.extraPayments || {},
      disqualified: !!p.disqualified,
    }));

    namespace.to(roomId).emit('player_list_updated', { players: playersLite });
    emitRoomState(namespace, roomId);
    emitFullRoomState(socket, namespace, roomId);

    return sendAck({ ok: true, player: merged });
  } catch (err) {
    console.error('[update_player] 💥 Error:', err);
    console.error('[update_player] 💥 Stack trace:', err.stack);
    return sendAck({ ok: false, error: 'Internal error' });
  }
});

// Add this handler in playerHandlers.js after the update_player handler

socket.on('confirm_player_payment', async (payload, ack) => {
  const sendAck = typeof ack === 'function' ? ack : () => {};
  
  try {
    const { roomId, playerId, adminNotes } = payload || {};
    
    if (!roomId || !playerId) {
      if (debug) console.warn('[confirm_player_payment] ❌ Invalid payload', payload);
      return sendAck({ ok: false, error: 'Invalid payload' });
    }

    const room = getQuizRoom(roomId);
    if (!room) {
      if (debug) console.warn('[confirm_player_payment] ❌ Room not found', roomId);
      return sendAck({ ok: false, error: 'Room not found' });
    }

    const player = room.players.find((p) => p.id === playerId);
    if (!player) {
      if (debug) console.warn('[confirm_player_payment] ❌ Player not found', { roomId, playerId });
      return sendAck({ ok: false, error: 'Player not found' });
    }

    // ✅ Get admin info from socket
    const adminId = room.hostId; // or extract from socket context
    const adminName = room.config?.hostName || 'Admin';
    const adminRole = 'host'; // or 'admin' if you track that

    // ✅ Update ledger status from 'claimed' to 'confirmed'
    const ledgerResult = await confirmPayment({
      roomId,
      playerId,
      confirmedBy: adminId,
      confirmedByName: adminName,
      confirmedByRole: adminRole,
      adminNotes: adminNotes || 'Payment confirmed by staff',
      // Don't override payment method - keep what player claimed
      paymentMethod: null,
      clubPaymentMethodId: null,
    });

    if (!ledgerResult.ok) {
      console.error('[confirm_player_payment] ❌ Failed to update ledger', ledgerResult);
      return sendAck({ ok: false, error: 'Failed to update payment ledger' });
    }

    // ✅ Update player record to mark as paid
    const updatedPlayer = {
      ...player,
      paid: true,
      paymentConfirmedBy: adminId,
      paymentConfirmedAt: new Date().toISOString(),
    };

    addOrUpdatePlayer(roomId, updatedPlayer);

    if (debug) {
      console.log('[confirm_player_payment] ✅ Payment confirmed', {
        roomId,
        playerId,
        playerName: player.name,
        paymentMethod: player.paymentMethod,
        paymentReference: player.paymentReference,
        ledgerRowsUpdated: ledgerResult.updated,
      });
    }

    // ✅ Broadcast updated player list
    const playersLite = room.players.map((p) => ({
      id: p.id,
      name: p.name,
      paid: !!p.paid,
      paymentMethod: p.paymentMethod,
      paymentClaimed: !!p.paymentClaimed,
      paymentReference: p.paymentReference || null,
      clubPaymentMethodId: p.clubPaymentMethodId || null,
      paymentConfirmedBy: p.paymentConfirmedBy,
      extras: p.extras || [],
      extraPayments: p.extraPayments || {},
      disqualified: !!p.disqualified,
    }));

    namespace.to(roomId).emit('player_list_updated', { players: playersLite });
    emitRoomState(namespace, roomId);
    emitFullRoomState(socket, namespace, roomId);

    return sendAck({ ok: true, player: updatedPlayer });
  } catch (err) {
    console.error('[confirm_player_payment] 💥 Error:', err);
    return sendAck({ ok: false, error: 'Internal error' });
  }
});
  // --- Tie-breaker: player submits numeric answer ---
  socket.on('tiebreak:answer', async ({ roomId, answer }) => {
    const room = getQuizRoom(roomId);
    if (!room?.tiebreaker?.isActive) return;

    // Only participants can submit
    const player = room.players.find(p => p.socketId === socket.id);
    const playerId = player?.id;
    if (!playerId || !room.tiebreaker.participants.includes(playerId)) return;

    // Lazy import to avoid top-level circular deps
    const mod = await import('../gameplayEngines/services/TiebreakerService.js');
    mod.TiebreakerService.receiveAnswer(room, playerId, Number(answer));
  });

  // ✅ NEW: Route change tracking for anti-cheat
socket.on('player_route_change', ({ roomId, playerId, route, entering }) => {
  if (!roomId || !playerId || !route) {
    console.error(`[RouteChange] ❌ Missing data:`, { roomId, playerId, route, entering });
    return;
  }

  if (route === 'play') {
    updatePlayerSession(roomId, playerId, {
      socketId: socket.id,
      status: entering ? 'playing' : 'waiting',
      inPlayRoute: !!entering
    });

    if (debug) {
      console.log(
        `[RouteChange] ${entering ? '✅' : '⬅️'} Player ${playerId} ${entering ? 'entered' : 'left'} play route`
      );
    }
  }
});


  socket.on('add_admin', ({ roomId, admin }) => {
    if (debug) console.log(`[AddAdmin] 🛠️ Host adding admin "${admin.name}" to room ${roomId}`);

    if (!roomId || !admin || !admin.name || !admin.id) {
      console.error(`[AddAdmin] ❌ Invalid data:`, { roomId, admin });
      socket.emit('quiz_error', { message: 'Invalid admin data provided.' });
      return;
    }

    const room = getQuizRoom(roomId);
    if (!room) {
      console.warn(`[AddAdmin] ❌ Room not found: ${roomId}`);
      socket.emit('quiz_error', { message: `Room ${roomId} not found.` });
      return;
    }

    const existingAdmin = room.admins.find(a => a.name.toLowerCase() === admin.name.toLowerCase());
    if (existingAdmin) {
      console.warn(`[AddAdmin] ❌ Admin name already exists: ${admin.name}`);
      socket.emit('quiz_error', { message: `An admin named "${admin.name}" already exists.` });
      return;
    }

    const success = addAdminToQuizRoom(roomId, admin);
    if (!success) {
      console.error(`[AddAdmin] ❌ Failed to add admin to room ${roomId}`);
      socket.emit('quiz_error', { message: 'Failed to add admin to room.' });
      return;
    }

    if (debug) console.log(`[AddAdmin] ✅ Admin "${admin.name}" added to room ${roomId}`);

    namespace.to(roomId).emit('admin_list_updated', { admins: room.admins });
    emitRoomState(namespace, roomId);
  });

  socket.on('submit_answer', ({ roomId, playerId, questionId, answer, autoTimeout }) => {
    if (debug) console.log(`[DEBUG] submit_answer received:`, { roomId, playerId, questionId, answer, autoTimeout });
    
    // ✅ NEW: Guard against answers after completion
  const room = getQuizRoom(roomId);
  if (!room) {
    socket.emit('quiz_error', { message: 'Room not found' });
    return;
  }

  // ✅ CRITICAL: Block submissions if quiz is complete
  if (room.currentPhase === 'complete' || room.completedAt) {
    if (debug) console.warn('[submit_answer] ⚠️ Quiz already complete, ignoring answer from', playerId);
    socket.emit('quiz_error', { message: 'Quiz has already completed' });
    return;
  }

    const enginePromise = getEngine(room);
    if (!enginePromise) {
      socket.emit('quiz_error', { message: 'No gameplay engine available' });
      return;
    }

    enginePromise.then(engine => {
      if (!engine?.handlePlayerAnswer) {
        socket.emit('quiz_error', { message: 'Invalid gameplay engine' });
        return;
      }
      const normalised = (answer === '' || answer === undefined) ? null : answer;
      engine.handlePlayerAnswer(roomId, playerId, { questionId, answer: normalised, autoTimeout }, namespace);
    }).catch(err => {
      console.error(`[DEBUG] Engine loading failed:`, err);
    });
  });

  // REPLACED: use_extra
socket.on('use_extra', async ({ roomId, playerId, extraId, targetPlayerId }) => {
  const room = getQuizRoom(roomId);
  if (!room) {
    socket.emit('quiz_error', { message: 'Room not found' });
    return;
  }

  const isWeb3 =
    room.config?.paymentMethod === 'web3' ||
    room.config?.isWeb3Room === true;

  // Use the same caps source pattern you already use elsewhere
  const caps = room.roomCaps ?? room.config?.roomCaps ?? null;
  const extrasAllowed = caps?.extrasAllowed;

  // ✅ FIX: treat ['*'] as wildcard too
  const isWildcard =
    extrasAllowed === '*' ||
    (Array.isArray(extrasAllowed) && extrasAllowed.includes('*'));

  const allowedByPlan =
    isWeb3 ||
    isWildcard ||
    (Array.isArray(extrasAllowed) && extrasAllowed.includes(extraId));

  const enabledInConfig = !!room.config?.fundraisingOptions?.[extraId];

  if (debug) {
    console.log('[PlayerHandler] 🧩 use_extra check', {
      roomId,
      playerId,
      extraId,
      targetPlayerId,
      isWeb3,
      capsLocation: room.roomCaps ? 'room.roomCaps' : (room.config?.roomCaps ? 'room.config.roomCaps' : 'none'),
      extrasAllowed,
      isWildcard,
      allowedByPlan,
      enabledInConfig,
      fundraisingOptionKeys: Object.keys(room.config?.fundraisingOptions || {}),
    });
  }

  if (!allowedByPlan || !enabledInConfig) {
    console.warn(`[PlayerHandler] 🚫 Extra "${extraId}" not permitted`, {
      allowedByPlan,
      enabledInConfig,
      isWeb3,
      extrasAllowed,
      isWildcard,
      fundraisingOptionKeys: Object.keys(room.config?.fundraisingOptions || {}),
    });
    socket.emit('quiz_error', { message: `Extra "${extraId}" is not available in this game.` });
    return;
  }

  const result = handlePlayerExtra(roomId, playerId, extraId, targetPlayerId, namespace);

  if (!result.success) {
    console.warn(`[PlayerHandler] ❌ Extra ${extraId} failed for ${playerId}: ${result.error}`);
    socket.emit('quiz_error', { message: result.error });
    return;
  }

  if (debug) console.log(`[PlayerHandler] ✅ Extra ${extraId} used successfully by ${playerId}`);
  socket.emit('extra_used_successfully', { extraId });

  try {
    const enginePromise = getEngine(room);
    if (enginePromise) {
      const engine = await enginePromise;

      if (extraId === 'buyHint' && engine.handleHintExtra) {
        engine.handleHintExtra(roomId, playerId, namespace);
        if (debug) console.log(`[PlayerHandler] 📡 Sent hint notification to host for ${playerId}`);
      } else if (extraId === 'freezeOutTeam' && targetPlayerId && engine.handleFreezeExtra) {
        engine.handleFreezeExtra(roomId, playerId, targetPlayerId, namespace);
        if (debug) console.log(`[PlayerHandler] 📡 Sent freeze notification to host for ${playerId} -> ${targetPlayerId}`);
      }
    }
  } catch (error) {
    console.error(`[PlayerHandler] ❌ Failed to send host notification:`, error);
  }
});


  // Speed-round-specific instant submit
  socket.on('submit_speed_answer', ({ roomId, playerId, questionId, answer }) => {
    const room = getQuizRoom(roomId);
    if (!room) {
      socket.emit('quiz_error', { message: 'Room not found' });
      return;
    }
    const enginePromise = getEngine(room);
    if (!enginePromise) {
      socket.emit('quiz_error', { message: 'No gameplay engine available' });
      return;
    }

    Promise.resolve(enginePromise).then(engine => {
      if (!engine?.handlePlayerAnswer) {
        socket.emit('quiz_error', { message: 'Invalid gameplay engine' });
        return;
      }
      engine.handlePlayerAnswer(roomId, playerId, { questionId, answer }, namespace);
    }).catch(err => {
      console.error(`[submit_speed_answer] Engine load error:`, err);
    });
  });

  socket.on('use_clue', ({ roomId, playerId }) => {
    if (debug) console.log(`[PlayerHandler] 💡 Legacy use_clue from ${playerId} - redirecting to buyHint`);

    const result = handlePlayerExtra(roomId, playerId, 'buyHint', null, namespace);

    if (result.success) {
      if (debug) console.log(`[PlayerHandler] ✅ Legacy clue used successfully by ${playerId}`);
      const room = getQuizRoom(roomId);
      const question = getCurrentQuestion(roomId);
      if (question?.clue) {
        socket.emit('clue_revealed', { clue: question.clue });
      }
    } else {
      console.warn(`[PlayerHandler] ❌ Legacy clue failed for ${playerId}: ${result.error}`);
      socket.emit('clue_error', { reason: result.error });
    }
  });
 // --- Hidden Object: player found an item ---
  socket.on('hidden_object_found', async ({ roomId, playerId, itemId, x, y }) => {
  const room = getQuizRoom(roomId);
  if (!room) return;

  const enginePromise = getEngine(room);
  if (!enginePromise) return;

  try {
    const engine = await enginePromise;
    if (engine?.handleFound) {
      engine.handleFound(roomId, playerId, { itemId, x, y }, namespace);
    }
  } catch (e) {
    console.error('[hidden_object_found] engine error', e);
  }
});


  // request_current_state handler
socket.on('request_current_state', ({ roomId, playerId }) => {
  emitFullRoomState(socket, namespace, roomId);

  const room = getQuizRoom(roomId);
  if (!room) return;

  const roundType = room.config?.roundDefinitions?.[room.currentRound - 1]?.roundType;

  // ─────────────────────────────────────────────
  // ASKING PHASE
  // ─────────────────────────────────────────────
  if (room.currentPhase === 'asking') {
    // 1) Speed round recovery
    if (roundType === 'speed_round') {
      const remaining = Math.max(0, Math.floor(((room.roundEndTime || 0) - Date.now()) / 1000));
      socket.emit('round_time_remaining', { remaining });

      const cursor = room.playerCursors?.[playerId] ?? 0;
      const q = room.questions?.[cursor];
      if (q) {
        socket.emit('speed_question', {
          id: q.id,
          text: q.text,
          options: Array.isArray(q.options) ? q.options.slice(0, 2) : [],
        });
      }
      // host extras still happen below (no return required, but OK to return)
      // return;
    }

    // 2) Hidden Object recovery
    if (roundType === 'hidden_object') {
      const ho = room.hiddenObject;
      if (ho) {
        const remaining = Math.max(0, Math.floor(((room.roundEndTime || 0) - Date.now()) / 1000));
        socket.emit('round_time_remaining', { remaining });

        const pState = ho.player?.[playerId];
        const foundIds = pState?.foundIds ? Array.from(pState.foundIds) : [];

        socket.emit('hidden_object_start', {
          puzzleId: ho.puzzleId,
          imageUrl: ho.imageUrl,
          difficulty: ho.difficulty,
          category: ho.category,
          totalSeconds: ho.totalSeconds,
          itemTarget: ho.itemTarget,
          items: ho.items.map(it => ({ id: String(it.id), label: it.label, bbox: it.bbox })),
          foundIds,
          finished: !!pState?.finishTs
        });
      }
      // return;
    }

    // 3) Standard question-based recovery (general_trivia/wipeout)
    if (roundType !== 'speed_round' && roundType !== 'hidden_object') {
      if (room.currentQuestionIndex >= 0 && room.questions?.[room.currentQuestionIndex]) {
        const question = room.questions[room.currentQuestionIndex];
        const roundConfig = room.config.roundDefinitions[room.currentRound - 1];
        const timeLimit = roundConfig?.config?.timePerQuestion || 10;
        const questionStartTime = room.questionStartTime || Date.now();

        const elapsed = Math.floor((Date.now() - questionStartTime) / 1000);
        const remainingTime = Math.max(0, timeLimit - elapsed);

        const playerData = room.playerData[playerId];
        const roundAnswerKey = `${question.id}_round${room.currentRound}`;
        const hasAnswered = !!playerData?.answers?.[roundAnswerKey];
        const submittedAnswer = playerData?.answers?.[roundAnswerKey]?.submitted || null;

        const isFrozen =
          playerData?.frozenNextQuestion &&
          playerData?.frozenForQuestionIndex === room.currentQuestionIndex;

        socket.emit('question', {
          id: question.id,
          text: question.text,
          options: question.options || [],
          timeLimit,
          questionStartTime,
          questionNumber: room.currentQuestionIndex + 1,
          totalQuestions: room.questions.length,
        });

        socket.emit('player_state_recovery', {
          hasAnswered,
          submittedAnswer,
          isFrozen,
          frozenBy: playerData?.frozenBy || null,
          usedExtras: playerData?.usedExtras || {},
          usedExtrasThisRound: playerData?.usedExtrasThisRound || {},
          remainingTime,
          currentQuestionIndex: room.currentQuestionIndex
        });

        if (debug) {
          console.log(`[Recovery] 🔁 Sent state recovery for ${playerId}: answered=${hasAnswered}, frozen=${isFrozen}, remaining=${remainingTime}s`);
        }
      }
      // return;
    }
  }

  // ─────────────────────────────────────────────
  // REVIEWING PHASE
  // ─────────────────────────────────────────────
  if (room.currentPhase === 'reviewing') {
    if (debug) console.log(`[Recovery] 📖 Recovering review phase for ${playerId} in room ${roomId}`);

    let enginePromise;
    if (roundType === 'general_trivia') enginePromise = import('../gameplayEngines/generalTriviaEngine.js');
    else if (roundType === 'wipeout') enginePromise = import('../gameplayEngines/wipeoutEngine.js');
    else if (roundType === 'speed_round') enginePromise = import('../gameplayEngines/speedRoundEngine.js');
    else if (roundType === 'hidden_object') enginePromise = import('../gameplayEngines/hiddenObjectEngine.js');

    if (enginePromise) {
      enginePromise.then(engine => {
        const reviewQuestion = engine?.getCurrentReviewQuestion?.(roomId);

        if (reviewQuestion) {
          const isHost = playerId === 'host' || socket.rooms.has(`${roomId}:host`);
          if (isHost) {
            socket.emit('host_review_question', {
              id: reviewQuestion.id,
              text: reviewQuestion.text,
              options: reviewQuestion.options || [],
              correctAnswer: reviewQuestion.correctAnswer,
              difficulty: reviewQuestion.difficulty,
              category: reviewQuestion.category
            });
          } else {
            const playerData = room.playerData[playerId];
            const roundAnswerKey = `${reviewQuestion.id}_round${room.currentRound}`;
            const playerAnswer = playerData?.answers?.[roundAnswerKey];

            socket.emit('review_question', {
              id: reviewQuestion.id,
              text: reviewQuestion.text,
              options: reviewQuestion.options || [],
              correctAnswer: reviewQuestion.correctAnswer,
              submittedAnswer: playerAnswer?.submitted || null,
              difficulty: reviewQuestion.difficulty,
              category: reviewQuestion.category
            });
          }
        }

        if (engine?.isReviewComplete?.(roomId)) {
          const roundConfig = room.config.roundDefinitions[room.currentRound - 1];
          const questionsPerRound = roundConfig?.config?.questionsPerRound || 0;

          socket.emit('review_complete', {
            message: `Review complete`,
            roundNumber: room.currentRound,
            totalQuestions: questionsPerRound
          });
        }
      }).catch(err => console.error(`[Recovery] ❌ Failed to load engine for review recovery:`, err));
    }
  }

  // ─────────────────────────────────────────────
  // LEADERBOARD PHASE  ✅ no else-if dependency
  // ─────────────────────────────────────────────
  if (room.currentPhase === 'leaderboard') {
    if (debug) console.log(`[Recovery] 🏆 Recovering leaderboard phase for ${playerId} in room ${roomId}`);

    if (room.currentRoundResults && !room.currentOverallLeaderboard) {
      socket.emit('round_leaderboard', room.currentRoundResults);
    } else if (room.currentOverallLeaderboard) {
      socket.emit('leaderboard', room.currentOverallLeaderboard);
    } else if (room.currentRoundResults) {
      socket.emit('round_leaderboard', room.currentRoundResults);
    }
  }

  // ─────────────────────────────────────────────
  // HOST STATS (always after phase recovery)
  // ─────────────────────────────────────────────
  const isHost = !playerId || playerId === 'host' || socket.rooms.has(`${roomId}:host`);
  if (isHost && socket.rooms.has(`${roomId}:host`)) {
    if (debug) console.log(`[Recovery] 📊 Recovering host stats for room ${roomId}`);

    if (room.currentRoundStats) socket.emit('host_current_round_stats', room.currentRoundStats);
    if (room.finalQuizStats) socket.emit('host_final_stats', room.finalQuizStats);
    if (room.cumulativeStatsForRecovery) socket.emit('host_cumulative_stats', room.cumulativeStatsForRecovery);
  }
});
}








