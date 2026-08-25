import { ReactNode, createContext, useContext, useState, useCallback, useEffect } from 'react';

interface SoundContextType {
  enabled: boolean;
  toggleSound: () => void;
  play: (type: 'click' | 'success' | 'warning' | 'error' | 'alert' | 'refresh') => void;
}

const SoundContext = createContext<SoundContextType | undefined>(undefined);

const AUDIO_CONTEXT_KEY = '__audio_context__';

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!(window as Window & { [AUDIO_CONTEXT_KEY]?: AudioContext })[AUDIO_CONTEXT_KEY]) {
    (window as Window & { [AUDIO_CONTEXT_KEY]?: AudioContext })[AUDIO_CONTEXT_KEY] = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
  }
  return (window as Window & { [AUDIO_CONTEXT_KEY]?: AudioContext })[AUDIO_CONTEXT_KEY] || null;
}

function createTone(frequency: number, duration: number, type: OscillatorType = 'sine', volume: number = 0.1): AudioBuffer {
  const ctx = getAudioContext();
  if (!ctx) throw new Error('AudioContext not available');
  const sampleRate = ctx.sampleRate;
  const length = sampleRate * duration;
  const buffer = ctx.createBuffer(1, length, sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) {
    const t = i / sampleRate;
    const envelope = Math.exp(-t * 10);
    let sample = 0;
    if (type === 'sine') sample = Math.sin(2 * Math.PI * frequency * t);
    else if (type === 'square') sample = Math.sign(Math.sin(2 * Math.PI * frequency * t));
    else if (type === 'triangle') sample = 2 * Math.abs(2 * (t * frequency - Math.floor(t * frequency + 0.5))) - 1;
    data[i] = sample * envelope * volume;
  }
  return buffer;
}

function playBuffer(buffer: AudioBuffer, volume: number = 1) {
  const ctx = getAudioContext();
  if (!ctx) return;
  if (ctx.state === 'suspended') ctx.resume();
  const source = ctx.createBufferSource();
  const gain = ctx.createGain();
  source.buffer = buffer;
  gain.gain.value = volume;
  source.connect(gain);
  gain.connect(ctx.destination);
  source.start();
}

const soundBuffers = new Map<string, AudioBuffer>();

function getOrCreateBuffer(key: string, creator: () => AudioBuffer): AudioBuffer {
  if (!soundBuffers.has(key)) {
    soundBuffers.set(key, creator());
  }
  return soundBuffers.get(key)!;
}

export function SoundProvider({ children }: { children: ReactNode }) {
  const [enabled, setEnabled] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('soundEnabled') === 'true' && import.meta.env.VITE_ENABLE_SOUND === 'true';
    }
    return false;
  });

  useEffect(() => {
    localStorage.setItem('soundEnabled', enabled.toString());
  }, [enabled]);

  const toggleSound = useCallback(() => {
    setEnabled((prev) => !prev);
  }, []);

  const play = useCallback((type: 'click' | 'success' | 'warning' | 'error' | 'alert' | 'refresh') => {
    if (!enabled) return;
    try {
      let buffer: AudioBuffer;
      switch (type) {
        case 'click':
          buffer = getOrCreateBuffer('click', () => createTone(800, 0.05, 'sine', 0.05));
          playBuffer(buffer, 0.3);
          break;
        case 'success':
          buffer = getOrCreateBuffer('success', () => createTone(660, 0.15, 'sine', 0.1));
          playBuffer(buffer, 0.4);
          setTimeout(() => playBuffer(getOrCreateBuffer('success2', () => createTone(880, 0.1, 'sine', 0.08)), 0.3), 80);
          break;
        case 'warning':
          buffer = getOrCreateBuffer('warning', () => createTone(440, 0.2, 'triangle', 0.1));
          playBuffer(buffer, 0.4);
          break;
        case 'error':
          buffer = getOrCreateBuffer('error', () => createTone(220, 0.3, 'sawtooth', 0.15));
          playBuffer(buffer, 0.5);
          break;
        case 'alert':
          buffer = getOrCreateBuffer('alert', () => createTone(550, 0.4, 'square', 0.12));
          playBuffer(buffer, 0.5);
          break;
        case 'refresh':
          buffer = getOrCreateBuffer('refresh', () => createTone(520, 0.1, 'sine', 0.08));
          playBuffer(buffer, 0.3);
          setTimeout(() => playBuffer(getOrCreateBuffer('refresh2', () => createTone(660, 0.08, 'sine', 0.06)), 0.25), 60);
          break;
      }
    } catch (e) {
      console.warn('Sound playback failed:', e);
    }
  }, [enabled]);

  return (
    <SoundContext.Provider value={{ enabled, toggleSound, play }}>
      {children}
    </SoundContext.Provider>
  );
}

export function useSound() {
  const context = useContext(SoundContext);
  if (!context) throw new Error('useSound must be used within SoundProvider');
  return context;
}