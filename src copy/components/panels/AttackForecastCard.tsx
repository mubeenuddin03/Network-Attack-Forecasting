import {
  Clock,
  Target,
  Sparkles,
  Layers
} from 'lucide-react';
import { cn } from '@/utils/helpers';
import { usePrediction, useSelectedScenario } from '@/contexts/DashboardContext';

export function AttackForecastCard() {
  const prediction = usePrediction();
  const selectedScenario = useSelectedScenario();

  const probability = selectedScenario ? selectedScenario.attackProbability : (prediction?.attack_probability ?? 0);
  const status = selectedScenario ? selectedScenario.status : (prediction?.status ?? 'NORMAL');
  const isAttackLikely = status === 'ATTACK_LIKELY';

  // Circular gauge calculations
  const size = 180;
  const strokeWidth = 14;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (probability * circumference);

  const getGaugeColor = (prob: number) => {
    if (prob >= 0.75) return '#ef4444';
    if (prob >= 0.45) return '#f59e0b';
    return '#10b981';
  };

  const gaugeColor = getGaugeColor(probability);

  return (
    <div className="glass-panel rounded-2xl p-6 border border-border-default relative overflow-hidden space-y-6 font-sans">
      {/* Background ambient pulse */}
      <div
        className={cn(
          'absolute top-0 right-0 w-96 h-96 rounded-full blur-[120px] pointer-events-none opacity-20 transition-all duration-1000',
          isAttackLikely ? 'bg-critical-500' : 'bg-secure-500'
        )}
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center relative z-10">
        {/* Left: Glowing Radial Probability Gauge */}
        <div className="lg:col-span-4 flex flex-col items-center justify-center p-4 bg-surface-900/70 rounded-2xl border border-border-subtle">
          <div className="relative" style={{ width: size, height: size }}>
            <svg width={size} height={size} className="transform -rotate-90">
              {/* Background Track */}
              <circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                stroke="rgba(148, 163, 184, 0.12)"
                strokeWidth={strokeWidth}
                fill="none"
              />
              {/* Animated Progress Ring */}
              <circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                stroke={gaugeColor}
                strokeWidth={strokeWidth}
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                fill="none"
                className="transition-all duration-1000 ease-out"
                style={{
                  filter: isAttackLikely ? 'drop-shadow(0 0 10px rgba(239, 68, 68, 0.5))' : 'drop-shadow(0 0 8px rgba(16, 185, 129, 0.4))'
                }}
              />
            </svg>

            {/* Centered Value */}
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
              <span className="text-3xl font-bold text-white tracking-tight">
                {(probability * 100).toFixed(0)}%
              </span>
              <span className="text-[11px] uppercase tracking-wider text-text-muted mt-0.5 font-medium">
                Infiltration Risk
              </span>
            </div>
          </div>

          <div className="mt-3 flex items-center gap-2">
            <span className={cn(
              'px-3 py-1 rounded-full text-caption font-semibold uppercase tracking-wider',
              isAttackLikely
                ? 'bg-critical-500/20 text-critical-300 border border-critical-500/40'
                : 'bg-secure-500/20 text-secure-300 border border-secure-500/40'
            )}>
              {isAttackLikely ? 'BREACH PROBABLE (ELEVATED)' : 'NOMINAL BASELINE'}
            </span>
          </div>
        </div>

        {/* Center & Right: High-Level World Model Forecasting Summary */}
        <div className="lg:col-span-8 space-y-4">
          <div>
            <div className="flex items-center gap-2 text-electric-400 text-caption uppercase tracking-wider font-semibold mb-1">
              <Sparkles className="w-3.5 h-3.5" />
              <span>World Model Predictive State Assessment</span>
            </div>
            <h2 className="text-heading-md font-bold text-text-primary">
              {isAttackLikely ? (
                <span>Anticipating Attack Progression: <span className="text-critical-400">{selectedScenario.name}</span></span>
              ) : (
                <span>Network Operating Within <span className="text-secure-400">Verified Benign Thresholds</span></span>
              )}
            </h2>
            <p className="text-body-sm text-text-secondary mt-1">
              {selectedScenario.description}
            </p>
          </div>

          {/* Quick Key Highlights */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
            <div className="p-3.5 rounded-xl bg-surface-900/80 border border-border-subtle">
              <div className="flex items-center gap-2 text-text-muted text-[11px] mb-1 font-medium">
                <Clock className="w-3.5 h-3.5 text-electric-400" />
                <span>Advance Lead Time</span>
              </div>
              <p className="text-body font-bold text-text-primary">
                {isAttackLikely ? '+15 min Advance Warning' : 'Continuous 5m Rolling'}
              </p>
              <p className="text-[11px] text-text-muted mt-0.5">
                {isAttackLikely ? 'Sufficient time for mitigation' : 'Real-time state monitoring'}
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-surface-900/80 border border-border-subtle">
              <div className="flex items-center gap-2 text-text-muted text-[11px] mb-1 font-medium">
                <Target className="w-3.5 h-3.5 text-amber-400" />
                <span>Next Predicted Stage</span>
              </div>
              <p className="text-body font-bold text-amber-300 truncate">
                {selectedScenario.horizons[1]?.projectedStage || 'Baseline'}
              </p>
              <p className="text-[11px] text-text-muted mt-0.5">
                MITRE {selectedScenario.mitreTechnique.id}
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-surface-900/80 border border-border-subtle">
              <div className="flex items-center gap-2 text-text-muted text-[11px] mb-1 font-medium">
                <Layers className="w-3.5 h-3.5 text-violet-400" />
                <span>Driving Telemetry</span>
              </div>
              <p className="text-body font-bold text-violet-300 truncate">
                {selectedScenario.attentionAttribution[0]?.label || 'SYN Flag Rate'}
              </p>
              <p className="text-[11px] text-text-muted mt-0.5">
                Primary transition driver
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}