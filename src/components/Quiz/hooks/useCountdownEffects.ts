// STEP 2: Create a countdown effects hook

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
    
    // ✅ FIXED: Proper cleanup function for your socket structure
    return () => {
      if (socket) {
        socket.off('countdown_effect', handleCountdownEffect);
      }
    };
  }, [socket]);

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
    
    // OPTION 1: Heartbeat Sound (choose one option)
    const createHeartbeat = () => {
      const duration = secondsLeft === 1 ? 0.6 : 0.4;
      
      // First beat - LOUDER
      const osc1 = audioContext.createOscillator();
      const gain1 = audioContext.createGain();
      
      osc1.connect(gain1);
      gain1.connect(audioContext.destination);
      
      osc1.frequency.setValueAtTime(80, audioContext.currentTime);
      osc1.type = 'sine';
      gain1.gain.setValueAtTime(0.6, audioContext.currentTime); // ✅ INCREASED from 0.2 to 0.4
      gain1.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
      
      osc1.start(audioContext.currentTime);
      osc1.stop(audioContext.currentTime + 0.1);
      
      // Second beat (slightly delayed) - LOUDER
      setTimeout(() => {
        const osc2 = audioContext.createOscillator();
        const gain2 = audioContext.createGain();
        
        osc2.connect(gain2);
        gain2.connect(audioContext.destination);
        
        osc2.frequency.setValueAtTime(60, audioContext.currentTime);
        osc2.type = 'sine';
        gain2.gain.setValueAtTime(0.4, audioContext.currentTime); // ✅ INCREASED from 0.15 to 0.3
        gain2.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.15);
        
        osc2.start(audioContext.currentTime);
        osc2.stop(audioContext.currentTime + 0.15);
      }, 150);
    };

  
    // Use the selected sound effect
    createHeartbeat(); // Change this to use different options
  };

  // Generate flash classes based on current effect
  const getFlashClasses = () => {
    if (!isFlashing || !currentEffect) return '';
    
    const colorMap = {
      green: 'bg-green-400/20 border-green-400',
      orange: 'bg-orange-400/20 border-orange-400', 
      red: 'bg-red-400/20 border-red-400'
    };

    return `${colorMap[currentEffect.color]} border-4 animate-pulse transition-all duration-200`;
  };

  return {
    currentEffect,
    isFlashing,
    getFlashClasses
  };
};