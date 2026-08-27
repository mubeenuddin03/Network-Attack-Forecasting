import { ReactNode, useRef, useEffect, useCallback, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  LayoutDashboard,
  TrendingUp,
  Network,
  Activity,
  ShieldAlert,
  BarChart3,
  ListOrdered,
  Settings,
  Shield
} from 'lucide-react';
import { cn } from '@/utils/helpers';
import { useSidebarCollapsed, useDashboardStore } from '@/contexts/DashboardContext';
import { useSound } from '@/contexts/SoundContext';

interface NavItem {
  id: string;
  label: string;
  icon: ReactNode;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'overview', label: 'Overview', icon: <LayoutDashboard className="w-4 h-4" /> },
  { id: 'forecast', label: 'Forecast', icon: <TrendingUp className="w-4 h-4" /> },
  { id: 'network-state', label: 'Network State', icon: <Network className="w-4 h-4" /> },
  { id: 'risk-timeline', label: 'Risk Timeline', icon: <Activity className="w-4 h-4" /> },
  { id: 'attack-intelligence', label: 'Attack Intelligence', icon: <ShieldAlert className="w-4 h-4" /> },
  { id: 'model-performance', label: 'Model Performance', icon: <BarChart3 className="w-4 h-4" /> },
  { id: 'activity-log', label: 'Activity Log', icon: <ListOrdered className="w-4 h-4" /> },
  { id: 'settings', label: 'Settings', icon: <Settings className="w-4 h-4" /> },
];

export function Sidebar({ className }: { className?: string }) {
  const collapsed = useSidebarCollapsed();
  const toggleSidebar = useDashboardStore((s) => s.toggleSidebar);
  const { play } = useSound();
  const sidebarRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState<string>(NAV_ITEMS[0]?.id ?? 'overview');

  const scrollToSection = useCallback(
    (id: string) => {
      const el = document.getElementById(id);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        setActive(id);
      }
    },
    []
  );

  // Scroll-spy: sync sidebar with visible section
  useEffect(() => {
    const sections = NAV_ITEMS.map((item) => document.getElementById(item.id)).filter(
      (el): el is HTMLElement => !!el
    );
    if (!sections.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((entry) => entry.isIntersecting);
        if (!visible.length) return;
        visible.sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        const top = visible[0];
        if (top) setActive(top.target.id);
      },
      { rootMargin: '-15% 0px -70% 0px', threshold: 0 }
    );

    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, []);

  return (
    <aside
      ref={sidebarRef}
      className={cn(
        'fixed left-0 top-0 z-40 h-screen flex flex-col',
        'bg-surface-900 border-r border-border-subtle transition-all duration-300 ease-spring',
        collapsed ? 'w-[72px]' : 'w-[260px]',
        className
      )}
      role="navigation"
      aria-label="Main navigation"
    >
      {/* Sidebar Header */}
      <div className="flex items-center justify-between h-16 px-4 border-b border-border-subtle">
        {!collapsed ? (
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-electric-500/15 border border-electric-500/30 flex items-center justify-center text-electric-400 flex-shrink-0">
              <Shield className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <p className="text-body-sm font-semibold text-text-primary truncate">Cyber World Model</p>
              <p className="text-[11px] text-text-muted font-mono truncate">SOC Defense</p>
            </div>
          </div>
        ) : (
          <div className="mx-auto">
            <div className="w-8 h-8 rounded-lg bg-electric-500/15 border border-electric-500/30 flex items-center justify-center text-electric-400">
              <Shield className="w-4 h-4" />
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={() => {
            play('click');
            toggleSidebar();
          }}
          className={cn(
            'p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-800 transition-colors',
            collapsed && 'mx-auto mt-1'
          )}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Nav Items */}
      <nav className="flex-1 overflow-y-auto p-2.5 space-y-1" role="list">
        {NAV_ITEMS.map((item) => {
          const isActive = active === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                play('click');
                scrollToSection(item.id);
              }}
              title={collapsed ? item.label : undefined}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-caption font-medium transition-all duration-200',
                collapsed && 'justify-center px-0 h-10',
                isActive
                  ? 'bg-electric-500/15 text-electric-400 border border-electric-500/30 shadow-sm'
                  : 'text-text-secondary hover:bg-surface-800 hover:text-text-primary'
              )}
            >
              <span className="flex-shrink-0 flex items-center justify-center">{item.icon}</span>
              {!collapsed && <span className="truncate">{item.label}</span>}
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
