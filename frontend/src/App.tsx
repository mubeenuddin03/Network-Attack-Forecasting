import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/utils/helpers';
import { useReducedMotion } from '@/contexts/ReducedMotionContext';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { Hero } from '@/components/panels/Hero';
import { NetworkStatePanel } from '@/components/panels/NetworkStatePanel';
import { AttackForecastCard } from '@/components/panels/AttackForecastCard';
import { AttackIntelligencePanel } from '@/components/panels/AttackIntelligencePanel';
import { ModelPerformancePanel } from '@/components/panels/ModelPerformancePanel';
import { ActivityFeed } from '@/components/panels/ActivityFeed';
import { PredictionInspector } from '@/components/modals/PredictionInspector';
import { Toaster } from '@/components/feedback/Toaster';
import { useSidebarCollapsed } from '@/contexts/DashboardContext';

const NAV_ITEMS = [
  { id: 'overview', label: 'Overview' },
  { id: 'forecast', label: 'Forecast' },
  { id: 'network', label: 'Network State' },
  { id: 'timeline', label: 'Risk Timeline' },
  { id: 'intelligence', label: 'Attack Intelligence' },
  { id: 'performance', label: 'Model Performance' },
  { id: 'activity', label: 'Activity' },
  { id: 'settings', label: 'Settings' },
] as const;

type NavItemId = typeof NAV_ITEMS[number]['id'];

export function App() {
  const { reducedMotion } = useReducedMotion();
  const sidebarCollapsed = useSidebarCollapsed();
  const [activeNav, setActiveNav] = useState<NavItemId>('overview');
  const [inspectorOpen, setInspectorOpen] = useState(false);

  const renderPage = () => {
    switch (activeNav) {
      case 'overview':
        return (
          <div className="space-y-8">
            <Hero />
            <AttackForecastCard />
            <NetworkStatePanel />
            <AttackIntelligencePanel />
            <ModelPerformancePanel />
            <ActivityFeed />
          </div>
        );
      case 'forecast':
        return (
          <div className="space-y-8">
            <AttackForecastCard />
            <ActivityFeed limit={10} />
          </div>
        );
      case 'network':
        return <NetworkStatePanel />;
      case 'timeline':
        return (
          <div className="space-y-8">
            <ActivityFeed limit={5} />
          </div>
        );
      case 'intelligence':
        return <AttackIntelligencePanel />;
      case 'performance':
        return <ModelPerformancePanel />;
      case 'activity':
        return <ActivityFeed limit={50} />;
      case 'settings':
        return (
          <div className="space-y-8 max-w-2xl">
            <h2 className="text-heading-lg font-semibold text-text-primary">Settings</h2>
            <p className="text-text-muted">Settings panel - configure dashboard preferences</p>
          </div>
        );
      default:
        return <Hero />;
    }
  };

  return (
    <div className="min-h-screen bg-surface-950">
      <Sidebar
        activeItem={activeNav}
        onNavigate={(id) => setActiveNav(id as NavItemId)}
      />
      <Header />
      <main
        className={cn(
          'pt-16 pb-8 min-h-screen transition-all duration-300 ease-spring',
          sidebarCollapsed ? 'md:ml-[72px]' : 'md:ml-[260px]'
        )}
      >
        <div className="max-w-[1600px] mx-auto px-4 md:px-6 lg:px-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeNav}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: reducedMotion ? 0 : 300, ease: 'easeOut' }}
            >
              {renderPage()}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
      <PredictionInspector isOpen={inspectorOpen} onClose={() => setInspectorOpen(false)} />
      <Toaster />
    </div>
  );
}