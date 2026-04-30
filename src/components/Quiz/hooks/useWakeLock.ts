// src/components/Quiz/hooks/useWakeLock.ts
import { useEffect, useRef } from 'react';

export const useWakeLock = (active: boolean): void => {
  const lockRef = useRef<WakeLockSentinel | null>(null);

  const acquire = async () => {
    if (!('wakeLock' in navigator)) return;
    try {
      lockRef.current = await navigator.wakeLock.request('screen');
    } catch (err) {
      console.warn('WakeLock could not acquire:', err);
    }
  };

  const release = () => {
    lockRef.current?.release();
    lockRef.current = null;
  };

  useEffect(() => {
    if (!active) { release(); return; }
    acquire();
    const onVisibility = () => {
      if (document.visibilityState === 'visible' && active) acquire();
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      release();
    };
  }, [active]);
};