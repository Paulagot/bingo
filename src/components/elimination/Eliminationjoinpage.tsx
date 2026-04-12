import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { emitJoinRoom } from './services/eliminationSocket';
import { getSocket } from './services/eliminationSocket';
import { getRoom } from './services/eliminationApi';
import { Web3Provider } from '../Web3Provider';
import { Web3JoinSection } from './Web3JoinSection';
import type { EliminationRoom } from './types/elimination';

const SESSION_ROOM_ID = 'elim_room_id';
const SESSION_PLAYER_ID = 'elim_player_id';
const SESSION_PLAYER_NAME = 'elim_player_name';
const SESSION_IS_HOST = 'elim_is_host';

// ── Main join page — no web3 hooks at this level ──────────────────────────────
const EliminationJoinInner: React.FC = () => {
  const { roomId: roomIdFromUrl } = useParams<{ roomId?: string }>();
  const navigate = useNavigate();

  // Clear stale session on mount
  useState(() => {
    ['elim_room_id', 'elim_player_id', 'elim_host_id', 'elim_player_name', 'elim_is_host']
      .forEach(k => sessionStorage.removeItem(k));
  });

  const [name, setName] = useState('');
  const [roomCode, setRoomCode] = useState(roomIdFromUrl ?? '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Room detection
  const [roomData, setRoomData] = useState<any>(null);
  const [roomLoading, setRoomLoading] = useState(false);
  const [isWeb3Room, setIsWeb3Room] = useState(false);
  const [web3PaymentDone, setWeb3PaymentDone] = useState(false);

  const nameRef = useRef(name);
  useEffect(() => { nameRef.current = name; }, [name]);

  // ── Fetch room when roomId is in URL ──────────────────────────────────────
  useEffect(() => {
    const code = roomIdFromUrl ?? '';
    if (!code) return;
    setRoomLoading(true);
    getRoom(code)
      .then(({ room }) => {
        setRoomData(room);
        setIsWeb3Room((room as any).paymentMode === 'web3');
      })
      .catch(() => {
        // Room not found — player may be on manual entry flow
      })
      .finally(() => setRoomLoading(false));
  }, [roomIdFromUrl]);

  // ── Fetch room when manually entered room code changes ────────────────────
  useEffect(() => {
    if (roomIdFromUrl) return; // already handled above
    if (!roomCode || roomCode.length < 6) return;
    const timer = setTimeout(() => {
      getRoom(roomCode)
        .then(({ room }) => {
          setRoomData(room);
          setIsWeb3Room((room as any).paymentMode === 'web3');
        })
        .catch(() => {
          setIsWeb3Room(false);
          setRoomData(null);
        });
    }, 500); // debounce
    return () => clearTimeout(timer);
  }, [roomCode, roomIdFromUrl]);

  // ── Socket listeners ──────────────────────────────────────────────────────
  useEffect(() => {
    const socket = getSocket();

    const handleRoomState = (data: any) => {
      const room: EliminationRoom = data.roomSnapshot ?? data;
      const assignedPlayerId: string | undefined = data.yourPlayerId;
      const assignedName: string | undefined = data.yourName;

      if (!assignedPlayerId) {
        // Fallback — find by name
        const me = room.players.find(
          p => p.name.toLowerCase() === nameRef.current.toLowerCase().trim()
        );
        if (!me) {
          setLoading(false);
          setError('Could not join room. Please try again.');
          return;
        }
        sessionStorage.setItem(SESSION_ROOM_ID, room.roomId);
        sessionStorage.setItem(SESSION_PLAYER_ID, me.playerId);
        sessionStorage.setItem(SESSION_PLAYER_NAME, me.name);
        sessionStorage.setItem(SESSION_IS_HOST, 'false');
        navigate('/elimination', { replace: true });
        return;
      }

      // Use server-assigned identity
      sessionStorage.setItem(SESSION_ROOM_ID, room.roomId);
      sessionStorage.setItem(SESSION_PLAYER_ID, assignedPlayerId);
      sessionStorage.setItem(SESSION_PLAYER_NAME, assignedName ?? nameRef.current);
      sessionStorage.setItem(SESSION_IS_HOST, 'false');
      navigate('/elimination', { replace: true });
    };

    const handleError = (data: { message: string }) => {
      setError(data.message);
      setLoading(false);
    };

    socket.on('elimination_room_state', handleRoomState);
    socket.on('elimination_error', handleError);
    return () => {
      socket.off('elimination_room_state', handleRoomState);
      socket.off('elimination_error', handleError);
    };
  }, [navigate]);

  // ── Web3 payment confirmed — emit join with tx signature ──────────────────
// EliminationJoinInner — update handler and emitJoinRoom call
const handleWeb3PaymentDone = (txHash: string, walletAddress: string) => {
  setWeb3PaymentDone(true);
  setLoading(true);
  const roomId = (roomIdFromUrl || roomCode || '').trim();
  emitJoinRoom(roomId, nameRef.current, undefined, txHash, walletAddress);
};

  // ── Web2 join ─────────────────────────────────────────────────────────────
  const handleJoin = () => {
    const trimmedName = name.trim();
    const trimmedCode = (roomCode || roomIdFromUrl || '').trim();
    if (!trimmedName) return setError('Enter your name');
    if (!trimmedCode) return setError('Enter a room code');
    setError('');
    setLoading(true);
    emitJoinRoom(trimmedCode, trimmedName);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isWeb3Room) handleJoin();
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-6"
      style={styles.page}
    >
      <button onClick={() => navigate('/elimination')} style={styles.back}>
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

        {/* ── Web3 payment section ──
            Web3Provider mounts lazily here — only when we know it's a web3 room.
            Web3JoinSection lives in its own file so wagmi hooks only execute
            inside the provider tree. */}
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

        {/* Payment confirmed — waiting for socket confirmation */}
        {web3PaymentDone && (
          <div style={{
            fontSize: '13px',
            color: 'rgba(0,229,255,0.7)',
            textAlign: 'center',
            fontFamily: 'Inter',
          }}>
            ✓ Payment confirmed — joining room...
          </div>
        )}

        {/* ── Web2 join button ── */}
        {!isWeb3Room && !roomLoading && (
          <>
            {error && <p style={styles.error}>{error}</p>}
            <button
              onClick={handleJoin}
              disabled={loading}
              style={{
                ...styles.joinBtn,
                opacity: loading ? 0.5 : 1,
                cursor: loading ? 'default' : 'pointer',
              }}
            >
              {loading ? 'Joining…' : 'Join Game'}
            </button>
          </>
        )}

        {/* General error display for web3 flow */}
        {isWeb3Room && error && !web3PaymentDone && (
          <p style={styles.error}>{error}</p>
        )}

      </div>

      <div style={styles.ring1} />
      <div style={styles.ring2} />
    </div>
  );
};

// ── Page export — Web3Provider not at this level ──────────────────────────────
// Provider mounts conditionally inside EliminationJoinInner only after
// we confirm the room is a web3 room. This prevents WagmiProvider crashes
// for web2 players and during initial load before room is fetched.
export const EliminationJoinPage: React.FC = () => <EliminationJoinInner />;

// ── Styles ────────────────────────────────────────────────────────────────────
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