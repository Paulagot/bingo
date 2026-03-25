/**
 * Web Audio API sound effects for Elimination game.
 * No dependencies — generates tones programmatically.
 * Respects user mute preference stored in localStorage.
 */

let audioCtx: AudioContext | null = null;

const getCtx = (): AudioContext | null => {
  if (typeof window === 'undefined') return null;
  if (!audioCtx || audioCtx.state === 'closed') {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  // Resume if suspended (browser autoplay policy)
  if (audioCtx.state === 'suspended') audioCtx.resume();
  return audioCtx;
};

export const isMuted = (): boolean =>
  localStorage.getItem('elim_sound_muted') === 'true';

export const setMuted = (muted: boolean): void =>
  localStorage.setItem('elim_sound_muted', String(muted));

export const toggleMute = (): boolean => {
  const next = !isMuted();
  setMuted(next);
  return next;
};

// ─── Core tone generator ──────────────────────────────────────────────────────

interface ToneOpts {
  freq: number;
  type?: OscillatorType;
  duration: number;
  volume?: number;
  fadeOut?: boolean;
  delay?: number;
}

const playTone = (opts: ToneOpts): void => {
  if (isMuted()) return;
  const ctx = getCtx();
  if (!ctx) return;

  const { freq, type = 'sine', duration, volume = 0.3, fadeOut = true, delay = 0 } = opts;
  const startAt = ctx.currentTime + delay;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.type = type;
  osc.frequency.setValueAtTime(freq, startAt);

  gain.gain.setValueAtTime(volume, startAt);
  if (fadeOut) gain.gain.exponentialRampToValueAtTime(0.001, startAt + duration);

  osc.start(startAt);
  osc.stop(startAt + duration);
};

// ─── Sound effects ────────────────────────────────────────────────────────────

/** Played when a round goes active — rising two-tone */
export const playRoundStart = (): void => {
  playTone({ freq: 440, type: 'sine', duration: 0.15, volume: 0.25 });
  playTone({ freq: 660, type: 'sine', duration: 0.25, volume: 0.3, delay: 0.12 });
};

/** Played when player locks in an answer */
export const playSubmit = (): void => {
  playTone({ freq: 880, type: 'sine', duration: 0.12, volume: 0.2 });
  playTone({ freq: 1100, type: 'sine', duration: 0.1, volume: 0.15, delay: 0.1 });
};

/** Played during reveal — soft chime */
export const playReveal = (): void => {
  playTone({ freq: 523, type: 'sine', duration: 0.3, volume: 0.2 });
  playTone({ freq: 659, type: 'sine', duration: 0.3, volume: 0.18, delay: 0.15 });
  playTone({ freq: 784, type: 'sine', duration: 0.4, volume: 0.15, delay: 0.3 });
};

/** Played when player is eliminated — descending */
export const playEliminated = (): void => {
  playTone({ freq: 440, type: 'sawtooth', duration: 0.2, volume: 0.25 });
  playTone({ freq: 330, type: 'sawtooth', duration: 0.2, volume: 0.22, delay: 0.18 });
  playTone({ freq: 220, type: 'sawtooth', duration: 0.4, volume: 0.2, delay: 0.35 });
};

/** Played on winner screen — ascending fanfare */
export const playWinner = (): void => {
  const notes = [523, 659, 784, 1047];
  notes.forEach((freq, i) => {
    playTone({ freq, type: 'sine', duration: 0.25, volume: 0.3, delay: i * 0.12 });
  });
};

/** Countdown tick — last 3 seconds */
export const playCountdownTick = (): void => {
  playTone({ freq: 1000, type: 'square', duration: 0.08, volume: 0.15 });
};

/** Round intro — attention getter */
export const playRoundIntro = (): void => {
  playTone({ freq: 300, type: 'sine', duration: 0.1, volume: 0.2 });
  playTone({ freq: 450, type: 'sine', duration: 0.15, volume: 0.25, delay: 0.08 });
};