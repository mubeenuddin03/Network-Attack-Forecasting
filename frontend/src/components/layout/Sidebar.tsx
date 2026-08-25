import { ReactNode, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Home, Activity, LineChart, Network, Shield, BarChart2, List, Settings } from 'lucide-react';
import { cn } from '@/utils/helpers';
import { Tooltip } from '@/components/ui/Tooltip';
import { useSidebarCollapsed, useDashboardStore } from '@/contexts/DashboardContext';
import { useSound } from '@/contexts/SoundContext';
import { useReducedMotion } from '@/contexts/ReducedMotionContext';

interface NavItem {
  id: string;
  label: string;
  icon: ReactNode;
  badge?: string;
  badgeVariant?: 'default' | 'success' | 'warning' | 'error' | 'info';
}

const NAV_ITEMS: NavItem[] = [
  { id: 'overview', label: 'Overview', icon: <Home className="w-5 h-5" /> },
  { id: 'forecast', label: 'Forecast', icon: <Activity className="w-5 h-5" /> },
  { id: 'network', label: 'Network State', icon: <Network className="w-5 h-5" /> },
  { id: 'timeline', label: 'Risk Timeline', icon: <LineChart className="w-5 h-5" /> },
  { id: 'intelligence', label: 'Attack Intelligence', icon: <Shield className="w-5 h-5" /> },
  { id: 'performance', label: 'Model Performance', icon: <BarChart2 className="w-5 h-5" /> },
  { id: 'activity', label: 'Activity Log', icon: <List className="w-5 h-5" /> },
  { id: 'settings', label: 'Settings', icon: <Settings className="w-5 h-5" /> },
];

interface SidebarProps {
  activeItem: string;
  onNavigate: (id: string) => void;
  className?: string;
}

export function Sidebar({ activeItem, onNavigate, className }: SidebarProps) {
  const collapsed = useSidebarCollapsed();
  const { modelMode } = useDashboardStore();
  const { play } = useSound();
  const { reducedMotion } = useReducedMotion();
  const sidebarRef = useRef<HTMLDivElement>(null);

  const handleKeyDown = useCallback((e: React.KeyboardEvent, itemId: string) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      play('click');
      onNavigate(itemId);
    }
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      const items = sidebarRef.current?.querySelectorAll('[data-nav-item]');
      if (items) {
        const currentIndex = Array.from(items).findIndex(el => el.getAttribute('data-nav-item') === itemId);
        const nextIndex = e.key === 'ArrowDown' ? (currentIndex + 1) % items.length : (currentIndex - 1 + items.length) % items.length;
        (items[nextIndex] as HTMLElement)?.focus();
      }
    }
  }, [onNavigate, play]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !collapsed) {
        useDashboardStore.getState().setSidebarCollapsed(true);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [collapsed]);

  return (
    <motion.aside
      ref={sidebarRef}
      initial={false}
      animate={{
        width: collapsed ? 72 : 260,
      }}
      transition={{
        duration: reducedMotion ? 0 : 300,
        ease: [0.34, 1.56, 0.64, 1],
      }}
      className={cn(
        'fixed left-0 top-0 z-[300] h-screen flex flex-col',
        'glass-panel-strong border-r border-border-subtle',
        'overflow-hidden',
        className
      )}
      role="navigation"
      aria-label="Main navigation"
    >
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between h-16 px-4 border-b border-border-subtle">
          <AnimatePresence mode="wait">
            {!collapsed && (
              <motion.div
                key="logo"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: reducedMotion ? 0 : 200 }}
                className="flex items-center gap-3"
              >
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-electric-500 to-violet-500 flex items-center justify-center">
                  <Activity className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-heading-sm text-text-primary font-semibold">NAF Dashboard</p>
                  <p className="text-caption text-text-muted">Network Attack Forecasting</p>
                </div>
              </motion.div>
            )}
            {collapsed && (
              <motion.div
                key="logo-collapsed"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: reducedMotion ? 0 : 200 }}
                className="flex justify-center"
              >
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-electric-500 to-violet-500 flex items-center justify-center">
                  <Activity className="w-5 h-5 text-white" />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <button
            onClick={() => {
              play('click');
              useDashboardStore.getState().toggleSidebar();
            }}
            className={cn(
              'btn-icon p-1.5 rounded-lg transition-transform duration-200',
              collapsed && 'rotate-180'
            )}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-expanded={!collapsed}
          >
            {collapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto p-3 space-y-1" role="list">
          <AnimatePresence mode="wait">
            {!collapsed && (
              <motion.div
                key="nav-expanded"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: reducedMotion ? 0 : 150 }}
              >
                <div className="px-3 py-1 text-caption text-text-muted uppercase tracking-wider font-medium">
                  Main Navigation
                </div>
                {NAV_ITEMS.map((item) => (
                  <button
                    key={item.id}
                    data-nav-item={item.id}
                    onClick={() => {
                      play('click');
                      onNavigate(item.id);
                    }}
                    onKeyDown={(e) => handleKeyDown(e, item.id)}
                    className={cn(
                      'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg',
                      'transition-all duration-200 ease-spring',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-electric-500 focus-visible:ring-offset-2 focus-visible:ring-offset-surface-950',
                      activeItem === item.id
                        ? 'bg-electric-500/15 text-text-primary border border-electric-500/30 shadow-glow-sm'
                        : 'text-text-secondary hover:bg-surface-800 hover:text-text-primary'
                    )}
                    role="listitem"
                    aria-current={activeItem === item.id ? 'page' : undefined}
                    tabIndex={0}
                  >
                    <span className="flex-shrink-0 w-5 h-5 flex items-center justify-center">{item.icon}</span>
                    <span className="font-medium">{item.label}</span>
                    {item.badge && (
                      <span className="ml-auto px-2 py-0.5 text-[0.625rem] font-medium rounded-full bg-surface-700 text-text-muted">
                        {item.badge}
                      </span>
                    )}
                  </button>
                ))}
              </motion.div>
            )}
            {collapsed && (
              <motion.div
                key="nav-collapsed"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: reducedMotion ? 0 : 150 }}
              >
                {NAV_ITEMS.map((item) => (
                  <Tooltip key={item.id} content={item.label} position="right" delay={300}>
                    <button
                      data-nav-item={item.id}
                      onClick={() => {
                        play('click');
                        onNavigate(item.id);
                      }}
                      onKeyDown={(e) => handleKeyDown(e, item.id)}
                      className={cn(
                        'mx-auto flex items-center justify-center w-10 h-10 rounded-lg',
                        'transition-all duration-200 ease-spring',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-electric-500 focus-visible:ring-offset-2 focus-visible:ring-offset-surface-950',
                        activeItem === item.id
                          ? 'bg-electric-500/15 text-text-primary border border-electric-500/30 shadow-glow-sm'
                          : 'text-text-secondary hover:bg-surface-800 hover:text-text-primary'
                      )}
                      role="listitem"
                      aria-current={activeItem === item.id ? 'page' : undefined}
                      aria-label={item.label}
                      tabIndex={0}
                    >
                      <span className="w-5 h-5 flex items-center justify-center">{item.icon}</span>
                    </button>
                  </Tooltip>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </nav>

        <div className="p-3 border-t border-border-subtle">
          <AnimatePresence mode="wait">
            {!collapsed && (
              <motion.div
                key="model-status-expanded"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                transition={{ duration: reducedMotion ? 0 : 200, delay: 100 }}
              >
                <div className="flex items-center gap-2 p-2 rounded-lg bg-surface-800/50">
                  <div className={cn('w-2 h-2 rounded-full', modelMode === 'REAL_MODEL' ? 'bg-electric-400' : 'bg-violet-400')} />
                  <span className="text-caption font-medium text-text-secondary">
                    {modelMode === 'REAL_MODEL' ? 'Real Model Active' : 'Demo Mode'}
                  </span>
                </div>
              </motion.div>
            )}
            {collapsed && (
              <Tooltip key="model-status-collapsed" content={modelMode === 'REAL_MODEL' ? 'Real Model Active' : 'Demo Mode'} position="right">
                <div className="mx-auto flex items-center justify-center w-10 h-10 rounded-lg bg-surface-800/50">
                  <div className={cn('w-2 h-2 rounded-full', modelMode === 'REAL_MODEL' ? 'bg-electric-400' : 'bg-violet-400')} />
                </div>
              </Tooltip>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.aside>
  );
}