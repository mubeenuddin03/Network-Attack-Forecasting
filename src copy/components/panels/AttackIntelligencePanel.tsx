import { useState } from 'react';
import {
  BrainCircuit,
  Target,
  TrendingUp,
  BarChart2
} from 'lucide-react';
import { cn } from '@/utils/helpers';
import { useSelectedScenario } from '@/contexts/DashboardContext';
import { WorldModelRolloutChart } from '@/components/visualizations/WorldModelRolloutChart';
import { MitreKillChainTracker } from '@/components/visualizations/MitreKillChainTracker';
import { AttributionRadarChart } from '@/components/visualizations/AttributionRadarChart';
import { BenchmarkComparisonCard } from '@/components/visualizations/BenchmarkComparisonCard';
import { useSound } from '@/contexts/SoundContext';

export function AttackIntelligencePanel() {
  const selectedScenario = useSelectedScenario();
  const { play } = useSound();
  const [activeTab, setActiveTab] = useState<'rollout' | 'mitre' | 'explain' | 'benchmark'>('rollout');

  return (
    <div className="space-y-6">
      {/* Section Navigation Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border-subtle pb-3">
        <div>
          <h2 className="text-heading-md font-display font-bold text-text-primary flex items-center gap-2">
            <span>Attack Intelligence &amp; Forward Simulation</span>
            <span className="text-caption font-mono px-2 py-0.5 rounded-full bg-electric-500/20 text-electric-300 border border-electric-500/30">
              World Model Engine
            </span>
          </h2>
          <p className="text-body-sm text-text-muted mt-0.5">
            Forward state rollouts, ATT&CK kill-chain mapping, and explainable feature attributions
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1.5 bg-surface-900/90 p-1.5 rounded-xl border border-border-subtle backdrop-blur-md">
          <button
            type="button"
            onClick={() => { play('click'); setActiveTab('rollout'); }}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-caption font-medium transition-all',
              activeTab === 'rollout' ? 'bg-electric-500/20 text-electric-300 shadow-glow-sm' : 'text-text-muted hover:text-text-primary'
            )}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Forward Rollout</span>
          </button>
          <button
            type="button"
            onClick={() => { play('click'); setActiveTab('mitre'); }}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-caption font-medium transition-all',
              activeTab === 'mitre' ? 'bg-electric-500/20 text-electric-300 shadow-glow-sm' : 'text-text-muted hover:text-text-primary'
            )}
          >
            <Target className="w-3.5 h-3.5" />
            <span>MITRE Kill-Chain</span>
          </button>
          <button
            type="button"
            onClick={() => { play('click'); setActiveTab('explain'); }}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-caption font-medium transition-all',
              activeTab === 'explain' ? 'bg-electric-500/20 text-electric-300 shadow-glow-sm' : 'text-text-muted hover:text-text-primary'
            )}
          >
            <BrainCircuit className="w-3.5 h-3.5" />
            <span>Explainability (Radar)</span>
          </button>
          <button
            type="button"
            onClick={() => { play('click'); setActiveTab('benchmark'); }}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-caption font-medium transition-all',
              activeTab === 'benchmark' ? 'bg-electric-500/20 text-electric-300 shadow-glow-sm' : 'text-text-muted hover:text-text-primary'
            )}
          >
            <BarChart2 className="w-3.5 h-3.5" />
            <span>Benchmark Matrix</span>
          </button>
        </div>
      </div>

      {/* Tab Panels */}
      <div>
        {activeTab === 'rollout' && (
          <WorldModelRolloutChart scenario={selectedScenario} />
        )}
        {activeTab === 'mitre' && (
          <MitreKillChainTracker scenario={selectedScenario} />
        )}
        {activeTab === 'explain' && (
          <AttributionRadarChart scenario={selectedScenario} />
        )}
        {activeTab === 'benchmark' && (
          <BenchmarkComparisonCard />
        )}
      </div>

      {/* Grid of secondary visual components */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2">
        {activeTab !== 'mitre' && (
          <MitreKillChainTracker scenario={selectedScenario} />
        )}
        {activeTab !== 'explain' && (
          <AttributionRadarChart scenario={selectedScenario} />
        )}
        {activeTab === 'mitre' && (
          <WorldModelRolloutChart scenario={selectedScenario} />
        )}
      </div>
    </div>
  );
}