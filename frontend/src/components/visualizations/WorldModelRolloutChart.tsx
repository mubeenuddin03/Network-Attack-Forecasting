import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  CartesianGrid
} from 'recharts';
import { Play, Pause, RotateCcw, FastForward, Layers } from 'lucide-react';
import { cn } from '@/utils/helpers';
import { useSound } from '@/contexts/SoundContext';
import type { AttackScenario } from '@/utils/simulationPresets';

interface WorldModelRolloutChartProps {
  scenario: AttackScenario;
  height?: number;
  className?: string;
}

export function WorldModelRolloutChart({ scenario, height = 340, className }: WorldModelRolloutChartProps) {
  const { play } = useSound();
  const [activeHorizonIndex, setActiveHorizonIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const playIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const horizons = scenario.horizons && scenario.horizons.length > 0 ? scenario.horizons : [];

  // Auto playback of forward simulation steps
  useEffect(() => {
    if (isPlaying && horizons.length > 1) {
      playIntervalRef.current = setInterval(() => {
        setActiveHorizonIndex((prev) => {
          if (prev >= horizons.length - 1) {
            return 0;
          }
          return prev + 1;
        });
      }, 2000);
    } else if (playIntervalRef.current) {
      clearInterval(playIntervalRef.current);
    }
    return () => {
      if (playIntervalRef.current) clearInterval(playIntervalRef.current);
    };
  }, [isPlaying, horizons.length]);

  const toPct = (val: number | undefined, fallback: number = 0): number => {
    if (val === undefined || isNaN(val)) return fallback;
    return val <= 1.0 ? Math.round(val * 100) : Math.round(val);
  };

  const formatStatePct = (val: number | undefined, fallback: number = 50) => {
    const v = val !== undefined && !isNaN(val) ? val : fallback;
    const num = v <= 1.0 ? v * 100 : v;
    return `${Math.round(num)}%`;
  };

  const defaultHorizon = horizons[0] || {
    horizonMinutes: 0,
    stepLabel: 'Current State S(t)',
    probability: scenario.attackProbability || 0,
    lowerBound: (scenario.attackProbability || 0) * 0.9,
    upperBound: Math.min(1, (scenario.attackProbability || 0) * 1.1),
    projectedStage: scenario.mitreStage || 'Baseline',
    stateVector: { synRate: 0.5, portEntropy: 0.5, flowIntensity: 0.5, packetTimingVar: 0.5 }
  };

  const currentHorizon = horizons[activeHorizonIndex] || defaultHorizon;
  const currentProb = toPct(currentHorizon.probability, (scenario.attackProbability || 0) * 100);

  const chartData = horizons.map((h, i) => {
    const probPct = toPct(h.probability, (scenario.attackProbability || 0) * 100);
    const lowPct = h.lowerBound !== undefined ? toPct(h.lowerBound) : Math.max(0, probPct - 5);
    const highPct = h.upperBound !== undefined ? toPct(h.upperBound) : Math.min(100, probPct + 5);
    return {
      name: h.stepLabel,
      minutes: h.horizonMinutes,
      probability: probPct,
      lowerBound: lowPct,
      upperBound: highPct,
      stage: h.projectedStage,
      isCurrent: i === activeHorizonIndex,
      isPast: i < activeHorizonIndex
    };
  });

  const togglePlay = () => {
    play('click');
    setIsPlaying(!isPlaying);
  };

  const handleStep = (index: number) => {
    play('click');
    setIsPlaying(false);
    setActiveHorizonIndex(index);
  };

  return (
    <div className={cn('glass-panel rounded-2xl p-5 border border-border-default/60 space-y-4 relative overflow-hidden', className)}>
      {/* Background ambient glow based on threat level */}
      <div 
        className={cn(
          'absolute -right-24 -top-24 w-80 h-80 rounded-full blur-[100px] pointer-events-none transition-all duration-700 opacity-20',
          currentProb > 70 ? 'bg-critical-500' : currentProb > 40 ? 'bg-amber-500' : 'bg-electric-500'
        )} 
      />

      {/* Header & Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 relative z-10">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-electric-400 animate-ping" />
            <h3 className="text-body font-display font-semibold text-text-primary flex items-center gap-2">
              World Model Forward Simulation: <span className="text-electric-400 font-mono">P(S_{'{t+k}'} | S_t)</span>
            </h3>
          </div>
          <p className="text-caption text-text-muted mt-0.5">
            Learned state transition dynamics projecting future infiltration probability across temporal horizons
          </p>
        </div>

        {/* Playback & Step Controls */}
        <div className="flex items-center gap-2 bg-surface-900/80 p-1.5 rounded-xl border border-border-subtle backdrop-blur-md">
          <button
            type="button"
            onClick={togglePlay}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-caption font-medium transition-all',
              isPlaying ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'bg-electric-500/20 text-electric-300 hover:bg-electric-500/30'
            )}
          >
            {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-current" />}
            <span>{isPlaying ? 'Pause' : 'Simulate Rollout'}</span>
          </button>

          <button
            type="button"
            onClick={() => handleStep((activeHorizonIndex + 1) % scenario.horizons.length)}
            className="p-1.5 text-text-muted hover:text-text-primary rounded-lg hover:bg-surface-800 transition-colors"
            title="Step forward +5 min"
          >
            <FastForward className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => handleStep(0)}
            className="p-1.5 text-text-muted hover:text-text-primary rounded-lg hover:bg-surface-800 transition-colors"
            title="Reset to current observation S(t)"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Horizon Step Badges */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 relative z-10">
        {scenario.horizons.map((h, index) => {
          const isSelected = index === activeHorizonIndex;
          const hProbPct = toPct(h.probability, 0);
          const isElevated = hProbPct > 70;
          return (
            <button
              key={h.stepLabel}
              type="button"
              onClick={() => handleStep(index)}
              className={cn(
                'relative p-2.5 rounded-xl border text-left transition-all duration-300 flex flex-col justify-between group',
                isSelected
                  ? isElevated
                    ? 'bg-critical-500/15 border-critical-500/50 shadow-glow-critical'
                    : 'bg-electric-500/15 border-electric-500/50 shadow-glow-sm'
                  : 'bg-surface-850/50 border-border-subtle hover:border-border-default hover:bg-surface-800/60'
              )}
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono font-medium text-text-muted">
                  {h.horizonMinutes === 0 ? 'T+0' : `+${h.horizonMinutes}m`}
                </span>
                <span className={cn(
                  'text-[10px] font-bold px-1.5 py-0.5 rounded-full font-mono',
                  hProbPct > 70 ? 'bg-critical-500/20 text-critical-300' : hProbPct > 40 ? 'bg-amber-500/20 text-amber-300' : 'bg-secure-500/20 text-secure-300'
                )}>
                  {hProbPct}%
                </span>
              </div>
              <p className="text-caption font-semibold text-text-primary truncate mt-1">
                {h.projectedStage}
              </p>
              {isSelected && (
                <motion.div
                  layoutId="activeHorizonGlow"
                  className="absolute inset-0 rounded-xl border-2 border-electric-400 pointer-events-none"
                  transition={{ type: 'spring', stiffness: 350, damping: 25 }}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Main Interactive Rollout Chart */}
      <div className="w-full relative z-10" style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 12, right: 16, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="rolloutGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#f43f5e" stopOpacity={0.6} />
                <stop offset="50%" stopColor="#8b5cf6" stopOpacity={0.3} />
                <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.02} />
              </linearGradient>
              <linearGradient id="bandGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#a855f7" stopOpacity={0.25} />
                <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="rgba(148, 163, 184, 0.08)" vertical={false} />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 11, fill: '#94a3b8' }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              domain={[0, 100]}
              tickFormatter={(v) => `${v}%`}
              tick={{ fontSize: 11, fill: '#94a3b8' }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const data = payload[0]?.payload;
                if (!data) return null;
                return (
                  <div className="bg-surface-900/95 border border-border-default rounded-xl p-3 shadow-2xl backdrop-blur-xl space-y-1">
                    <p className="text-caption font-bold text-text-primary">{data.name} (+{data.minutes} min)</p>
                    <p className="text-caption text-electric-400">
                      Infiltration Probability: <span className="font-bold text-white">{data.probability}%</span>
                    </p>
                    <p className="text-[11px] text-text-muted">
                      Confidence Band: {data.lowerBound}% - {data.upperBound}%
                    </p>
                    <p className="text-[11px] text-amber-400">
                      Predicted ATT&CK Stage: {data.stage}
                    </p>
                  </div>
                );
              }}
            />
            <ReferenceLine y={50} stroke="rgba(239, 68, 68, 0.4)" strokeDasharray="3 3" label={{ value: 'Attack Threshold (50%)', fill: '#f87171', fontSize: 10, position: 'insideTopRight' }} />
            
            {/* Confidence Upper/Lower Band */}
            <Area
              type="monotone"
              dataKey="upperBound"
              stroke="transparent"
              fill="url(#bandGradient)"
              fillOpacity={0.6}
            />
            {/* Core Probability Trajectory Line & Area */}
            <Area
              type="monotone"
              dataKey="probability"
              stroke="#f43f5e"
              strokeWidth={3}
              fill="url(#rolloutGradient)"
              activeDot={{ r: 6, fill: '#ff3366', stroke: '#ffffff', strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Latent State Vector Breakdown for Selected Step */}
      <div className="bg-surface-900/70 rounded-xl p-3 border border-border-subtle/80 flex flex-wrap items-center justify-between gap-4 text-caption">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-electric-400" />
          <span className="font-mono text-text-secondary">
            Latent State Vector at <span className="text-white font-bold">{currentHorizon.stepLabel}</span>:
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-4 text-[11px] font-mono">
          <div className="flex items-center gap-1.5">
            <span className="text-text-muted">SYN Ratio:</span>
            <span className="text-critical-300 font-bold">{formatStatePct(currentHorizon.stateVector?.synRate, 75)}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-text-muted">Port Entropy:</span>
            <span className="text-amber-300 font-bold">{formatStatePct(currentHorizon.stateVector?.portEntropy, 80)}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-text-muted">Flow Intensity:</span>
            <span className="text-electric-300 font-bold">{formatStatePct(currentHorizon.stateVector?.flowIntensity, 85)}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-text-muted">Timing Jitter:</span>
            <span className="text-violet-300 font-bold">{formatStatePct(currentHorizon.stateVector?.packetTimingVar, 65)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
