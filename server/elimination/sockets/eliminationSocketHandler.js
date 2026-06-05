//server/elimination/sockets/eliminationSocketHandler.js

import {
  addPlayer,
  findPlayerBySocket,
  getRoomSnapshot,
  getRoom,
} from '../services/eliminationRoomManager.js';
import { startGame } from '../services/eliminationGameService.js';
import { recordSubmission, recordStartPress } from '../services/eliminationRoundService.js';
import { reconnectPlayer, handleDisconnect } from '../services/eliminationReconnectionService.js';
import { checkSocketRate, cleanupSocket } from '../utils/socketRateLimit.js';
import {
  validateJoin,
  validateStart,
  validateRoundSubmission,
} from '../services/eliminationValidationService.js';
import {
  CLIENT_EVENTS,
  SERVER_EVENTS,
  ROOM_STATUS,
} from '../utils/eliminationConstants.js';
import { Connection } from '@solana/web3.js';
import {
  createExpectedPayment, confirmPayment
} from '../../mgtsystem/services/quizPaymentLedgerService.js';

import { normalizePaymentMethod } from '../../utils/paymentMethods.js';
import {
   saveAdjustmentEntry,
   deleteAdjustmentEntry,
   approveEliminationReconciliation,
 } from '../services/eliminationStatsService.js';
 import { markReconciliationApproved } from '../services/eliminationRoomManager.js';
import { refreshReconciliationStartingTotal } from '../services/eliminationStatsService.js';

// ── STATUS TRANSITION: open → live ───────────────────────────────────────────
// Imported here so the socket layer can write to DB without going through
// the HTTP route. Non-fatal — a DB failure never blocks the game from starting.
import { markEliminationRoomAsLive } from '../api/eliminationMgmtService.js';


const getAllPlayers = (roomId) =>
  Object.values(getRoom(roomId)?.players ?? {}).map((p) => ({
    playerId:           p.playerId,
    name:               p.name,
    connected:          p.connected,
    eliminated:         p.eliminated ?? false,
    walletAddress:      p.walletAddress ?? null,
    // ── web2 payment status — needed by host waiting room UI ──
    paid:               p.paid            ?? false,
    paymentClaimed:     p.paymentClaimed  ?? false,
    payAtDoor:          p.payAtDoor       ?? false,
    paymentMethod:      p.paymentMethod   ?? null,
    paymentReference:   p.paymentReference ?? null,
    clubPaymentMethodId: p.clubPaymentMethodId ?? null,
  }));

// ── Web3 tx verification ──────────────────────────────────────────────────────
const verifyWeb3JoinTx = async (txSignature, room) => {
  try {
    const cluster = room.solanaCluster ?? 'mainnet';
    const rpcUrl = cluster === 'mainnet'
      ? 'https://api.mainnet-beta.solana.com'
      : 'https://api.devnet.solana.com';

    const connection = new Connection(rpcUrl, 'confirmed');

    const tx = await connection.getTransaction(txSignature, {
      commitment: 'confirmed',
      maxSupportedTransactionVersion: 0,
    });

    if (!tx) {
      return { valid: false, error: 'Payment transaction not found. Please try again.' };
    }

    if (tx.meta?.err) {
      return { valid: false, error: 'Payment transaction failed on-chain.' };
    }

    let walletAddress = null;
    try {
      const accountKeys = tx.transaction.message.getAccountKeys
        ? tx.transaction.message.getAccountKeys().staticAccountKeys
        : tx.transaction.message.accountKeys;

      if (accountKeys && accountKeys.length > 0) {
        walletAddress = accountKeys[0].toBase58();
      }
    } catch (e) {
      console.warn('[Elimination] Could not extract wallet from tx:', e.message);
    }

    console.log(`[Elimination] Web3 join tx verified: ${txSignature} wallet: ${walletAddress}`);
    return { valid: true, walletAddress };

  } catch (err) {
    console.error('[Elimination] Web3 tx verification error:', err);
    return { valid: false, error: 'Could not verify payment. Please try again.' };
  }
};

// ── Ledger write helper ───────────────────────────────────────────────────────
const writeLedgerEntry = async (room, player) => {
  if (
    room.paymentMode !== 'web2' ||
    !room.entryFee ||
    !room.clubId
  ) return;

  try {
    if (player.paymentMethod === 'stripe') return;

    const isConfirmed  = player.paid;
    const isClaimed    = player.paymentClaimed && !player.paid;

    const status = isConfirmed ? 'confirmed' : isClaimed ? 'claimed' : 'expected';

    await createExpectedPayment({
      roomId:               room.roomId,
      clubId:               room.clubId,
      playerId:             player.playerId,
      playerName:           player.name,
      ledgerType:           'entry_fee',
      amount:               room.entryFee,
      currency:             room.currency ?? 'EUR',
      paymentMethod:        player.paymentMethod ?? 'unknown',
      paymentSource: player.paymentClaimed ? 'player_claimed' : 'player_selected',
      clubPaymentMethodId:  player.clubPaymentMethodId ?? null,
      paymentReference:     player.paymentReference ?? null,
      status,
      claimedAt:            isClaimed  ? new Date() : null,
      confirmedAt:          isConfirmed ? new Date() : null,
      confirmedBy:          isConfirmed ? 'stripe_webhook' : null,
      confirmedByName:      isConfirmed ? 'Stripe' : null,
      confirmedByRole:      isConfirmed ? 'admin' : null,
    });

    console.log(`[Elimination] Ledger entry written — room: ${room.roomId} player: ${player.playerId} status: ${status}`);
  } catch (err) {
    console.error('[Elimination] Ledger write failed (non-fatal):', err.message);
  }
};

export const registerEliminationSockets = (io) => {
  const emitToRoom = (roomId, event, payload) =>
    io.to(roomId).emit(event, payload);

  const sanitiseName = (name) => {
    if (typeof name !== 'string') return 'Player';
    return name
      .trim()
      .replace(/<[^>]*>/g, '')
      .replace(/[^\w\s\-'.]/g, '')
      .slice(0, 32);
  };

  const rateCheck = (socket, event) => {
    if (!checkSocketRate(socket.id, event)) {
      socket.emit(SERVER_EVENTS.ERROR, { message: 'Too many requests. Slow down.' });
      return false;
    }
    return true;
  };

  io.on('connection', (socket) => {

    // ── RECONCILIATION: ADD / UPDATE ADJUSTMENT ENTRY ─────────────────────────────
    socket.on('elimination_update_reconciliation_ledger', async ({
      roomId,
      adjustmentType,
      amount,
      currency,
      paymentMethod,
      reasonCode,
      note,
      createdBy,
      prizeAwardId,
      prizeMetadata,
      ts,
    }) => {
      if (!rateCheck(socket, 'elimination_update_reconciliation_ledger')) return;
      try {
        const room = getRoom(roomId);
        if (!room) return socket.emit(SERVER_EVENTS.ERROR, { message: 'Room not found' });

        const isHost  = room.hostSocketId === socket.id;
        const isAdmin = (room.admins ?? []).some((a) => a.socketId === socket.id);
        if (!isHost && !isAdmin) {
          return socket.emit(SERVER_EVENTS.ERROR, { message: 'Unauthorized' });
        }

        if (room.status !== 'ended' || room.reconciliationApproved) {
          return socket.emit(SERVER_EVENTS.ERROR, { message: 'Reconciliation not active' });
        }

        const insertId = await saveAdjustmentEntry({
          roomId,
          clubId:        room.clubId ?? null,
          adjustmentType,
          amount,
          currency:      currency ?? room.currency ?? 'EUR',
          paymentMethod: paymentMethod ?? null,
          reasonCode:    reasonCode ?? null,
          note:          note ?? null,
          createdBy:     createdBy ?? null,
          prizeAwardId:  prizeAwardId ?? null,
          prizeMetadata: prizeMetadata ?? null,
          ts:            ts ?? null,
        });

        socket.emit('elimination_reconciliation_ledger_updated', { ok: true, insertId, roomId });

        console.log(
          `[Elimination] Reconciliation ledger entry added — room: ${roomId} type: ${adjustmentType} amount: ${amount}`
        );
      } catch (err) {
        console.error('[Elimination] elimination_update_reconciliation_ledger error:', err);
        socket.emit(SERVER_EVENTS.ERROR, { message: 'Failed to save adjustment' });
      }
    });

    // ── RECONCILIATION: DELETE ADJUSTMENT ENTRY ───────────────────────────────────
    socket.on('elimination_delete_reconciliation_ledger_item', async ({ roomId, adjustmentId }) => {
      if (!rateCheck(socket, 'elimination_delete_reconciliation_ledger_item')) return;
      try {
        const room = getRoom(roomId);
        if (!room) return socket.emit(SERVER_EVENTS.ERROR, { message: 'Room not found' });

        const isHost  = room.hostSocketId === socket.id;
        const isAdmin = (room.admins ?? []).some((a) => a.socketId === socket.id);
        if (!isHost && !isAdmin) {
          return socket.emit(SERVER_EVENTS.ERROR, { message: 'Unauthorized' });
        }

        if (room.reconciliationApproved) {
          return socket.emit(SERVER_EVENTS.ERROR, { message: 'Reconciliation already approved — cannot edit' });
        }

        const result = await deleteAdjustmentEntry(adjustmentId, roomId);
        socket.emit('elimination_reconciliation_ledger_updated', { ok: result.ok, deleted: adjustmentId, roomId });

        console.log(`[Elimination] Reconciliation ledger entry deleted — room: ${roomId} id: ${adjustmentId}`);
      } catch (err) {
        console.error('[Elimination] elimination_delete_reconciliation_ledger_item error:', err);
        socket.emit(SERVER_EVENTS.ERROR, { message: 'Failed to delete adjustment' });
      }
    });

    // ── RECONCILIATION: APPROVE ───────────────────────────────────────────────────
    socket.on('elimination_approve_reconciliation', async ({ roomId, approvedBy, notes }) => {
      if (!rateCheck(socket, 'elimination_approve_reconciliation')) return;
      try {
        const room = getRoom(roomId);
        if (!room) return socket.emit(SERVER_EVENTS.ERROR, { message: 'Room not found' });

        const isHost = room.hostSocketId === socket.id;
        if (!isHost) {
          return socket.emit(SERVER_EVENTS.ERROR, { message: 'Only the host can approve reconciliation' });
        }

        if (room.reconciliationApproved) {
          return socket.emit('elimination_reconciliation_approved', { ok: true, roomId, alreadyApproved: true });
        }

        if (!room.clubId) {
          markReconciliationApproved(roomId);
          return socket.emit('elimination_reconciliation_approved', { ok: true, roomId, noRecord: true });
        }

        const result = await approveEliminationReconciliation(
          roomId,
          approvedBy ?? 'Host',
          notes ?? null
        );

        markReconciliationApproved(roomId);

        socket.emit('elimination_reconciliation_approved', {
          ok:              true,
          roomId,
          adjustmentsNet:  result.adjustmentsNet,
          finalTotal:      result.finalTotal,
        });

        console.log(`[Elimination] ✅ Reconciliation approved via socket — room: ${roomId} by: ${approvedBy}`);
      } catch (err) {
        console.error('[Elimination] elimination_approve_reconciliation error:', err);
        socket.emit(SERVER_EVENTS.ERROR, { message: err.message || 'Failed to approve reconciliation' });
      }
    });

    // ── RECONCILIATION: FETCH STATE ───────────────────────────────────────────────
    socket.on('elimination_get_reconciliation', async ({ roomId }) => {
      try {
        const room = getRoom(roomId);
        if (!room) return socket.emit(SERVER_EVENTS.ERROR, { message: 'Room not found' });

        const isHost  = room.hostSocketId === socket.id;
        const isAdmin = (room.admins ?? []).some((a) => a.socketId === socket.id);
        if (!isHost && !isAdmin) {
          return socket.emit(SERVER_EVENTS.ERROR, { message: 'Unauthorized' });
        }

        const { getEliminationReconciliation } = await import('../services/eliminationStatsService.js');
        const data = await getEliminationReconciliation(roomId);

        socket.emit('elimination_reconciliation_state', { ok: true, roomId, ...data });
      } catch (err) {
        console.error('[Elimination] elimination_get_reconciliation error:', err);
        socket.emit(SERVER_EVENTS.ERROR, { message: 'Failed to fetch reconciliation' });
      }
    });

    // ── HOST JOIN ──────────────────────────────────────────────────────────────
    socket.on('host_join_elimination_room', ({ roomId, hostId }) => {
      if (!rateCheck(socket, 'host_join_elimination_room')) return;
      try {
        console.log('🎮 [Elimination] host_join_elimination_room:', { roomId, hostId });
        const room = getRoom(roomId);
        if (!room) return socket.emit(SERVER_EVENTS.ERROR, { message: 'Room not found' });
        if (room.hostId !== hostId) return socket.emit(SERVER_EVENTS.ERROR, { message: 'Invalid host credentials' });

        room.hostSocketId = socket.id;
        socket.join(roomId);
        console.log('🎮 [Elimination] Host joined socket room:', { roomId, hostId, socketId: socket.id });

        socket.emit(SERVER_EVENTS.ROOM_STATE, getRoomSnapshot(roomId));
        socket.emit(SERVER_EVENTS.WAITING_ROOM_UPDATE, { players: getAllPlayers(roomId) });
      } catch (err) {
        socket.emit(SERVER_EVENTS.ERROR, { message: err.message });
      }
    });

    // ── ADMIN JOIN ────────────────────────────────────────────────────────────────
    socket.on('admin_join_elimination_room', ({ roomId, adminId, name }) => {
      try {
        const room = getRoom(roomId);
        if (!room) return socket.emit(SERVER_EVENTS.ERROR, { message: 'Room not found' });

        if (!room.admins) room.admins = [];

        const existing = room.admins.find(a => a.id === adminId);
        if (existing) {
          existing.socketId = socket.id;
          existing.connected = true;
        } else {
          return socket.emit(SERVER_EVENTS.ERROR, { message: 'Admin not found. Ask the host to re-invite you.' });
        }

        socket.join(roomId);

        console.log(`[Elimination] Admin joined: ${name} (${adminId}) room: ${roomId}`);

        socket.emit(SERVER_EVENTS.ROOM_STATE, getRoomSnapshot(roomId));
        socket.emit(SERVER_EVENTS.WAITING_ROOM_UPDATE, { players: getAllPlayers(roomId) });

        io.to(roomId).emit('elimination_admin_list_updated', { admins: room.admins });
      } catch (err) {
        socket.emit(SERVER_EVENTS.ERROR, { message: err.message });
      }
    });

    // ── ADD ADMIN (host action) ───────────────────────────────────────────────────
    socket.on('add_elimination_admin', ({ roomId, admin }) => {
      try {
        const room = getRoom(roomId);
        if (!room) return;

        if (!room.admins) room.admins = [];

        if (!room.admins.find(a => a.id === admin.id)) {
          room.admins.push({
            id:        admin.id,
            name:      admin.name,
            joinedAt:  admin.joinedAt ?? new Date().toISOString(),
            socketId:  null,
            connected: false,
          });
        }

        console.log(`[Elimination] Admin added: ${admin.name} (${admin.id}) room: ${roomId}`);

        io.to(roomId).emit('elimination_admin_list_updated', { admins: room.admins });
      } catch (err) {
        console.error('[Elimination] add_elimination_admin error:', err);
      }
    });

    // ── REMOVE ADMIN (host action) ────────────────────────────────────────────────
    socket.on('remove_elimination_admin', ({ roomId, adminId }) => {
      try {
        const room = getRoom(roomId);
        if (!room || !room.admins) return;

        room.admins = room.admins.filter(a => a.id !== adminId);

        io.to(roomId).emit('elimination_admin_list_updated', { admins: room.admins });
      } catch (err) {
        console.error('[Elimination] remove_elimination_admin error:', err);
      }
    });

    // ── REQUEST ADMIN LIST (host dashboard on mount) ──────────────────────────────
    socket.on('request_elimination_admin_list', ({ roomId }) => {
      try {
        const room = getRoom(roomId);
        if (!room) return;
        socket.emit('elimination_admin_list_updated', { admins: room.admins ?? [] });
      } catch (err) {
        console.error('[Elimination] request_elimination_admin_list error:', err);
      }
    });

    // ── HOST CANCEL ROOM ───────────────────────────────────────────────────────
    socket.on('host_cancel_elimination_room', ({ roomId, hostId }) => {
      if (!rateCheck(socket, 'host_cancel_elimination_room')) return;
      try {
        const room = getRoom(roomId);
        if (!room) return socket.emit(SERVER_EVENTS.ERROR, { message: 'Room not found' });
        if (room.hostId !== hostId) return socket.emit(SERVER_EVENTS.ERROR, { message: 'Unauthorized' });

        io.to(roomId).emit('elimination_room_cancelled', {
          roomId,
          reason: 'host_cancelled',
          cancelTxHash: room.cancelTxHash ?? null,
          refundTxHash: room.refundTxHash ?? null,
        });

        console.log(`[Elimination] Notified players of cancellation for room ${roomId}`);
      } catch (err) {
        socket.emit(SERVER_EVENTS.ERROR, { message: err.message });
      }
    });

    // ── VALIDATE TICKET TOKEN ──────────────────────────────────────────────────
    socket.on('validate_ticket_token', async ({ joinToken }, callback) => {
      try {
        if (typeof callback !== 'function') return;
        if (!joinToken) return callback({ ok: false, error: 'No ticket token provided' });

        const { getTicketByToken } =
          await import('../../mgtsystem/services/quizTicketService.js');

        const ticket = await getTicketByToken(joinToken);

        if (!ticket)
          return callback({ ok: false, error: 'Invalid ticket token' });
        if (ticket.redemption_status === 'redeemed')
          return callback({ ok: false, error: 'Ticket has already been used' });
        if (ticket.redemption_status === 'blocked')
          return callback({ ok: false, error: 'Ticket payment not yet confirmed by host' });
        if (ticket.redemption_status !== 'ready')
          return callback({ ok: false, error: 'Ticket is not ready for redemption' });
        if (ticket.payment_status !== 'payment_confirmed')
          return callback({ ok: false, error: 'Ticket payment is not confirmed' });

        return callback({
          ok: true,
          ticket: {
            ticketId:            ticket.ticket_id,
            roomId:              ticket.room_id,
            playerName:          ticket.player_name,
            entryFee:            parseFloat(ticket.entry_fee),
            currency:            ticket.currency,
            paymentMethod:       ticket.payment_method,
            paymentReference:    ticket.payment_reference,
            clubPaymentMethodId: ticket.club_payment_method_id,
          },
        });
      } catch (err) {
        console.error('[Elimination] validate_ticket_token error:', err.message);
        if (typeof callback === 'function')
          callback({ ok: false, error: 'Failed to validate ticket' });
      }
    });

    // ── PLAYER JOIN ROOM ───────────────────────────────────────────────────────
    socket.on(CLIENT_EVENTS.JOIN_ROOM, async ({
      roomId,
      playerId,
      name,
      // ── web3 ──
      txSignature,
      isWeb3,
      walletAddress: clientWalletAddress,
      // ── web2 payment fields ──
      paid              = false,
      paymentClaimed    = false,
      payAtDoor         = false,
      paymentMethod     = null,
      paymentReference  = null,
      clubPaymentMethodId = null,
      joinToken         = null,
    }) => {
      if (!rateCheck(socket, 'join_elimination_room')) return;
      try {
        const name_safe = sanitiseName(name);
        console.log('🎮 [Elimination] join_elimination_room:', {
          roomId,
          playerId,
          name: name_safe,
          isWeb3: !!txSignature,
          paymentMethod,
          paid,
          paymentClaimed,
          payAtDoor,
        });

        // ── Reconnect flow ────────────────────────────────────────────────────
        if (playerId) {
          const result = reconnectPlayer(roomId, playerId, socket.id);
          if (!result.success) {
            return socket.emit(SERVER_EVENTS.ERROR, { message: result.error });
          }
          socket.join(roomId);
          socket.emit(SERVER_EVENTS.ROOM_STATE, {
            ...result.snapshot,
            yourPlayerId: playerId,
          });
          emitToRoom(roomId, SERVER_EVENTS.WAITING_ROOM_UPDATE, { players: getAllPlayers(roomId) });
          return;
        }

        // ── Validate room ─────────────────────────────────────────────────────
        const { valid, error } = validateJoin(roomId);
        if (!valid) return socket.emit(SERVER_EVENTS.ERROR, { message: error });

        const room = getRoom(roomId);

        // ── Web3 payment verification ─────────────────────────────────────────
        let verifiedWalletAddress = null;

        if (room?.paymentMode === 'web3') {
          if (!txSignature || typeof txSignature !== 'string') {
            return socket.emit(SERVER_EVENTS.ERROR, {
              message: 'Payment required to join this room.',
            });
          }

          if (txSignature === 'already-joined') {
            console.log(`[Elimination] already-joined bypass for room ${roomId}`);
          } else {
            const { valid: txValid, error: txError, walletAddress } = await verifyWeb3JoinTx(txSignature, room);
            if (!txValid) {
              return socket.emit(SERVER_EVENTS.ERROR, { message: txError });
            }
            verifiedWalletAddress = walletAddress;
            console.log(`[Elimination] Web3 payment verified for room ${roomId} wallet: ${walletAddress}`);
          }
        }

        // ── Web2 payment validation ───────────────────────────────────────────
        if (room?.paymentMode === 'web2' && room.entryFee) {
          const hasPaymentContext = paid || paymentClaimed || payAtDoor || paymentMethod;
          if (!hasPaymentContext) {
            return socket.emit(SERVER_EVENTS.ERROR, {
              message: 'Payment information required to join this room.',
            });
          }
        }

        // ── Make name unique ──────────────────────────────────────────────────
        let uniqueName = name_safe || 'Player';
        if (room) {
          const existingNames = Object.values(room.players).map(p => p.name.toLowerCase());
          if (existingNames.includes(uniqueName.toLowerCase())) {
            let suffix = 2;
            while (existingNames.includes(`${uniqueName.toLowerCase()} ${suffix}`)) suffix++;
            uniqueName = `${uniqueName} ${suffix}`;
          }
        }

        // ── Ticket-aware capacity check ───────────────────────────────────────────
// addPlayer enforces the in-memory cap but unredeemed tickets also reserve
// capacity. getRoomCapacityStatus counts both and handles the double-count
// case where a ticket holder has already joined (redeemed tickets are
// subtracted from the walk-in count so they're never counted twice).
if (room.paymentMode === 'web2' && room.clubId) {
  try {
    const { getRoomCapacityStatus } = await import('../../mgtsystem/services/quizCapacityService.js');
    const currentCount = Object.keys(room.players).length;
    const capacity = await getRoomCapacityStatus(roomId, currentCount);

  if (capacity.isFull && !joinToken) {
  return socket.emit(SERVER_EVENTS.ERROR, {
    message: 'Sorry, this game is full — no spots remaining.',
  });
}

    // Player has a ticket — they have reserved capacity, always let them through
    if (!joinToken && capacity.availableForWalkIns < 1) {
      return socket.emit(SERVER_EVENTS.ERROR, {
        message: 'Sorry, this game is full — all remaining spots are reserved for ticket holders.',
      });
    }
  } catch (capErr) {
    console.error('[Elimination] Capacity check failed (non-fatal):', capErr.message);
    // Fall through to addPlayer which still enforces the in-memory cap
  }
}

        // ── Add player ────────────────────────────────────────────────────────
        const { player } = addPlayer(roomId, {
          name:               uniqueName,
          socketId:           socket.id,
          txSignature:        txSignature ?? null,
          walletAddress:      verifiedWalletAddress ?? clientWalletAddress ?? null,
          paid:               !!paid,
          paymentClaimed:     !!paymentClaimed,
          payAtDoor:          !!payAtDoor,
          paymentMethod:      paymentMethod ?? null,
          paymentReference:   paymentReference ?? null,
          clubPaymentMethodId: clubPaymentMethodId ?? null,
        });

        socket.join(roomId);

        socket.emit(SERVER_EVENTS.ROOM_STATE, {
          ...getRoomSnapshot(roomId),
          yourPlayerId: player.playerId,
          yourName:     player.name,
        });

        emitToRoom(roomId, SERVER_EVENTS.WAITING_ROOM_UPDATE, { players: getAllPlayers(roomId) });

        writeLedgerEntry(room, player).catch((err) =>
          console.error('[Elimination] writeLedgerEntry unhandled error:', err.message)
        );

        if (joinToken) {
          import('../../mgtsystem/services/quizTicketService.js')
            .then(({ redeemTicket }) =>
              redeemTicket({ joinToken, playerId: player.playerId })
            )
            .then(() =>
              console.log(`[Elimination] Ticket redeemed for player: ${player.playerId}`)
            )
            .catch((err) =>
              console.error('[Elimination] Ticket redemption failed (non-fatal):', err.message)
            );
        }

      } catch (err) {
        console.error('[Elimination] JOIN_ROOM error:', err);
        socket.emit(SERVER_EVENTS.ERROR, { message: err.message });
      }
    });

    // ── START GAME ─────────────────────────────────────────────────────────────
    // STATUS TRANSITION: open → live
    // markEliminationRoomAsLive writes to DB once the game loop starts cleanly.
    // It is non-fatal — a DB failure here must never prevent the game from running.
    socket.on(CLIENT_EVENTS.START_GAME, ({ roomId, hostId }) => {
      if (!rateCheck(socket, 'start_elimination_game')) return;
      try {
        const { valid, error } = validateStart(roomId, hostId);
        if (!valid) return socket.emit(SERVER_EVENTS.ERROR, { message: error });

        startGame(roomId, (event, payload) => emitToRoom(roomId, event, payload))
          .then(() => {
            // Game loop started cleanly — write 'live' to DB
            markEliminationRoomAsLive(roomId).catch((err) =>
              console.warn('[Elimination] Failed to mark room live (non-fatal):', err.message)
            );
          })
          .catch((err) => {
            console.error(`[Elimination] Game loop error in room ${roomId}:`, err);
            emitToRoom(roomId, SERVER_EVENTS.ERROR, { message: 'Game encountered an error.' });
          });

      } catch (err) {
        socket.emit(SERVER_EVENTS.ERROR, { message: err.message });
      }
    });

    // ── SUBMIT ANSWER ──────────────────────────────────────────────────────────
    socket.on(CLIENT_EVENTS.SUBMIT_ANSWER, ({ roomId, playerId, submission }) => {
      if (!rateCheck(socket, 'submit_round_answer')) return;
      try {
        const payloadSize = JSON.stringify(submission || {}).length;
        const sizeLimit = submission?.roundType === 'path_trace' ? 16384 : 1024;
        if (payloadSize > sizeLimit) {
          return socket.emit(SERVER_EVENTS.ERROR, { message: 'Submission too large.' });
        }
      } catch {}
      try {
        const { valid, error, activeRound } = validateRoundSubmission(roomId, playerId, submission);
        if (!valid) return socket.emit(SERVER_EVENTS.ERROR, { message: error });

        recordSubmission(roomId, activeRound.roundId, playerId, submission);
        socket.emit(SERVER_EVENTS.SUBMISSION_RECEIVED, { roundId: activeRound.roundId, playerId });
      } catch (err) {
        socket.emit(SERVER_EVENTS.ERROR, { message: err.message });
      }
    });

    // ── TIME ESTIMATION: START PRESS ───────────────────────────────────────────
    socket.on(CLIENT_EVENTS.SUBMIT_START_PRESS, ({ roomId, playerId, roundId }) => {
      if (!rateCheck(socket, 'submit_time_estimation_start')) return;
      try {
        recordStartPress(roomId, roundId, playerId);
      } catch (err) {
        console.warn('[Elimination] SUBMIT_START_PRESS error:', err.message);
      }
    });

    // ── RECONNECT (explicit) ───────────────────────────────────────────────────
    socket.on(CLIENT_EVENTS.RECONNECT_PLAYER, ({ roomId, playerId }) => {
      if (!rateCheck(socket, 'reconnect_elimination_player')) return;
      try {
        const result = reconnectPlayer(roomId, playerId, socket.id);
        if (!result.success) return socket.emit(SERVER_EVENTS.ERROR, { message: result.error });
        socket.join(roomId);
        socket.emit(SERVER_EVENTS.ROOM_STATE, result.snapshot);
      } catch (err) {
        socket.emit(SERVER_EVENTS.ERROR, { message: err.message });
      }
    });

    // ── LEAVE ROOM ─────────────────────────────────────────────────────────────
    socket.on(CLIENT_EVENTS.LEAVE_ROOM, ({ roomId, playerId }) => {
      socket.leave(roomId);
      handleDisconnect(roomId, playerId);
    });

    // ── UPDATE PLAYER (host edits payment method, name etc.) ─────────────────────
    socket.on('update_player', ({ roomId, player }) => {
      try {
        const room = getRoom(roomId);
        if (!room) return;

        const existing = room.players[player.id ?? player.playerId];
        if (existing) {
          if (player.name)              existing.name              = player.name;
          if (player.paymentMethod)     existing.paymentMethod     = player.paymentMethod;
          if (player.paymentReference !== undefined) existing.paymentReference = player.paymentReference;
          if (player.clubPaymentMethodId !== undefined) existing.clubPaymentMethodId = player.clubPaymentMethodId;
          if (player.paid !== undefined) existing.paid             = player.paid;
          if (player.paymentClaimed !== undefined) existing.paymentClaimed = player.paymentClaimed;
        }

        io.to(roomId).emit(SERVER_EVENTS.WAITING_ROOM_UPDATE, { players: getAllPlayers(roomId) });
      } catch (err) {
        console.error('[Elimination] update_player error:', err);
      }
    });

    // ── ELIMINATE PLAYER (host / admin action) ────────────────────────────────
    socket.on('eliminate_player', ({ roomId, playerId }) => {
      try {
        const room = getRoom(roomId);
        if (!room) return;
 
        const isHost  = room.hostSocketId === socket.id;
        const isAdmin = (room.admins ?? []).some(a => a.socketId === socket.id);
        if (!isHost && !isAdmin) return;
 
        const player = room.players[playerId];
        if (player) player.eliminated = true;
 
        io.to(roomId).emit(SERVER_EVENTS.WAITING_ROOM_UPDATE, { players: getAllPlayers(roomId) });
        console.log(`[Elimination] Player eliminated: ${playerId} in room ${roomId}`);
      } catch (err) {
        console.error('[Elimination] eliminate_player error:', err);
      }
    });
 
    // ── RESTORE PLAYER (host / admin action) ──────────────────────────────────
    socket.on('restore_player', ({ roomId, playerId }) => {
      try {
        const room = getRoom(roomId);
        if (!room) return;
 
        const isHost  = room.hostSocketId === socket.id;
        const isAdmin = (room.admins ?? []).some(a => a.socketId === socket.id);
        if (!isHost && !isAdmin) return;
 
        const player = room.players[playerId];
        if (player) player.eliminated = false;
 
        io.to(roomId).emit(SERVER_EVENTS.WAITING_ROOM_UPDATE, { players: getAllPlayers(roomId) });
        console.log(`[Elimination] Player restored: ${playerId} in room ${roomId}`);
      } catch (err) {
        console.error('[Elimination] restore_player error:', err);
      }
    });
 
    // ── HOST ADD PLAYER ───────────────────────────────────────────────────────
    // Emitted by EliminationHostDashboard when the host manually adds a player.
    // Goes through addPlayer() which enforces the maxPlayers cap.
    socket.on('host_add_player', async ({ roomId, hostId: emittedHostId, player: playerData }) => {
      try {
        const room = getRoom(roomId);
        if (!room) {
          return socket.emit('host_add_player_error', { message: 'Room not found.' });
        }
        if (room.hostId !== emittedHostId) {
          return socket.emit('host_add_player_error', { message: 'Not authorised.' });
        }
 
        // addPlayer enforces the maxPlayers cap — throws if full
        const { player } = addPlayer(roomId, {
          name:               sanitiseName(playerData.name),
          socketId:           null,   // host-added players have no socket of their own
          paid:               playerData.paid ?? false,
          paymentMethod:      playerData.paymentMethod ?? 'pay_admin',
          paymentReference:   playerData.paymentReference ?? null,
          payAtDoor:          playerData.payAtDoor ?? true,
          entryFee:           playerData.entryFee ?? room.entryFee ?? 0,
          clubPaymentMethodId: playerData.clubPaymentMethodId ?? null,
          addedByHost:        true,
        });
 
        // Write ledger entry for the new player (same as organic joins)
        writeLedgerEntry(room, player).catch((err) =>
          console.error('[Elimination] writeLedgerEntry (host_add_player) error:', err.message)
        );
 
        // Confirm back to the host with the real server-assigned player object
        socket.emit('host_add_player_confirmed', { player });
 
        // Broadcast updated player list to everyone in the room
        io.to(roomId).emit(SERVER_EVENTS.WAITING_ROOM_UPDATE, { players: getAllPlayers(roomId) });
 
        console.log(`[Elimination] Host added player "${player.name}" to room ${roomId}`);
      } catch (err) {
        console.error(`[Elimination] host_add_player error in room ${roomId}:`, err.message);
        socket.emit('host_add_player_error', { message: err.message });
      }
    });

    socket.on('confirm_player_payment', async (payload) => {
      const { roomId, playerId, confirmedBy, adminNotes, paymentMethod, clubPaymentMethodId } = payload;

      const normalisedMethod = paymentMethod ? normalizePaymentMethod(paymentMethod) : null;

      const room = getRoom(roomId);
      if (!room) return;

      const isAdmin = room.admins?.some(a => a.id === confirmedBy?.id);
      const confirmerRole = isAdmin ? 'admin' : (confirmedBy?.role ?? 'host');
      const confirmerName = isAdmin
        ? (room.admins.find(a => a.id === confirmedBy?.id)?.name ?? 'Admin')
        : (confirmedBy?.name ?? 'Host');

      const player = room.players[playerId];
      if (player) {
        player.paid = true;
        player.paymentClaimed = false;
        player.confirmedAt = new Date().toISOString();
        if (normalisedMethod) player.paymentMethod = normalisedMethod;
        if (clubPaymentMethodId) player.clubPaymentMethodId = clubPaymentMethodId;
      }

      try {
        await confirmPayment({
          roomId,
          playerId,
          confirmedBy:        confirmedBy?.id ?? 'host',
          confirmedByName:    confirmerName,
          confirmedByRole:    confirmerRole,
          adminNotes:         adminNotes ?? null,
          paymentMethod:      normalisedMethod,
          clubPaymentMethodId: clubPaymentMethodId ?? null,
          paymentSource:      'admin_assigned',
        });
      } catch (err) {
        console.error('[Elimination] confirmPayment DB error:', err);
      }

      io.to(roomId).emit(SERVER_EVENTS.WAITING_ROOM_UPDATE, { players: getAllPlayers(roomId) });
      io.to(roomId).emit('payment_confirmed', { playerId, paid: true });

      if (room.pendingReconciliation && !room.reconciliationApproved) {
        refreshReconciliationStartingTotal(roomId).catch((err) =>
          console.warn('[Elimination] refreshReconciliationStartingTotal error (non-fatal):', err.message)
        );
      }
    });

    // ── DISCONNECT ─────────────────────────────────────────────────────────────
    socket.on('disconnect', () => {
      cleanupSocket(socket.id);
      const found = findPlayerBySocket(socket.id);
      if (!found) return;
      const { room, player } = found;
      handleDisconnect(room.roomId, player.playerId);

      if (room.status === ROOM_STATUS.WAITING) {
        emitToRoom(room.roomId, SERVER_EVENTS.WAITING_ROOM_UPDATE, {
          players: getAllPlayers(room.roomId),
        });
      }
    });
  });
};