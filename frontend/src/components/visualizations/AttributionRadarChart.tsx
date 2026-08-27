import { useState } from 'react';
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  CartesianGrid
} from 'recharts';
import { BrainCircuit, BarChart3, Radar as RadarIcon } from 'lucide-react';
import { cn } from '@/utils/helpers';
import { useSound } from '@/contexts/SoundContext';
import type { AttackScenario } from '@/utils/simulationPresets';

interface AttributionRadarChartProps {
  scenario: AttackScenario;
  height?: number;
  className?: string;
}

export function AttributionRadarChart({ scenario, height = 320, className }: AttributionRadarChartProps) {
  const { play } = useSound();
  const [viewMode, setViewMode] = useState<'radar' | 'bar'>('radar');
  const attribution = scenario.attentionAttribution && scenario.attentionAttribution.length > 0 ? scenario.attentionAttribution : [];

  const radarData = attribution.map((item) => ({
    feature: item.label,
    weight: Math.round(item.weight * 100),
    fullMark: 100,
    impact: item.impact,
    observed: item.observedVal,
    baseline: item.baselineVal,
  }));

  const barData = attribution.map((item) => ({
    name: item.label,
    value: Math.round(item.weight * 100),
    impact: item.impact,
    observed: item.observedVal,
    baseline: item.baselineVal
  }));

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'critical': return '#ef4444';
      case 'high': return '#f59e0b';
      case 'medium': return '#3b82f6';
      default: return '#22c55e';
    }
  };

  return (
    <div className={cn('glass-panel rounded-2xl p-5 border border-border-default/60 space-y-4 font-sans', className)}>
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <BrainCircuit className="w-4 h-4 text-electric-400" />
            <h3 className="text-body font-semibold text-text-primary">
              Attention &amp; Feature Attribution (Explainability)
            </h3>
          </div>
          <p className="text-caption text-text-muted mt-0.5">
            Temporal attention weights &amp; SHAP contributions identifying drivers of the state transition
          </p>
        </div>

        {/* View Toggle */}
        <div className="flex items-center bg-surface-900 p-1 rounded-lg border border-border-subtle">
          <button
            type="button"
            onClick={() => {
              play('click');
              setViewMode('radar');
            }}
            className={cn(
              'flex items-center gap-1 px-2.5 py-1 rounded text-caption font-medium transition-all',
              viewMode === 'radar' ? 'bg-electric-500/20 text-electric-300' : 'text-text-muted hover:text-text-primary'
            )}
          >
            <RadarIcon className="w-3.5 h-3.5" />
            <span>Radar</span>
          </button>
          <button
            type="button"
            onClick={() => {
              play('click');
              setViewMode('bar');
            }}
            className={cn(
              'flex items-center gap-1 px-2.5 py-1 rounded text-caption font-medium transition-all',
              viewMode === 'bar' ? 'bg-electric-500/20 text-electric-300' : 'text-text-muted hover:text-text-primary'
            )}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Impact Bar</span>
          </button>
        </div>
      </div>

      {/* Visual Chart */}
      <div className="w-full" style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          {viewMode === 'radar' ? (
            <RadarChart
              cx="50%"
              cy="50%"
              outerRadius="68%"
              data={radarData}
              margin={{ top: 16, right: 36, bottom: 16, left: 36 }}
            >
              <PolarGrid stroke="rgba(148, 163, 184, 0.15)" strokeDasharray="3 3" />
              <PolarAngleAxis
                dataKey="feature"
                tick={{ fill: '#e2e8f0', fontSize: 11, fontFamily: 'Inter, sans-serif' }}
              />
              <PolarRadiusAxis
                angle={30}
                domain={[0, 100]}
                tick={{ fill: '#94a3b8', fontSize: 9, fontFamily: 'Inter, sans-serif' }}
              />
              <Radar
                name="Attention Weight"
                dataKey="weight"
                stroke="#a855f7"
                strokeWidth={2}
                fill="#8b5cf6"
                fillOpacity={0.55}
                dot={{ r: 3, fill: '#ffffff', stroke: '#a855f7' }}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const item = payload[0]?.payload;
                  if (!item) return null;
                  return (
                    <div className="bg-surface-900/95 border border-border-default rounded-xl p-3 shadow-2xl backdrop-blur-xl space-y-1 font-sans">
                      <p className="text-caption font-bold text-text-primary">{item.feature}</p>
                      <p className="text-caption text-violet-400">
                        Attention Weight: <span className="font-bold text-white">{item.weight}%</span>
                      </p>
                      <p className="text-[11px] text-text-muted">
                        Observed: <span className="text-amber-300 font-semibold">{item.observed}</span> (Baseline: {item.baseline})
                      </p>
                    </div>
                  );
                }}
              />
            </RadarChart>
          ) : (
            <BarChart
              layout="vertical"
              data={barData}
              margin={{ top: 8, right: 24, left: 60, bottom: 8 }}
            >
              <CartesianGrid stroke="rgba(148, 163, 184, 0.08)" horizontal={false} />
              <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10, fill: '#94a3b8', fontFamily: 'Inter, sans-serif' }} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: '#e2e8f0', fontFamily: 'Inter, sans-serif' }} width={130} />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const item = payload[0]?.payload;
                  if (!item) return null;
                  return (
                    <div className="bg-surface-900/95 border border-border-default rounded-xl p-3 shadow-2xl backdrop-blur-xl space-y-1 font-sans">
                      <p className="text-caption font-bold text-text-primary">{item.name}</p>
                      <p className="text-caption text-electric-400">
                        Contribution: <span className="font-bold text-white">{item.value}%</span>
                      </p>
                      <p className="text-[11px] text-text-muted">
                        Observed: <span className="text-amber-300 font-semibold">{item.observed}</span>
                      </p>
                    </div>
                  );
                }}
              />
              <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                {barData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={getImpactColor(entry.impact)} />
                ))}
              </Bar>
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>

      {/* Feature Attribution Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 pt-2">
        {scenario.attentionAttribution.map((item) => (
          <div
            key={item.feature}
            className="p-2.5 rounded-xl bg-surface-900/60 border border-border-subtle/80 flex items-center justify-between gap-3 text-caption"
          >
            <div className="min-w-0 flex-1">
              <p className="font-medium text-text-primary truncate">{item.label}</p>
              <p className="text-[11px] text-text-muted truncate">
                Obs: <span className="text-amber-300 font-semibold">{item.observedVal}</span>
              </p>
            </div>
            <div className="text-right">
              <span className={cn(
                'text-[10px] font-bold px-2 py-0.5 rounded-full',
                item.impact === 'critical' ? 'bg-critical-500/20 text-critical-300' :
                item.impact === 'high' ? 'bg-amber-500/20 text-amber-300' : 'bg-electric-500/20 text-electric-300'
              )}>
                {(item.weight * 100).toFixed(0)}%
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
