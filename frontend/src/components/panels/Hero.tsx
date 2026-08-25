import { useRef, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { cn, formatPercent, getRiskLevel } from '@/utils/helpers';
import { NetworkTopologyCanvas } from '@/components/visualizations/NetworkTopologyCanvas';
import { ForecastKPICard } from '@/components/panels/KPICards';
import { KPICard } from '@/components/panels/KPICards';
import { usePrediction, useTelemetry, useApiStatus, useDashboardStore } from '@/contexts/DashboardContext';
import { useReducedMotion } from '@/contexts/ReducedMotionContext';
import { Activity, Shield, Zap, Clock, Wifi, WifiOff, Cpu, AlertTriangle } from 'lucide-react';

interface HeroSectionProps {
  className?: string;
}

export function Hero({ className }: HeroSectionProps) {
  const prediction = usePrediction();
  const telemetry = useTelemetry();
  const apiStatus = useApiStatus();
  const modelMode = useDashboardStore(state => state.modelMode);
  const { reducedMotion } = useReducedMotion();
  const [mounted, setMounted] = useState(false);
  const canvasRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const probability = prediction?.attack_probability ?? 0;
  const status = prediction?.status ?? 'NORMAL';
  const threshold = prediction?.threshold_used ?? 0.5;
  const mode = prediction?.mode ?? modelMode;
  const isAttackLikely = status === 'ATTACK_LIKELY';
  const riskLevel = getRiskLevel(probability);

  const statusConfig = {
    connected: { icon: Wifi, label: 'CONNECTED', color: 'text-secure-400' },
    degraded: { icon: Wifi, label: 'DEGRADED', color: 'text-amber-400' },
    offline: { icon: WifiOff, label: 'OFFLINE', color: 'text-critical-400' },
    checking: { icon: Wifi, label: 'CHECKING...', color: 'text-text-muted' },
  };

  const sysStatus = statusConfig[apiStatus];

  return (
    <section
      className={cn(
        'relative pt-16 pb-8 md:pt-20 md:pb-12 px-4 md:px-6 lg:px-8',
        'bg-gradient-to-b from-surface-950 via-surface-900 to-surface-950',
        className
      )}
      aria-labelledby="hero-title"
    >
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(59,130,246,0.04)_0%,_transparent_70%)] pointer-events-none" />
      <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg%20viewBox%3D%220%200%20256%20256%22%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%3E%3Cfilter%20id%3D%22noise%22%3E%3CfeTurbulence%20type%3D%22fractalNoise%22%20baseFrequency%3D%220.9%22%20numOctaves%3D%224%22%20stitchTiles%3D%22stitch%22/%3E%3C/filter%3E%3Crect%20width%3D%22100%25%22%20height%3D%22100%25%22%20filter%3D%22url(%23noise)%22%20opacity%3D%220.02%22/%3E%3C/svg%3E')] pointer-events-none" />

      <div className="relative max-w-[1600px] mx-auto space-y-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: reducedMotion ? 0 : 600, ease: 'easeOut' }}
          className="flex flex-col md:flex-row md:items-end md:justify-between gap-6"
        >
          <div className="space-y-3">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: reducedMotion ? 0 : 500, delay: 100 }}
              className="flex items-center gap-3"
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-electric-500 to-violet-500 flex items-center justify-center">
                <Activity className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 id="hero-title" className="text-display-xl font-display font-bold text-text-primary tracking-tight">
                  Network Attack Forecasting
                </h1>
                <p className="text-body-lg text-text-secondary mt-1">Predicting the next attack window before compromise</p>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: reducedMotion ? 0 : 500, delay: 200 }}
              className="flex flex-wrap items-center gap-4 text-caption"
            >
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface-800/50 border border-border-subtle">
                <sysStatus.icon className={cn('w-4 h-4', sysStatus.color)} />
                <span className="font-medium">{sysStatus.label}</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface-800/50 border border-border-subtle">
                <Cpu className="w-4 h-4 text-text-muted" />
                <span className="font-medium">{mode === 'REAL_MODEL' ? 'REAL MODEL' : 'DEMO MODE'}</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface-800/50 border border-border-subtle">
                <Clock className="w-4 h-4 text-text-muted" />
                <span className="font-medium">5-min Forecast Horizon</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface-800/50 border border-border-subtle">
                <Shield className={cn('w-4 h-4', isAttackLikely ? 'text-critical-400' : 'text-secure-400')} />
                <span className={cn('font-medium', isAttackLikely ? 'text-critical-400' : 'text-secure-400')}>
                  {isAttackLikely ? 'ATTACK LIKELY' : 'NORMAL'}
                </span>
              </div>
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: reducedMotion ? 0 : 600, delay: 300 }}
            className="flex-1 max-w-md mx-auto md:mx-0"
          >
            <ForecastKPICard
              probability={probability}
              status={status}
              threshold={threshold}
              mode={mode}
              forecastHorizon={5}
            />
          </motion.div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: reducedMotion ? 0 : 600, delay: 400 }}
          className="glass-panel-strong rounded-2xl overflow-hidden"
        >
          <div className="relative aspect-[16/9] min-h-[300px] max-h-[400px]">
            <NetworkTopologyCanvas
              width={canvasRef.current?.offsetWidth || 800}
              height={300}
              attackProbability={probability}
              isAttackLikely={isAttackLikely}
              nodeCount={mounted ? 100 : 0}
            />
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="text-center p-8">
                <div className="text-display-sm font-display font-bold text-text-primary mb-2">
                  {(probability * 100).toFixed(1)}%
                </div>
                <div className="text-body text-text-muted">Current Attack Risk</div>
              </div>
            </div>
          </div>
          <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-surface-950/90 to-transparent border-t border-border-subtle">
            <div className="flex flex-wrap items-center justify-center gap-6 text-caption">
              <span className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-electric-400" />
                Normal Traffic
              </span>
              <span className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-amber-400" />
                Suspicious Activity
              </span>
              <span className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-critical-400" />
                Attack Indicators
              </span>
              <span className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full border-2 border-secure-400" />
                Critical Assets
              </span>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: reducedMotion ? 0 : 500, delay: 500 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4"
        >
          <KPICard
            title="Network Activity"
            value={telemetry?.total_flows ? formatPercent(telemetry.total_flows / 5000) : '--'}
            subtitle={`${telemetry?.total_flows || 0} flows / 5min`}
            icon={<Zap className="w-5 h-5" />}
            sparklineData={generateMockSparkline(0.3, 0.8)}
            sparklineColor="electric"
          />
          <KPICard
            title="Active Flows"
            value={telemetry?.total_flows?.toLocaleString() || '--'}
            subtitle={`TCP: ${telemetry?.tcp_flow_count || 0} • UDP: ${telemetry?.udp_flow_count || 0}`}
            icon={<Activity className="w-5 h-5" />}
            sparklineData={generateMockSparkline(0.4, 0.9)}
            sparklineColor="violet"
          />
          <KPICard
            title="Risk Level"
            value={riskLevel.level}
            subtitle={`Threshold: ${(threshold * 100).toFixed(0)}%`}
            icon={<AlertTriangle className="w-5 h-5" />}
            variant={isAttackLikely ? 'alert' : 'default'}
            sparklineData={generateMockSparkline(0.1, probability)}
            sparklineColor={isAttackLikely ? 'critical' : 'secure'}
          />
          <KPICard
            title="Forecast Horizon"
            value={`${5} min`}
            subtitle="Next attack window"
            icon={<Clock className="w-5 h-5" />}
            sparklineData={generateMockSparkline(0, 0.5)}
            sparklineColor="amber"
          />
        </motion.div>
      </div>
    </section>
  );
}

function generateMockSparkline(min: number, max: number, points: number = 20): number[] {
  return Array.from({ length: points }, (_, i) => min + (max - min) * (0.5 + 0.5 * Math.sin(i * 0.5) + Math.random() * 0.2));
}
