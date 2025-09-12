// Updated countdown effects hook with subtle flash effects

import { useEffect, useState, useRef } from 'react';
import { useQuizSocket } from '../sockets/QuizSocketProvider';

interface CountdownEffect {
  secondsLeft: number;
  color: 'green' | 'orange' | 'red';
  message: string;
  triggerAutoSubmit?: boolean;
}

export const useCountdownEffects = (onAutoSubmitTrigger?: () => void) => {
  const [currentEffect, setCurrentEffect] = useState<CountdownEffect | null>(null);
  const [isFlashing, setIsFlashing] = useState(false);
  const { socket } = useQuizSocket();

  // Listen for countdown effects from server
  useEffect(() => {
    if (!socket) return;

    const handleCountdownEffect = (effect: CountdownEffect) => {
      console.log(`[Countdown] ${effect.message} - ${effect.color} flash`);
      
      // ✅ NEW: Trigger auto-submit if requested by server
      if (effect.triggerAutoSubmit && onAutoSubmitTrigger) {
        console.log('[Countdown] Server triggered auto-submit');
        onAutoSubmitTrigger();
      }
      
      // ✅ Test audio context before playing
      if (audioContextRef.current && audioContextRef.current.state === 'running') {
        console.log('[Audio] Playing countdown sound...');
        playBeep(effect.secondsLeft);
      } else {
        console.warn('[Audio] Audio context not ready. State:', audioContextRef.current?.state);
        // Try to initialize and play
        initAudioContext();
        setTimeout(() => playBeep(effect.secondsLeft), 100);
      }
      
      // Trigger flash effect
      setCurrentEffect(effect);
      setIsFlashing(true);
      
      // Stop flashing after 800ms
      setTimeout(() => {
        setIsFlashing(false);
        setCurrentEffect(null);
      }, 800);
    };

    socket.on('countdown_effect', handleCountdownEffect);
    
    return () => {
      if (socket) {
        socket.off('countdown_effect', handleCountdownEffect);
      }
    };
  }, [socket, onAutoSubmitTrigger]);

  // Initialize audio context once (with user gesture support)
  const audioContextRef = useRef<AudioContext | null>(null);

  const initAudioContext = () => {
    if (!audioContextRef.current) {
      try {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        console.log('[Audio] Audio context initialized');
      } catch (error) {
        console.error('[Audio] Failed to create audio context:', error);
      }
    }
    
    // Resume context if suspended (required by browser policies)
    if (audioContextRef.current?.state === 'suspended') {
      audioContextRef.current.resume().then(() => {
        console.log('[Audio] Audio context resumed');
      });
    }
  };

  // Initialize audio context on first user interaction
  useEffect(() => {
    const handleUserInteraction = () => {
      initAudioContext();
      // Remove listeners after first interaction
      document.removeEventListener('click', handleUserInteraction);
      document.removeEventListener('keydown', handleUserInteraction);
      document.removeEventListener('touchstart', handleUserInteraction);
    };

    document.addEventListener('click', handleUserInteraction);
    document.addEventListener('keydown', handleUserInteraction);
    document.addEventListener('touchstart', handleUserInteraction);

    return () => {
      document.removeEventListener('click', handleUserInteraction);
      document.removeEventListener('keydown', handleUserInteraction);
      document.removeEventListener('touchstart', handleUserInteraction);
    };
  }, []);

  // Create dramatic countdown sounds
  const playBeep = (secondsLeft: number) => {
    // Ensure audio context is ready
    if (!audioContextRef.current) {
      initAudioContext();
    }

    const audioContext = audioContextRef.current;
    if (!audioContext || audioContext.state === 'suspended') {
      console.warn('[Audio] Audio context not available or suspended');
      return;
    }
    
    // Heartbeat Sound
    const createHeartbeat = () => {
      const duration = secondsLeft === 1 ? 0.6 : 0.4;
      
      // First beat
      const osc1 = audioContext.createOscillator();
      const gain1 = audioContext.createGain();
      
      osc1.connect(gain1);
      gain1.connect(audioContext.destination);
      
      osc1.frequency.setValueAtTime(80, audioContext.currentTime);
      osc1.type = 'sine';
      gain1.gain.setValueAtTime(0.6, audioContext.currentTime);
      gain1.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
      
      osc1.start(audioContext.currentTime);
      osc1.stop(audioContext.currentTime + 0.1);
      
      // Second beat (slightly delayed)
      setTimeout(() => {
        const osc2 = audioContext.createOscillator();
        const gain2 = audioContext.createGain();
        
        osc2.connect(gain2);
        gain2.connect(audioContext.destination);
        
        osc2.frequency.setValueAtTime(60, audioContext.currentTime);
        osc2.type = 'sine';
        gain2.gain.setValueAtTime(0.4, audioContext.currentTime);
        gain2.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.15);
        
        osc2.start(audioContext.currentTime);
        osc2.stop(audioContext.currentTime + 0.15);
      }, 150);
    };

    createHeartbeat();
  };

  // 🎨 MUCH MORE SUBTLE flash classes
  const getFlashClasses = () => {
    if (!isFlashing || !currentEffect) return '';
    
    // More subtle color mapping with lower opacity and softer transitions
    const colorMap = {
      green: 'flash-green',
      orange: 'flash-orange', 
      red: 'flash-red'
    };

    return `${colorMap[currentEffect.color]} flash-effect`;
  };

  return {
    currentEffect,
    isFlashing,
    getFlashClasses
  };
};