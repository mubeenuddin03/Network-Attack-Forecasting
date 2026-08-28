import { cn } from '@/utils/helpers';
import { useSidebarCollapsed } from '@/contexts/DashboardContext';
import { Shield } from 'lucide-react';

interface HeaderProps {
  title?: string;
  subtitle?: string;
}

export function Header({
  title = 'Network Attack Forecasting',
  subtitle = 'Predictive World Model for Proactive Cyber Defense'
}: HeaderProps) {
  const sidebarCollapsed = useSidebarCollapsed();

  return (
    <header
      className={cn(
        'fixed top-0 left-0 right-0 z-30 h-16',
        'bg-surface-950/90 backdrop-blur-md border-b border-border-subtle',
        'flex items-center justify-between px-6 transition-all duration-300 ease-spring',
        sidebarCollapsed ? 'md:ml-[72px]' : 'md:ml-[260px]'
      )}
      role="banner"
    >
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-8 h-8 rounded-lg bg-electric-500/15 border border-electric-500/30 flex items-center justify-center text-electric-400 flex-shrink-0">
          <Shield className="w-4 h-4" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-body font-bold text-text-primary tracking-tight truncate">
              {title}
            </h1>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold tracking-widest uppercase bg-electric-500/20 text-electric-300 border border-electric-500/30">
              SENTINELS
            </span>
          </div>
          <p className="text-caption text-text-muted truncate hidden sm:block">
            {subtitle}
          </p>
        </div>
      </div>
    </header>
  );
}