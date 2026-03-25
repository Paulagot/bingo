import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { emitJoinRoom } from './services/eliminationSocket';
import { getSocket } from './services/eliminationSocket';
import type { EliminationRoom } from './types/elimination';

const SESSION_ROOM_ID = 'elim_room_id';
const SESSION_PLAYER_ID = 'elim_player_id';
const SESSION_PLAYER_NAME = 'elim_player_name';
const SESSION_IS_HOST = 'elim_is_host';

export const EliminationJoinPage: React.FC = () => {
  const { roomId: roomIdFromUrl } = useParams<{ roomId?: string }>();
  const navigate = useNavigate();

  // Clear any stale session when landing on join page
  // Prevents old playerId/roomId from interfering with a fresh join
  useState(() => {
    ['elim_room_id','elim_player_id','elim_host_id','elim_player_name','elim_is_host']
      .forEach(k => sessionStorage.removeItem(k));
  });

  const [name, setName] = useState('');
  const [roomCode, setRoomCode] = useState(roomIdFromUrl ?? '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Use a ref for name so the socket listener never needs to re-register
  const nameRef = React.useRef(name);
  useEffect(() => { nameRef.current = name; }, [name]);

  // Register socket listeners once on mount — stable, not dependent on name state
  useEffect(() => {
    const socket = getSocket();

    const handleRoomState = (data: any) => {
      console.log('🎮 [Join] room_state received:', data);
      const room: EliminationRoom = data.roomSnapshot ?? data;

      // Server now sends yourPlayerId directly — no need to search by name
      // This is the definitive fix for duplicate name confusion
      const assignedPlayerId: string | undefined = data.yourPlayerId;
      const assignedName: string | undefined = data.yourName;

      if (!assignedPlayerId) {
        // Fallback for older server versions — find by exact name only
        const me = room.players.find(
          p => p.name.toLowerCase() === nameRef.current.toLowerCase().trim()
        );
        if (!me) {
          console.warn('[Join] No yourPlayerId and could not find by name');
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

      // Use the server-assigned identity directly
      sessionStorage.setItem(SESSION_ROOM_ID, room.roomId);
      sessionStorage.setItem(SESSION_PLAYER_ID, assignedPlayerId);
      sessionStorage.setItem(SESSION_PLAYER_NAME, assignedName ?? nameRef.current);
      sessionStorage.setItem(SESSION_IS_HOST, 'false');

      navigate('/elimination', { replace: true });
    };

    const handleError = (data: { message: string }) => {
      console.error('[Join] Socket error:', data.message);
      setError(data.message);
      setLoading(false);
    };

    socket.on('elimination_room_state', handleRoomState);
    socket.on('elimination_error', handleError);

    return () => {
      socket.off('elimination_room_state', handleRoomState);
      socket.off('elimination_error', handleError);
    };
  }, [navigate]); // stable — only navigate as dep

  const handleJoin = () => {
    const trimmedName = name.trim();
    const trimmedCode = roomCode.trim();

    if (!trimmedName) return setError('Enter your name');
    if (!trimmedCode) return setError('Enter a room code');

    setError('');
    setLoading(true);
    console.log('🎮 [Join] Emitting join:', { roomId: trimmedCode, name: trimmedName });
    emitJoinRoom(trimmedCode, trimmedName);
    // handleRoomState above will fire when server confirms
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleJoin();
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-6"
      style={styles.page}
    >
      {/* Back */}
      <button onClick={() => navigate('/elimination')} style={styles.back}>
        ← Back
      </button>

      {/* Header */}
      <div className="mb-10 text-center">
        <div style={styles.eyebrow}>FundRaisely</div>
        <h1 style={styles.title}>JOIN GAME</h1>
        <p style={styles.subtitle}>Enter your name and the room code to play</p>
      </div>

      {/* Form */}
      <div className="flex flex-col gap-4 w-full max-w-xs">
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

        <div>
          <label style={styles.label}>Room Code</label>
          <input
            placeholder="e.g. ROOM_ABC123"
            value={roomCode}
            onChange={e => setRoomCode(e.target.value)}
            onKeyDown={handleKeyDown}
            maxLength={40}
            style={{ ...styles.input, letterSpacing: '0.12em', fontFamily: "'Inter', system-ui, sans-serif" }}
          />
        </div>

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
      </div>

      {/* Decorative rings */}
      <div style={styles.ring1} />
      <div style={styles.ring2} />
    </div>
  );
};

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