import { ReactNode, createContext, useContext, useState, useEffect } from 'react';

interface ReducedMotionContextType {
  reducedMotion: boolean;
  setReducedMotion: (enabled: boolean) => void;
}

const ReducedMotionContext = createContext<ReducedMotionContextType | undefined>(undefined);

export function ReducedMotionProvider({ children }: { children: ReactNode }) {
  const [reducedMotion, setReducedMotion] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }
    return false;
  });

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mediaQuery.addEventListener('change', handler);
    setReducedMotion(mediaQuery.matches);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  return (
    <ReducedMotionContext.Provider value={{ reducedMotion, setReducedMotion }}>
      {children}
    </ReducedMotionContext.Provider>
  );
}

export function useReducedMotion() {
  const context = useContext(ReducedMotionContext);
  if (!context) throw new Error('useReducedMotion must be used within ReducedMotionProvider');
  return context;
}