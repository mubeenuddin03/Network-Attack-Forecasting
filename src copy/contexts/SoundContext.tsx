import { ReactNode, createContext, useContext, useState, useCallback } from 'react';

interface SoundContextType {
  enabled: boolean;
  toggleSound: () => void;
  play: (type: 'click' | 'success' | 'warning' | 'error' | 'alert' | 'refresh') => void;
}

const SoundContext = createContext<SoundContextType | undefined>(undefined);

/**
 * Sounds are intentionally disabled across the dashboard.
 * `play` is a no-op so no audio is ever produced (no click / success /
 * warning / error / alert / refresh sounds), and no AudioContext is created.
 */
export function SoundProvider({ children }: { children: ReactNode }) {
  const [enabled] = useState(false);

  const toggleSound = useCallback(() => {
  }, []);

  const play = useCallback(() => {
  }, []);

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
