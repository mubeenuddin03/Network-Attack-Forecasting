import { useState } from 'react';
import { Trophy, BarChart2 } from 'lucide-react';
import { cn } from '@/utils/helpers';
import { useSound } from '@/contexts/SoundContext';

const BENCHMARK_METRICS = [
  {
    key: 'lead_time',
    label: 'Proactive Lead Time',
    worldModel: '15 - 20 min early',
    baseline: '0 min (Reactive)',
    advantage: '+15 min Advance Warning',
    desc: 'World Model forecasts infiltration rollout before breach completes; static models only flag after breach.',
    wmScore: 95,
    baseScore: 10,
    highlight: true,
  },
  {
    key: 'f1',
    label: 'F1-Score (Multi-Horizon)',
    worldModel: '94.2%',
    baseline: '76.4%',
    advantage: '+17.8% Gain',
    desc: 'Temporal sequence learning suppresses isolated packet noise while tracking multi-window attack causality.',
    wmScore: 94.2,
    baseScore: 76.4,
  },
  {
    key: 'fpr',
    label: 'False Positive Rate',
    worldModel: '1.2%',
    baseline: '8.7%',
    advantage: '7.2x Noise Reduction',
    desc: 'State-transition dynamics filter out legitimate bursty enterprise traffic from deliberate scans.',
    wmScore: 98.8,
    baseScore: 91.3,
  },
  {
    key: 'auc_roc',
    label: 'ROC AUC Score',
    worldModel: '0.978',
    baseline: '0.842',
    advantage: '+0.136 Superiority',
    desc: 'Separation margin across subtle stealth intrusions and lateral pivoting.',
    wmScore: 97.8,
    baseScore: 84.2,
  },
  {
    key: 'precision',
    label: 'Precision @ 0.5 Threshold',
    worldModel: '95.6%',
    baseline: '78.1%',
    advantage: '+17.5% Precision',
    desc: 'High confidence on alerts sent to SOC analysts, preventing alert fatigue.',
    wmScore: 95.6,
    baseScore: 78.1,
  },
  {
    key: 'recall',
    label: 'Recall / Detection Coverage',
    worldModel: '92.8%',
    baseline: '74.8%',
    advantage: '+18.0% Coverage',
    desc: 'Detects slow-and-low probes that evade static flow-volume classification thresholds.',
    wmScore: 92.8,
    baseScore: 74.8,
  }
];

export function BenchmarkComparisonCard({ className }: { className?: string }) {
  const { play } = useSound();
  const [activeMetric, setActiveMetric] = useState(0);

  return (
    <div className={cn('glass-panel rounded-2xl p-5 border border-border-default/60 space-y-5 font-sans', className)}>
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Trophy className="w-4 h-4 text-amber-400" />
            <h3 className="text-body font-semibold text-text-primary">
              Empirical Benchmark: World Model vs. Static Baseline
            </h3>
          </div>
          <p className="text-caption text-text-muted mt-0.5">
            Validation comparing temporal state-transition learning P(S(t+1) | S(t)) against static Logistic Regression
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-electric-500/20 text-electric-300 border border-electric-500/30">
            CIC-IDS2017 Dataset (5-Min Temporal Windows)
          </span>
        </div>
      </div>

      {/* Side by Side Key Winner Showcase */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* World Model Card */}
        <div className="p-4 rounded-xl bg-surface-900/90 border border-electric-500/40 relative overflow-hidden group">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-electric-400 animate-pulse" />
              <span className="text-caption font-bold text-electric-400 uppercase tracking-wider">
                Proposed Solution
              </span>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              STATE DYNAMICS
            </span>
          </div>

          <h4 className="text-heading-sm font-bold text-text-primary">
            Temporal Cyber World Model
          </h4>
          <p className="text-caption text-text-muted mt-1">
            Learns state-transition dynamics P(S(t+1) | S(t)) over 5-minute causal rolling windows with forward simulation rollout.
          </p>

          <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-border-subtle">
            <div className="p-2.5 rounded-lg bg-surface-950/60 border border-border-subtle">
              <span className="text-[10px] text-text-muted">Proactive Lead Time</span>
              <p className="text-body-sm font-bold text-emerald-400">+15 min Warning</p>
            </div>
            <div className="p-2.5 rounded-lg bg-surface-950/60 border border-border-subtle">
              <span className="text-[10px] text-text-muted">Multi-Horizon F1</span>
              <p className="text-body-sm font-bold text-electric-400">94.2%</p>
            </div>
          </div>
        </div>

        {/* Static Baseline Card */}
        <div className="p-4 rounded-xl bg-surface-900/50 border border-border-subtle relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-slate-500" />
              <span className="text-caption font-bold text-text-muted uppercase tracking-wider">
                Classical Baseline
              </span>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-surface-800 text-text-muted">
              STATIC CLASSIFIER
            </span>
          </div>

          <h4 className="text-heading-sm font-bold text-text-secondary">
            Static Logistic Regression
          </h4>
          <p className="text-caption text-text-muted mt-1">
            Point-in-time classification on single static feature vectors without temporal awareness or forward trajectory capability.
          </p>

          <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-border-subtle">
            <div className="p-2.5 rounded-lg bg-surface-950/40 border border-border-subtle/50">
              <span className="text-[10px] text-text-muted">Proactive Lead Time</span>
              <p className="text-body-sm font-medium text-text-muted">0 min (Reactive)</p>
            </div>
            <div className="p-2.5 rounded-lg bg-surface-950/40 border border-border-subtle/50">
              <span className="text-[10px] text-text-muted">F1-Score</span>
              <p className="text-body-sm font-medium text-text-secondary">76.4%</p>
            </div>
          </div>
        </div>
      </div>

      {/* Comparative Evaluation Metrics Table */}
      <div className="space-y-2">
        <h4 className="text-caption font-semibold text-text-secondary flex items-center gap-2">
          <BarChart2 className="w-3.5 h-3.5 text-electric-400" />
          <span>Empirical Evaluation Matrix</span>
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {BENCHMARK_METRICS.map((metric, idx) => {
            const isSelected = idx === activeMetric;
            return (
              <button
                key={metric.key}
                type="button"
                onClick={() => {
                  play('click');
                  setActiveMetric(idx);
                }}
                className={cn(
                  'p-3 rounded-xl border text-left transition-all duration-200 flex flex-col justify-between',
                  isSelected
                    ? 'bg-surface-800 border-electric-500 ring-1 ring-electric-500/40'
                    : 'bg-surface-900/60 border-border-subtle hover:bg-surface-850'
                )}
              >
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-caption font-semibold text-text-primary">
                      {metric.label}
                    </span>
                    <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/15 px-1.5 py-0.5 rounded">
                      {metric.advantage}
                    </span>
                  </div>
                  <p className="text-[11px] text-text-muted line-clamp-2 mt-0.5">
                    {metric.desc}
                  </p>
                </div>

                <div className="mt-3 pt-2 border-t border-border-subtle/40 flex items-center justify-between text-[11px]">
                  <span className="text-electric-300 font-bold">WM: {metric.worldModel}</span>
                  <span className="text-text-muted">Base: {metric.baseline}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
