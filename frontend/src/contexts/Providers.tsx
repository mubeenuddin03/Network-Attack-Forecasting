import { ReactNode } from 'react';
import { DashboardProvider } from './DashboardContext';
import { ThemeProvider } from './ThemeContext';
import { SoundProvider } from './SoundContext';
import { ReducedMotionProvider } from './ReducedMotionContext';

interface ProvidersProps {
  children: ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return (
    <ReducedMotionProvider>
      <ThemeProvider>
        <SoundProvider>
          <DashboardProvider>{children}</DashboardProvider>
        </SoundProvider>
      </ThemeProvider>
    </ReducedMotionProvider>
  );
}