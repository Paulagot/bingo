import { useState, useCallback } from 'react';
import { isMuted, toggleMute, playSubmit } from './utils/sounds';

export const EliminationSoundToggle: React.FC = () => {
  const [muted, setMuted] = useState(isMuted);

  const handleToggle = useCallback(() => {
    const nowMuted = toggleMute();
    setMuted(nowMuted);
    if (!nowMuted) playSubmit(); // play a test sound when unmuting
  }, []);

  return (
    <button
      onClick={handleToggle}
      title={muted ? 'Unmute sounds' : 'Mute sounds'}
      style={{
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        fontSize: '18px',
        opacity: muted ? 0.35 : 0.7,
        padding: '4px 8px',
        borderRadius: '6px',
        transition: 'opacity 0.2s',
        lineHeight: 1,
      }}
    >
      {muted ? '🔇' : '🔊'}
    </button>
  );
};