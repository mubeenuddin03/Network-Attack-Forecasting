import { useMemo } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  ReferenceLine
} from 'recharts';
import { cn, formatTimestamp } from '@/utils/helpers';
import type { RiskTimelineData } from '@/types/dashboard';

interface AreaForecastChartProps {
  data: RiskTimelineData | null;
  height?: number;
  className?: string;
  showLegend?: boolean;
}

interface ChartPoint {
  step: number;
  label: string;
  timeStr: string;
  riskScore: number;
  observed: number | null;
  forecast: number | null;
  upper: number | null;
  lower: number | null;
  isForecast: boolean;
}

export function AreaForecastChart({
  data,
  height = 320,
  className,
  showLegend = true,
}: AreaForecastChartProps) {
  const chartData = useMemo<ChartPoint[]>(() => {
    if (!data || !data.points || data.points.length === 0) return [];

    const points = data.points;
    const firstForecastIndex = points.findIndex((p) => p.is_forecast);

    return points.map((p, i) => {
      const isForecast = p.is_forecast;
      const isBridge = firstForecastIndex > 0 && i === firstForecastIndex - 1;

      return {
        step: i,
        label: formatTimestamp(p.timestamp),
        timeStr: new Date(p.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        riskScore: p.risk_score,
        observed: !isForecast || isBridge ? p.risk_score : null,
        forecast: isForecast || isBridge ? p.risk_score : null,
        upper: isForecast ? (p.upper_bound ?? Math.min(1.0, p.risk_score + 0.08)) : null,
        lower: isForecast ? (p.lower_bound ?? Math.max(0.0, p.risk_score - 0.08)) : null,
        isForecast
      };
    });
  }, [data]);

  if (!data || chartData.length === 0) {
    return (
      <div
        className={cn('flex items-center justify-center text-text-muted bg-surface-900/40 rounded-xl border border-border-subtle', className)}
        style={{ height }}
      >
        No risk timeline data available
      </div>
    );
  }

  const threshold = data.threshold ?? 0.5;

  return (
    <div className={cn('w-full flex flex-col', className)} style={{ height, minHeight: height }}>
      <div className="flex-1 w-full min-h-0" style={{ height: '100%', minHeight: height }}>
        <ResponsiveContainer width="100%" height="100%" minHeight={height - 20}>
          <AreaChart data={chartData} margin={{ top: 12, right: 16, left: -14, bottom: 4 }}>
            <defs>
              <linearGradient id="gObservedRisk" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.4} />
                <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.02} />
              </linearGradient>
              <linearGradient id="gForecastRisk" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#a855f7" stopOpacity={0.45} />
                <stop offset="100%" stopColor="#a855f7" stopOpacity={0.03} />
              </linearGradient>
              <linearGradient id="gConfidenceBand" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#6366f1" stopOpacity={0.25} />
                <stop offset="100%" stopColor="#6366f1" stopOpacity={0.02} />
              </linearGradient>
            </defs>

            <CartesianGrid stroke="rgba(148, 163, 184, 0.08)" strokeDasharray="3 3" vertical={false} />

            <XAxis
              dataKey="timeStr"
              tick={{ fontSize: 11, fill: '#94a3b8', fontFamily: 'Inter, sans-serif' }}
              tickLine={false}
              axisLine={{ stroke: 'rgba(148, 163, 184, 0.15)' }}
              minTickGap={24}
            />

            <YAxis
              domain={[0, 1]}
              ticks={[0, 0.25, 0.5, 0.75, 1]}
              tickFormatter={(v: number) => `${Math.round(v * 100)}%`}
              tick={{ fontSize: 11, fill: '#94a3b8', fontFamily: 'Inter, sans-serif' }}
              tickLine={false}
              axisLine={{ stroke: 'rgba(148, 163, 184, 0.15)' }}
            />

            <ReferenceLine
              y={threshold}
              stroke="#ef4444"
              strokeDasharray="4 4"
              strokeWidth={1.5}
              label={{
                value: `Alert Threshold (${Math.round(threshold * 100)}%)`,
                position: 'insideTopLeft',
                fill: '#f87171',
                fontSize: 11,
                fontFamily: 'Inter, sans-serif'
              }}
            />

            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const point = payload[0]?.payload as ChartPoint;
                if (!point) return null;

                return (
                  <div className="bg-surface-900/95 border border-border-default rounded-xl p-3 shadow-2xl backdrop-blur-md text-caption space-y-1 font-sans">
                    <p className="font-semibold text-text-primary">
                      {point.label} {point.isForecast ? '(Forecast Horizon)' : '(Observed Telemetry)'}
                    </p>
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-electric-400" />
                      <span className="text-text-muted">Infiltration Risk:</span>
                      <span className="font-bold text-white">{(point.riskScore * 100).toFixed(1)}%</span>
                    </div>
                    {point.isForecast && point.upper !== null && point.lower !== null && (
                      <p className="text-[11px] text-text-muted">
                        95% CI: <span className="text-violet-300">{(point.lower * 100).toFixed(0)}% – {(point.upper * 100).toFixed(0)}%</span>
                      </p>
                    )}
                  </div>
                );
              }}
            />

            {/* Upper Confidence Band */}
            <Area
              type="monotone"
              dataKey="upper"
              stroke="none"
              fill="url(#gConfidenceBand)"
              name="95% Confidence Band"
              connectNulls
            />

            {/* Observed Area & Line */}
            <Area
              type="monotone"
              dataKey="observed"
              stroke="#3b82f6"
              strokeWidth={2.5}
              fill="url(#gObservedRisk)"
              name="Observed Telemetry"
              connectNulls
            />

            {/* Forecast Trajectory Line */}
            <Line
              type="monotone"
              dataKey="forecast"
              stroke="#a855f7"
              strokeWidth={2.5}
              strokeDasharray="5 5"
              dot={{ r: 3, fill: '#a855f7', strokeWidth: 1, stroke: '#ffffff' }}
              name="World Model Forecast"
              connectNulls
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {showLegend && (
        <div className="mt-3 pt-2 border-t border-border-subtle flex flex-wrap items-center justify-between gap-3 text-caption text-text-muted font-sans">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-electric-500" />
              <span className="text-text-secondary font-medium">Observed Windows</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-violet-500" />
              <span className="text-text-secondary font-medium">Forward Rollout ($T+5m \dots T+20m$)</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-500/50" />
              <span>95% Confidence Bound</span>
            </span>
          </div>

          <span className="text-[11px] text-text-muted">
            Continuous 5-minute causal sliding dynamics
          </span>
        </div>
      )}
    </div>
  );
}
