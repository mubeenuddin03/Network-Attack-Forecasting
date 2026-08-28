import { motion } from 'framer-motion';
import { Activity, Shield, Clock, AlertTriangle } from 'lucide-react';
import { cn, formatPercent } from '@/utils/helpers';
import { ForecastKPICard } from '@/components/panels/KPICards';
import { KPICard } from '@/components/panels/KPICards';
import { NetworkTopologyCanvas } from '@/components/visualizations/NetworkTopologyCanvas';
import { AreaForecastChart } from '@/components/visualizations/AreaForecastChart';
import { usePrediction, useTelemetry, useRiskTimeline, useDefenderFocus, useApiStatus, useModelMode, useIsLoading, useError } from '@/contexts/DashboardContext';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { HeroSkeleton, ChartSkeleton } from '@/components/ui/Skeleton';

export function Hero() {
  const prediction = usePrediction();
  const telemetry = useTelemetry();
  const riskTimeline = useRiskTimeline();
  const defenderFocus = useDefenderFocus();
  const apiStatus = useApiStatus();
  const modelMode = useModelMode();
  const isLoading = useIsLoading();
  const error = useError();

  const probability = prediction?.attack_probability ?? 0;
  const status = prediction?.status ?? 'NORMAL';
  const threshold = prediction?.threshold_used ?? 0.5;
  const mode = prediction?.mode ?? modelMode;
  const isAttackLikely = status === 'ATTACK_LIKELY';

  const sparklineData = riskTimeline?.points.slice(-20).map(p => p.risk_score) || [];

  if (isLoading && !prediction) {
    return <HeroSkeleton />;
  }

  return (
    <section className="relative pt-16 pb-8 px-4 md:px-6 lg:px-8" aria-labelledby="hero-title">
      <div className="max-w-[1600px] mx-auto space-y-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 600, ease: 'easeOut' }}
          className="flex flex-col md:flex-row md:items-end md:justify-between gap-6"
        >
          <div className="space-y-3">
            <h1 id="hero-title" className="text-display-xl font-display font-bold text-text-primary tracking-tight">
              Network Attack Forecasting
            </h1>
            <p className="text-body-lg text-text-secondary max-w-2xl">
              Predicting the next attack window before compromise
            </p>
            <div className="flex flex-wrap items-center gap-3 mt-4">
              <Badge variant={apiStatus === 'connected' ? 'connected' : apiStatus === 'degraded' ? 'degraded' : 'offline'} dot>
                API {apiStatus.toUpperCase()}
              </Badge>
              <Badge variant={mode === 'REAL_MODEL' ? 'real-model' : 'demo'} dot>
                {mode}
              </Badge>
              <Badge variant="info" dot>
                5-min Horizon
              </Badge>
              {prediction && (
                <Badge variant={isAttackLikely ? 'error' : 'success'} dot>
                  {status.replace('_', ' ')}
                </Badge>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3 md:ml-auto">
            <div className="hidden lg:flex items-center gap-4 px-4 py-2 bg-surface-800/50 rounded-lg border border-border-subtle">
              <Clock className="w-4 h-4 text-text-muted" />
              <span className="text-body-sm font-mono text-text-secondary" id="current-time">
                {new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
            </div>
            {error && (
              <Button variant="secondary" leftIcon={<AlertTriangle className="w-4 h-4" />} className="text-critical-400 border-critical-500/30">
                Retry Connection
              </Button>
            )}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 600, ease: 'easeOut', delay: 100 }}
          className="glass-panel-elevated rounded-2xl overflow-hidden"
          style={{ minHeight: '320px' }}
        >
          <div className="relative h-[320px] md:h-[380px]">
            <NetworkTopologyCanvas
              width={1200}
              height={380}
              attackProbability={probability}
              isAttackLikely={isAttackLikely}
              nodeCount={100}
            />
            <div className="absolute inset-0 flex items-end justify-between p-6 pointer-events-none">
              <div className="pointer-events-auto space-y-2">
                <div className="flex items-center gap-2 bg-surface-950/80 backdrop-blur-sm px-3 py-2 rounded-lg border border-border-subtle">
                  <span className="w-3 h-3 rounded-full bg-electric-400" />
                  <span className="text-caption text-text-secondary">Normal Traffic</span>
                </div>
                <div className="flex items-center gap-2 bg-surface-950/80 backdrop-blur-sm px-3 py-2 rounded-lg border border-border-subtle">
                  <span className="w-3 h-3 rounded-full bg-amber-400" />
                  <span className="text-caption text-text-secondary">Suspicious Activity</span>
                </div>
                <div className="flex items-center gap-2 bg-surface-950/80 backdrop-blur-sm px-3 py-2 rounded-lg border border-border-subtle">
                  <span className="w-3 h-3 rounded-full bg-critical-400 pulse-dot" />
                  <span className="text-caption text-text-secondary">Attack Indicators</span>
                </div>
                <div className="flex items-center gap-2 bg-surface-950/80 backdrop-blur-sm px-3 py-2 rounded-lg border border-border-subtle">
                  <span className="w-3 h-3 rounded-full bg-secure-400" />
                  <span className="text-caption text-text-secondary">Server Nodes</span>
                </div>
              </div>
              <div className="pointer-events-auto text-right space-y-2">
                <div className="bg-surface-950/80 backdrop-blur-sm px-4 py-3 rounded-lg border border-border-subtle text-right">
                  <p className="text-caption text-text-muted">Forecast Confidence</p>
                  <p className="text-heading-md font-display font-bold text-electric-400">
                    {(probability > 0.5 ? (1 - probability) : probability) * 200 > 95 ? '95%' : ((probability > 0.5 ? (1 - probability) : probability) * 200).toFixed(0)}%
                  </p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 600, ease: 'easeOut', delay: 200 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-4"
        >
          <ForecastKPICard
            probability={probability}
            status={status}
            threshold={threshold}
            mode={mode}
            forecastHorizon={5}
            className="md:col-span-2"
          />
          <div className="space-y-4">
            <KPICard
              title="Network Activity"
              value={telemetry ? formatPercent(telemetry.flow_rate_per_sec / 50) : '--'}
              subtitle={`${telemetry?.total_flows || 0} flows / 5min`}
              icon={<Activity className="w-4 h-4" />}
              sparklineData={sparklineData}
              sparklineColor="electric"
            />
            <KPICard
              title="Risk Level"
              value={probability >= 0.8 ? 'CRITICAL' : probability >= 0.6 ? 'HIGH' : probability >= 0.4 ? 'ELEVATED' : probability >= 0.2 ? 'LOW' : 'MINIMAL'}
              subtitle={`Threshold: ${(threshold * 100).toFixed(0)}%`}
              icon={<Shield className="w-4 h-4" />}
              sparklineData={sparklineData}
              sparklineColor={probability >= 0.6 ? 'critical' : probability >= 0.4 ? 'amber' : 'secure'}
              variant={probability >= 0.6 ? 'alert' : 'default'}
            />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 600, ease: 'easeOut', delay: 300 }}
          className="grid grid-cols-1 lg:grid-cols-2 gap-4"
        >
          <Card variant="elevated" className="overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Risk Timeline</CardTitle>
              <Badge variant={riskTimeline?.points[riskTimeline.current_index]?.is_forecast ? 'info' : 'success'} size="sm">
                {riskTimeline?.points[riskTimeline.current_index]?.is_forecast ? 'FORECAST' : 'LIVE'}
              </Badge>
            </CardHeader>
            <CardContent className="p-0">
              {riskTimeline ? (
                <AreaForecastChart data={riskTimeline} height={280} />
              ) : (
                <ChartSkeleton />
              )}
            </CardContent>
          </Card>

          <Card variant="elevated" className="overflow-hidden">
            <CardHeader>
              <CardTitle>Defender Focus</CardTitle>
            </CardHeader>
            <CardContent>
              {defenderFocus ? (
                <div className="space-y-4">
                  <div className={cn('p-4 rounded-lg border-l-4', 
                    defenderFocus.state === 'elevated' ? 'border-critical-500 bg-critical-500/10' :
                    defenderFocus.state === 'high_syn' ? 'border-amber-500 bg-amber-500/10' :
                    'border-secure-500 bg-secure-500/10'
                  )}>
                    <p className="text-body font-medium text-text-primary">{defenderFocus.summary}</p>
                    <p className="text-caption text-text-muted mt-1">Confidence: {(defenderFocus.confidence * 100).toFixed(0)}%</p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-caption text-text-muted">Key Indicators:</p>
                    <ul className="space-y-1">
                      {defenderFocus.details.map((detail, i) => (
                        <li key={i} className="flex items-center gap-2 text-body-sm text-text-secondary">
                          <span className="w-1.5 h-1.5 rounded-full bg-electric-400 flex-shrink-0" />
                          {detail}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="pt-4 border-t border-border-subtle">
                    <p className="text-caption text-text-muted">Based on: {defenderFocus.based_on.join(', ')}</p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-text-muted">
                  <Shield className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>Analyzing network patterns...</p>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </section>
  );
}