import { useEffect, useRef } from 'react';

/**
 * Requests a screen wake lock so the device doesn't sleep during the game.
 * Automatically re-acquires if the page becomes visible again (e.g. after
 * a phone call or notification pulled the user away).
 *
 * Wake lock is released when the component unmounts or when `active` is false.
 */
export const useWakeLock = (active: boolean): void => {
  const lockRef = useRef<WakeLockSentinel | null>(null);

  const acquire = async () => {
    if (!('wakeLock' in navigator)) return; // not supported
    try {
      lockRef.current = await navigator.wakeLock.request('screen');
      console.log('🔆 [WakeLock] Screen wake lock acquired');
    } catch (err) {
      // Can fail if battery is critically low or browser blocks it
      console.warn('🔆 [WakeLock] Could not acquire:', err);
    }
  };

  const release = () => {
    if (lockRef.current) {
      lockRef.current.release();
      lockRef.current = null;
      console.log('🔆 [WakeLock] Released');
    }
  };

  useEffect(() => {
    if (!active) { release(); return; }
    acquire();

    // Re-acquire when page becomes visible again after interruption
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