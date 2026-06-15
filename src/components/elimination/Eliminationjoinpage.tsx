// src/components/Elimination/EliminationJoinPage.tsx
//
// Entry point for players joining an elimination room.
//
// Routing logic:
//   ?ticket=<joinToken>    → redeem ticket → skip payment → socket join
//   web3 room              → existing Web3JoinSection (unchanged)
//   web2 room, entry fee   → EliminationJoinFlow (multi-step payment flow)
//   web2 room, free / null → direct socket join (original behaviour)
//   no room code           → manual code entry → re-fetch → route above

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { emitJoinRoom, getSocket } from './services/eliminationSocket';
import { getRoom } from './services/eliminationApi';
import { Web3Provider } from '../Web3Provider';
import { Web3JoinSection } from './Web3JoinSection';
import { EliminationJoinFlow } from './join/EliminationJoinFlow';
import type { EliminationRoom } from './types/elimination';

const SESSION_ROOM_ID     = 'elim_room_id';
const SESSION_PLAYER_ID   = 'elim_player_id';
const SESSION_PLAYER_NAME = 'elim_player_name';
const SESSION_IS_HOST     = 'elim_is_host';

// ── Main join page ─────────────────────────────────────────────────────────────
const EliminationJoinInner: React.FC = () => {
  const { roomId: roomIdFromUrl } = useParams<{ roomId?: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // Ticket token from ?ticket= query param
  const ticketToken = searchParams.get('ticket');

  // Clear stale session on mount
  useState(() => {
    ['elim_room_id', 'elim_player_id', 'elim_host_id', 'elim_player_name', 'elim_is_host']
      .forEach(k => sessionStorage.removeItem(k));
  });

  const [name, setName]             = useState('');
  const [roomCode, setRoomCode]     = useState(roomIdFromUrl ?? '');
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState('');

  // Room detection
  const [roomData, setRoomData]             = useState<any>(null);
  const [roomLoading, setRoomLoading]       = useState(false);
  const [isWeb3Room, setIsWeb3Room]         = useState(false);
  const [isWeb2FeeRoom, setIsWeb2FeeRoom]   = useState(false);
  const [web3PaymentDone, setWeb3PaymentDone] = useState(false);
  const [roomFull, setRoomFull] = useState(false);

  // Ticket redemption state
  const [ticketLoading, setTicketLoading]   = useState(!!ticketToken);
  const [ticketError, setTicketError]       = useState('');

  const nameRef = useRef(name);
  useEffect(() => { nameRef.current = name; }, [name]);

  const resolvedRoomId = (roomIdFromUrl || roomCode || '').trim();

  // ── Ticket redemption ──────────────────────────────────────────────────────
  // If ?ticket= is present, redeem immediately and join via socket.
  // Bypasses the payment flow entirely — the ticket already paid.
// ── Ticket redemption ──────────────────────────────────────────────────────
useEffect(() => {
  if (!ticketToken || !resolvedRoomId) return;

  // Guard against double-fire (StrictMode, dep changes, etc.)
  let cancelled = false;

  const socket = getSocket();

  socket.emit('validate_ticket_token', { joinToken: ticketToken }, (response: any) => {
    if (cancelled) return; // <-- ignore if effect was cleaned up

    if (!response?.ok) {
      setTicketError(response?.error || 'Ticket could not be validated');
      setTicketLoading(false);
      return;
    }

    const t = response.ticket;

    sessionStorage.setItem(SESSION_PLAYER_NAME, t.playerName);
    sessionStorage.setItem(SESSION_IS_HOST, 'false');

    emitJoinRoom(
      resolvedRoomId,
      t.playerName,
      undefined,
      undefined,
      undefined,
      {
        paid:                true,
        paymentMethod:       t.paymentMethod,
        paymentReference:    t.paymentReference,
        clubPaymentMethodId: t.clubPaymentMethodId,
        joinToken:           ticketToken,
      }
    );
  });

  return () => { cancelled = true; }; // cleanup if effect re-runs

  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [ticketToken]); // <-- only ticketToken, not resolvedRoomId

  // ── Fetch room when roomId is in URL ────────────────────────────────────────
  // Skip room fetch if we have a ticket — we don't need room data for that path
  useEffect(() => {
    const code = roomIdFromUrl ?? '';
    if (!code || ticketToken) return;
    setRoomLoading(true);
    getRoom(code)
   .then(async({ room }) => {
  setRoomData(room);
  const isWeb3 = (room as any).paymentMode === 'web3';
  const fee    = Number((room as any).entryFee ?? 0);
  setIsWeb3Room(isWeb3);
  setIsWeb2FeeRoom(!isWeb3 && fee > 0);

  // Check capacity — block join page before any payment flow starts
if (!isWeb3) {
  try {
    const inMemoryCount = ((room as any).players ?? []).length;
    const maxPlayers = (room as any).maxPlayers ?? 999;

    // Check in-memory players (on-the-night joins not in tickets table)
    if (inMemoryCount >= maxPlayers) {
      setRoomFull(true);
    } else {
      // Also check pre-sold tickets
      const res = await fetch(`/api/quiz/tickets/room/${(room as any).roomId}/info`);
      if (res.ok) {
        const data = await res.json();
        const cap = data.capacity;
        if (cap && cap.totalTickets + inMemoryCount >= cap.maxCapacity) {
          setRoomFull(true);
        }
      }
    }
  } catch {
    // Non-fatal — socket enforces the cap
  }
}
})
      .catch(() => { /* Room not found — player may be on manual entry flow */ })
      .finally(() => setRoomLoading(false));
  }, [roomIdFromUrl, ticketToken]);

  // ── Fetch room when manually entered room code changes ──────────────────────
  useEffect(() => {
    if (roomIdFromUrl || ticketToken) return;
    if (!roomCode || roomCode.length < 6) return;
    const timer = setTimeout(() => {
      getRoom(roomCode)
    .then(async ({ room }) => {
  setRoomData(room);
  const isWeb3 = (room as any).paymentMode === 'web3';
  const fee    = Number((room as any).entryFee ?? 0);
  setIsWeb3Room(isWeb3);
  setIsWeb2FeeRoom(!isWeb3 && fee > 0);

if (!isWeb3) {
  try {
    const inMemoryCount = ((room as any).players ?? []).length;
    const maxPlayers = (room as any).maxPlayers ?? 999;

    // Check in-memory players (on-the-night joins not in tickets table)
    if (inMemoryCount >= maxPlayers) {
      setRoomFull(true);
    } else {
      // Also check pre-sold tickets
      const res = await fetch(`/api/quiz/tickets/room/${(room as any).roomId}/info`);
      if (res.ok) {
        const data = await res.json();
        const cap = data.capacity;
        if (cap && cap.totalTickets + inMemoryCount >= cap.maxCapacity) {
          setRoomFull(true);
        }
      }
    }
  } catch {
    // Non-fatal — socket enforces the cap
  }
}
})
        .catch(() => {
          setIsWeb3Room(false);
          setIsWeb2FeeRoom(false);
          setRoomData(null);
        });
    }, 500);
    return () => clearTimeout(timer);
  }, [roomCode, roomIdFromUrl, ticketToken]);

  // ── Socket listeners ────────────────────────────────────────────────────────
  useEffect(() => {
    const socket = getSocket();

    const handleRoomState = (data: any) => {
      const room: EliminationRoom = data.roomSnapshot ?? data;
      const assignedPlayerId: string | undefined = data.yourPlayerId;
      const assignedName: string | undefined     = data.yourName;

      if (!assignedPlayerId) {
        const me = room.players.find(
          p => p.name.toLowerCase() === nameRef.current.toLowerCase().trim()
        );
        if (!me) {
          setLoading(false);
          setTicketLoading(false);
          setError('Could not join room. Please try again.');
          return;
        }
        sessionStorage.setItem(SESSION_ROOM_ID,     room.roomId);
        sessionStorage.setItem(SESSION_PLAYER_ID,   me.playerId);
        sessionStorage.setItem(SESSION_PLAYER_NAME, me.name);
        sessionStorage.setItem(SESSION_IS_HOST,     'false');
        navigate('/elimination', { replace: true });
        return;
      }

      sessionStorage.setItem(SESSION_ROOM_ID,     room.roomId);
      sessionStorage.setItem(SESSION_PLAYER_ID,   assignedPlayerId);
      sessionStorage.setItem(SESSION_PLAYER_NAME, assignedName ?? nameRef.current);
      sessionStorage.setItem(SESSION_IS_HOST,     'false');
      navigate('/elimination', { replace: true });
    };

    const handleError = (data: { message: string }) => {
      setError(data.message);
      setLoading(false);
      setTicketLoading(false);
      setTicketError(data.message);
    };

    socket.on('elimination_room_state', handleRoomState);
    socket.on('elimination_error', handleError);
    return () => {
      socket.off('elimination_room_state', handleRoomState);
      socket.off('elimination_error', handleError);
    };
  }, [navigate]);

  // ── Web3 payment confirmed ──────────────────────────────────────────────────
  const handleWeb3PaymentDone = (txHash: string, walletAddress: string) => {
    const isValidSig = txHash === 'already-joined' ||
      (typeof txHash === 'string' && txHash.length >= 80 && txHash.length <= 100);

    if (!isValidSig) {
      console.error('[Web3Join] Invalid txHash received:', txHash);
      setError('Payment signature invalid — please try again.');
      return;
    }

    setWeb3PaymentDone(true);
    setLoading(true);
    const roomId = (roomIdFromUrl || roomCode || '').trim();
    emitJoinRoom(roomId, nameRef.current, undefined, txHash, walletAddress);
  };

  // ── Free room / web2 no-fee direct join ─────────────────────────────────────
  const handleFreeJoin = () => {
    const trimmedName = name.trim();
    const trimmedCode = (roomCode || roomIdFromUrl || '').trim();
    if (!trimmedName) return setError('Enter your name');
    if (!trimmedCode) return setError('Enter a room code');
    setError('');
    setLoading(true);
    emitJoinRoom(trimmedCode, trimmedName);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isWeb3Room && !isWeb2FeeRoom) handleFreeJoin();
  };

  // ── Ticket: loading screen ──────────────────────────────────────────────────
  if (ticketToken && ticketLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6" style={styles.page}>
        <div style={styles.eyebrow}>FundRaisely</div>
        <h1 style={styles.title}>JOINING...</h1>
        <p style={{ ...styles.subtitle, marginTop: '12px' }}>
          Redeeming your ticket, please wait…
        </p>
        <div style={styles.spinner} />
      </div>
    );
  }

  // ── Ticket: error screen ────────────────────────────────────────────────────
  if (ticketToken && ticketError) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6" style={styles.page}>
        <div style={styles.eyebrow}>FundRaisely</div>
        <h1 style={styles.title}>TICKET ERROR</h1>
        <p style={{ ...styles.error, marginTop: '16px', fontSize: '14px', fontFamily: "'Inter', system-ui, sans-serif" }}>
          {ticketError}
        </p>
        <button
          onClick={() => navigate('/')}
          style={{ ...styles.joinBtn, marginTop: '24px', width: 'auto', padding: '12px 28px' }}
        >
          Go Back
        </button>
        <div style={styles.ring1} />
        <div style={styles.ring2} />
      </div>
    );
  }

  // ── Room full — show before any payment flow ──────────────────────────────────
if (roomFull) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6" style={styles.page}>
      <div style={styles.eyebrow}>FundRaisely</div>
      <h1 style={styles.title}>SOLD OUT</h1>
      <p style={{ ...styles.subtitle, marginTop: '12px', fontSize: '15px' }}>
        This game is full — no spots remaining.
      </p>
      <button
        onClick={() => navigate('/')}
        style={{ ...styles.joinBtn, marginTop: '24px', width: 'auto', padding: '12px 28px' }}
      >
        Go Back
      </button>
      <div style={styles.ring1} />
      <div style={styles.ring2} />
    </div>
  );
}

  // ── Web2 fee room — delegate to EliminationJoinFlow ─────────────────────────
  if (isWeb2FeeRoom && roomData && !roomLoading) {
    return (
      <EliminationJoinFlow
        roomId={resolvedRoomId}
        roomData={roomData}
        onClose={() => navigate('/elimination')}
      />
    );
  }

  // ── Render (web3 / free / manual code entry) ────────────────────────────────
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-6"
      style={styles.page}
    >
      <button onClick={() => navigate('/')} style={styles.back}>
        ← Back
      </button>

      {/* Header */}
      <div className="mb-10 text-center">
        <div style={styles.eyebrow}>FundRaisely</div>
        <h1 style={styles.title}>JOIN GAME</h1>
        <p style={styles.subtitle}>
          {roomLoading
            ? 'Loading room...'
            : isWeb3Room
            ? 'Web3 room — connect wallet to pay entry fee'
            : 'Enter your name and room code to play'}
        </p>
      </div>

      <div className="flex flex-col gap-4 w-full max-w-xs">

        {/* Name — always shown */}
        <div>
          <label style={styles.label}>Your Name</label>
          <input
            placeholder="e.g. Sarah"
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={handleKeyDown}
            maxLength={20}
            autoFocus
            style={styles.input}
          />
        </div>

        {/* Room code — only if not pre-filled from URL */}
        {!roomIdFromUrl && (
          <div>
            <label style={styles.label}>Room Code</label>
            <input
              placeholder="e.g. room_ABC123"
              value={roomCode}
              onChange={e => setRoomCode(e.target.value)}
              onKeyDown={handleKeyDown}
              maxLength={40}
              style={{ ...styles.input, letterSpacing: '0.12em' }}
            />
          </div>
        )}

        {/* Web3 payment section */}
        {isWeb3Room && roomData && !web3PaymentDone && (
          <Web3Provider force={true}>
            <Web3JoinSection
              roomData={roomData}
              name={name}
              onPaymentDone={handleWeb3PaymentDone}
              onError={(msg) => setError(msg)}
            />
          </Web3Provider>
        )}

        {/* Web3 payment confirmed — waiting for socket */}
        {web3PaymentDone && (
          <div style={{ fontSize: '13px', color: 'rgba(0,229,255,0.7)', textAlign: 'center', fontFamily: 'Inter' }}>
            ✓ Payment confirmed — joining room...
          </div>
        )}

        {/* Free room join button */}
        {!isWeb3Room && !isWeb2FeeRoom && !roomLoading && (
          <>
            {error && <p style={styles.error}>{error}</p>}
            <button
              onClick={handleFreeJoin}
              disabled={loading}
              style={{ ...styles.joinBtn, opacity: loading ? 0.5 : 1, cursor: loading ? 'default' : 'pointer' }}
            >
              {loading ? 'Joining…' : 'Join Game'}
            </button>
          </>
        )}

        {isWeb3Room && error && !web3PaymentDone && (
          <p style={styles.error}>{error}</p>
        )}
      </div>

      <div style={styles.ring1} />
      <div style={styles.ring2} />
    </div>
  );
};

// ── Page export ────────────────────────────────────────────────────────────────
export const EliminationJoinPage: React.FC = () => <EliminationJoinInner />;

// ── Styles ─────────────────────────────────────────────────────────────────────
const styles: Record<string, React.CSSProperties> = {
  page: {
    background: '#080c14',
    fontFamily: "'Bebas Neue', 'Impact', sans-serif",
    color: '#ffffff',
    position: 'relative',
    overflow: 'hidden',
  },
  back: {
    position: 'absolute',
    top: '20px',
    left: '20px',
    background: 'none',
    border: 'none',
    color: 'rgba(255,255,255,0.35)',
    cursor: 'pointer',
    fontSize: '13px',
    fontFamily: "'Bebas Neue', 'Impact', sans-serif",
  },
  eyebrow: {
    fontSize: '11px',
    letterSpacing: '0.3em',
    color: 'rgba(0,229,255,0.5)',
    fontFamily: "'Inter', system-ui, sans-serif",
    textTransform: 'uppercase',
    marginBottom: '8px',
  },
  title: {
    fontSize: '48px',
    fontWeight: 800,
    letterSpacing: '-0.02em',
    color: '#ffffff',
    lineHeight: 1,
    margin: '0 0 8px',
  },
  subtitle: {
    fontSize: '13px',
    color: 'rgba(255,255,255,0.35)',
    margin: 0,
    fontFamily: "'Inter', system-ui, sans-serif",
  },
  label: {
    display: 'block',
    fontSize: '10px',
    fontFamily: "'Inter', system-ui, sans-serif",
    letterSpacing: '0.15em',
    color: 'rgba(255,255,255,0.4)',
    textTransform: 'uppercase' as const,
    marginBottom: '6px',
  },
  input: {
    width: '100%',
    padding: '14px 16px',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: '8px',
    color: '#ffffff',
    fontSize: '15px',
    fontFamily: "'Bebas Neue', 'Impact', sans-serif",
    outline: 'none',
    boxSizing: 'border-box' as const,
  },
  joinBtn: {
    width: '100%',
    padding: '16px',
    background: 'rgba(0,229,255,0.15)',
    border: '1px solid rgba(0,229,255,0.6)',
    borderRadius: '8px',
    color: '#00e5ff',
    fontSize: '14px',
    fontWeight: 700,
    letterSpacing: '0.1em',
    textTransform: 'uppercase' as const,
    fontFamily: "'Bebas Neue', 'Impact', sans-serif",
    boxShadow: '0 0 20px rgba(0,229,255,0.15)',
    marginTop: '4px',
  },
  error: {
    color: '#ff3b5c',
    fontSize: '12px',
    fontFamily: "'Inter', system-ui, sans-serif",
    margin: 0,
  },
  spinner: {
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    border: '3px solid rgba(0,229,255,0.15)',
    borderTopColor: 'rgba(0,229,255,0.8)',
    animation: 'spin 0.8s linear infinite',
    marginTop: '24px',
  },
  ring1: {
    position: 'absolute',
    width: '400px',
    height: '400px',
    borderRadius: '50%',
    border: '1px solid rgba(0,229,255,0.05)',
    bottom: '-150px',
    right: '-150px',
    pointerEvents: 'none',
  },
  ring2: {
    position: 'absolute',
    width: '600px',
    height: '600px',
    borderRadius: '50%',
    border: '1px solid rgba(0,229,255,0.03)',
    bottom: '-250px',
    right: '-250px',
    pointerEvents: 'none',
  },
};