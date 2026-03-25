import { useState } from 'react';
import { createRoom } from './services/eliminationApi';
import { emitJoinRoom } from './services/eliminationSocket';

interface Props {
  onJoined: (roomId: string, playerId: string, name: string, isHost: boolean) => void;
}

export const EliminationLobbyPage: React.FC<Props> = ({ onJoined }) => {
  // Clear any stale session when landing on lobby
  useState(() => {
    ['elim_room_id','elim_player_id','elim_host_id','elim_player_name','elim_is_host']
      .forEach(k => sessionStorage.removeItem(k));
  });

  const [mode, setMode] = useState<'choose' | 'host' | 'join'>('choose');
  const [name, setName] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleHost = async () => {
    if (!name.trim()) return setError('Enter your name');
    setLoading(true);
    setError('');
    try {
      const { roomId, hostId } = await createRoom(name.trim());
      // Host joins the socket room but NOT as a player — uses hostId for auth
      onJoined(roomId, hostId, name.trim(), true);
    } catch (e: any) {
      setError(e.message ?? 'Failed to create room');
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = () => {
    if (!name.trim()) return setError('Enter your name');
    if (!roomCode.trim()) return setError('Enter a room code');
    setError('');
    emitJoinRoom(roomCode.trim(), name.trim());
    // onJoined will be called when socket confirms via room_state
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6" style={styles.page}>
      {/* Title */}
      <div className="mb-12 text-center">
        <div style={styles.eyebrow}>FundRaisely</div>
        <h1 style={styles.title}>ELIMINATION</h1>
        <div style={styles.subtitle}>Precision. Survival. One winner.</div>
      </div>

      {mode === 'choose' && (
        <div className="flex flex-col gap-4 w-full max-w-xs">
          <button onClick={() => setMode('host')} style={styles.btnPrimary}>
            Host a Game
          </button>
          <button onClick={() => setMode('join')} style={styles.btnSecondary}>
            Join a Game
          </button>
        </div>
      )}

      {(mode === 'host' || mode === 'join') && (
        <div className="flex flex-col gap-4 w-full max-w-xs">
          <button onClick={() => { setMode('choose'); setError(''); }} style={styles.back}>
            ← Back
          </button>

          <input
            placeholder="Your name"
            value={name}
            onChange={e => setName(e.target.value)}
            maxLength={20}
            style={styles.input}
          />

          {mode === 'join' && (
            <input
              placeholder="Room code"
              value={roomCode}
              onChange={e => setRoomCode(e.target.value)}
              maxLength={20}
              style={{ ...styles.input, letterSpacing: '0.15em' }}
            />
          )}

          {error && <p style={styles.error}>{error}</p>}

          <button
            onClick={mode === 'host' ? handleHost : handleJoin}
            disabled={loading}
            style={loading ? { ...styles.btnPrimary, opacity: 0.5 } : styles.btnPrimary}
          >
            {loading ? 'Creating...' : mode === 'host' ? 'Create Room' : 'Join Room'}
          </button>
        </div>
      )}

      {/* Decorative rings */}
      <div style={styles.ring1} />
      <div style={styles.ring2} />
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  page: {
    background: '#080c14',
    fontFamily: "'Syne', sans-serif",
    position: 'relative',
    overflow: 'hidden',
  },
  eyebrow: {
    fontSize: '11px',
    letterSpacing: '0.3em',
    color: 'rgba(0,229,255,0.5)',
    fontFamily: "'DM Mono', monospace",
    textTransform: 'uppercase',
    marginBottom: '8px',
  },
  title: {
    fontSize: '52px',
    fontWeight: 800,
    letterSpacing: '-0.02em',
    color: '#ffffff',
    lineHeight: 1,
    marginBottom: '8px',
  },
  subtitle: {
    fontSize: '13px',
    color: 'rgba(255,255,255,0.4)',
    letterSpacing: '0.1em',
  },
  btnPrimary: {
    padding: '16px',
    background: 'rgba(0,229,255,0.15)',
    border: '1px solid rgba(0,229,255,0.6)',
    borderRadius: '8px',
    color: '#00e5ff',
    fontSize: '14px',
    fontWeight: 700,
    letterSpacing: '0.1em',
    textTransform: 'uppercase' as const,
    cursor: 'pointer',
    fontFamily: "'Syne', sans-serif",
    boxShadow: '0 0 20px rgba(0,229,255,0.15)',
  },
  btnSecondary: {
    padding: '16px',
    background: 'transparent',
    border: '1px solid rgba(255,255,255,0.15)',
    borderRadius: '8px',
    color: 'rgba(255,255,255,0.6)',
    fontSize: '14px',
    fontWeight: 600,
    letterSpacing: '0.1em',
    textTransform: 'uppercase' as const,
    cursor: 'pointer',
    fontFamily: "'Syne', sans-serif",
  },
  input: {
    padding: '14px 16px',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: '8px',
    color: '#ffffff',
    fontSize: '15px',
    fontFamily: "'Syne', sans-serif",
    outline: 'none',
  },
  back: {
    background: 'none',
    border: 'none',
    color: 'rgba(255,255,255,0.4)',
    cursor: 'pointer',
    fontSize: '13px',
    padding: '0',
    fontFamily: "'Syne', sans-serif",
    textAlign: 'left' as const,
  },
  error: {
    color: '#ff3b5c',
    fontSize: '12px',
    fontFamily: "'DM Mono', monospace",
    margin: 0,
  },
  ring1: {
    position: 'absolute',
    width: '400px',
    height: '400px',
    borderRadius: '50%',
    border: '1px solid rgba(0,229,255,0.06)',
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