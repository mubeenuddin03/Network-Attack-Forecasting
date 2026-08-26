import { ReactNode, createContext, useContext } from 'react';

interface SoundContextType {
  enabled: boolean;
  toggleSound: () => void;
  play: (type: 'click' | 'success' | 'warning' | 'error' | 'alert' | 'refresh') => void;
}

const SoundContext = createContext<SoundContextType | undefined>(undefined);

export function SoundProvider({ children }: { children: ReactNode }) {
  const play = () => undefined;
  const toggleSound = () => undefined;

  return (
    <SoundContext.Provider value={{ enabled: false, toggleSound, play }}>
      {children}
    </SoundContext.Provider>
  );
}

export function useSound() {
  const context = useContext(SoundContext);
  if (!context) throw new Error('useSound must be used within SoundProvider');
  return context;
}
