import { lazy, Suspense, type ReactNode } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { CsvUpload } from '@/components/panels/CSVUpload';
import { DatasetPanel } from '@/components/panels/DatasetPanel';
import { PredictionInspector } from '@/components/modals/PredictionInspector';
import { Card } from '@/components/ui';
import { cn } from '@/utils/helpers';
import { useSidebarCollapsed, useDashboardStore, useThreshold } from '@/contexts/DashboardContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useSound } from '@/contexts/SoundContext';

const AttackForecastCard = lazy(() =>
  import('@/components/panels/AttackForecastCard').then((m) => ({ default: m.AttackForecastCard }))
);
const NetworkStatePanel = lazy(() =>
  import('@/components/panels/NetworkStatePanel').then((m) => ({ default: m.NetworkStatePanel }))
);
const AttackIntelligencePanel = lazy(() =>
  import('@/components/panels/AttackIntelligencePanel').then((m) => ({ default: m.AttackIntelligencePanel }))
);
const ModelPerformancePanel = lazy(() =>
  import('@/components/panels/ModelPerformancePanel').then((m) => ({ default: m.ModelPerformancePanel }))
);
const ActivityFeed = lazy(() =>
  import('@/components/panels/ActivityFeed').then((m) => ({ default: m.ActivityFeed }))
);
const RiskTimelinePanel = lazy(() =>
  import('@/components/panels/RiskTimelinePanel').then((m) => ({ default: m.RiskTimelinePanel }))
);

import { motion } from 'framer-motion';

function PanelFallback() {
  return <div className="h-64 w-full rounded-2xl bg-surface-900/60 border border-border-subtle animate-pulse" aria-hidden="true" />;
}

function SectionShell({
  id,
  children,
  className,
}: {
  id: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <motion.section
      id={id}
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      className={cn('scroll-mt-24 space-y-6', className)}
    >
      {children}
    </motion.section>
  );
}

function SettingsSection() {
  const { theme, toggleTheme } = useTheme();
  const threshold = useThreshold();
  const setThreshold = useDashboardStore((s) => s.setThreshold);
  const { play } = useSound();

  return (
    <SectionShell id="settings">
      <Card variant="default" className="p-6 space-y-6">
        <div>
          <h2 className="text-body font-bold text-text-primary">System &amp; Detection Settings</h2>
          <p className="text-caption text-text-muted mt-0.5">
            Configure threat detection sensitivity and display preferences
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Dark Mode Toggle */}
          <div className="p-4 rounded-xl border border-border-subtle bg-surface-900/50 flex items-center justify-between gap-4">
            <div>
              <span className="block text-body-sm font-medium text-text-primary">Dark Theme</span>
              <span className="block text-[11px] text-text-muted">High-contrast SOC dark mode palette</span>
            </div>
            <button
              type="button"
              onClick={() => {
                play('click');
                toggleTheme();
              }}
              className={cn(
                'relative h-6 w-11 flex-shrink-0 rounded-full transition-colors',
                theme === 'dark' ? 'bg-electric-500' : 'bg-surface-700'
              )}
              aria-label="Toggle theme"
            >
              <span
                className={cn(
                  'absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform',
                  theme === 'dark' ? 'translate-x-[22px]' : 'translate-x-0.5'
                )}
              />
            </button>
          </div>

          {/* Decision Threshold Controller */}
          <div className="p-4 rounded-xl border border-border-subtle bg-surface-900/50 space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <span className="block text-body-sm font-medium text-text-primary">Detection Sensitivity Threshold</span>
                <span className="block text-[11px] text-text-muted">Classifier decision boundary for alert trigger</span>
              </div>
              <span className="text-body-sm font-mono font-bold text-electric-400">
                {(threshold * 100).toFixed(0)}%
              </span>
            </div>
            <input
              type="range"
              min="0.1"
              max="0.9"
              step="0.05"
              value={threshold}
              onChange={(e) => {
                setThreshold(parseFloat(e.target.value));
              }}
              className="w-full h-1.5 bg-surface-800 rounded-lg appearance-none cursor-pointer accent-electric-500"
            />
          </div>
        </div>
      </Card>
    </SectionShell>
  );
}

export function App() {
  const sidebarCollapsed = useSidebarCollapsed();
  const inspectorOpen = useDashboardStore((s) => s.inspectorOpen);
  const closeInspector = useDashboardStore((s) => s.closeInspector);

  return (
    <div className="min-h-screen bg-surface-950 text-text-primary antialiased">
      <Sidebar />
      <Header />

      <main
        className={cn(
          'pt-24 pb-20 min-h-screen transition-all duration-300 ease-spring',
          sidebarCollapsed ? 'md:ml-[72px]' : 'md:ml-[260px]'
        )}
      >
        <div className="max-w-[1500px] mx-auto px-4 md:px-6 lg:px-8 space-y-12">
          {/* Overview & Upload */}
          <SectionShell id="overview">
            <CsvUpload />
            <DatasetPanel />
          </SectionShell>

          {/* Core Attack Forecast */}
          <SectionShell id="forecast">
            <Suspense fallback={<PanelFallback />}>
              <AttackForecastCard />
            </Suspense>
          </SectionShell>

          {/* Network State */}
          <SectionShell id="network-state">
            <Suspense fallback={<PanelFallback />}>
              <NetworkStatePanel />
            </Suspense>
          </SectionShell>

          {/* Risk Timeline */}
          <SectionShell id="risk-timeline">
            <Suspense fallback={<PanelFallback />}>
              <RiskTimelinePanel />
            </Suspense>
          </SectionShell>

          {/* Attack Intelligence & Forward Simulation */}
          <SectionShell id="attack-intelligence">
            <Suspense fallback={<PanelFallback />}>
              <AttackIntelligencePanel />
            </Suspense>
          </SectionShell>

          {/* Model Performance */}
          <SectionShell id="model-performance">
            <Suspense fallback={<PanelFallback />}>
              <ModelPerformancePanel />
            </Suspense>
          </SectionShell>

          {/* Activity Feed */}
          <SectionShell id="activity-log">
            <Suspense fallback={<PanelFallback />}>
              <ActivityFeed limit={40} />
            </Suspense>
          </SectionShell>

          {/* Clean Settings */}
          <SettingsSection />
        </div>
      </main>

      <PredictionInspector isOpen={inspectorOpen} onClose={closeInspector} />
    </div>
  );
}
