import { motion } from 'framer-motion';
import { cn, getRiskLevel } from '@/utils/helpers';
import { usePrediction, useTelemetry, useThreshold, useDashboardStore } from '@/contexts/DashboardContext';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import {
  AlertTriangle,
  CheckCircle,
  Shield,
  Target,
  Eye,
  Clock,
  BarChart2,
} from 'lucide-react';

interface SignalIndicator {
  label: string;
  value: number;
  threshold: number;
  unit: string;
  status: 'normal' | 'elevated' | 'critical';
}

export function AttackForecastCard() {
  const prediction = usePrediction();
  const telemetry = useTelemetry();
  const threshold = useThreshold();

  if (!prediction) {
    return (
      <Card variant="elevated" className="h-[320px]">
        <CardContent className="h-full flex items-center justify-center">
          <div className="text-center text-text-muted">
            <Shield className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>Loading forecast...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const probability = prediction.attack_probability;
  const status = prediction.status;
  const mode = prediction.mode;
  const isAttackLikely = status === 'ATTACK_LIKELY';
  const riskLevel = getRiskLevel(probability);

  const riskColors = {
    CRITICAL: { primary: 'text-critical-400', bg: 'bg-critical-500/15', border: 'border-critical-500/30', glow: 'glow-critical' },
    HIGH: { primary: 'text-amber-400', bg: 'bg-amber-500/15', border: 'border-amber-500/30', glow: 'glow-amber' },
    ELEVATED: { primary: 'text-amber-400', bg: 'bg-amber-500/15', border: 'border-amber-500/30', glow: 'glow-amber' },
    LOW: { primary: 'text-electric-400', bg: 'bg-electric-500/15', border: 'border-electric-500/30', glow: 'glow-sm' },
    MINIMAL: { primary: 'text-secure-400', bg: 'bg-secure-500/15', border: 'border-secure-500/30', glow: 'glow-secure' },
  };

  const colors = riskColors[riskLevel.level];

  const signals: SignalIndicator[] = telemetry ? [
    { 
      label: 'SYN Rate per Flow', 
      value: telemetry.syn_rate, 
      threshold: 2.0, 
      unit: '', 
      status: telemetry.syn_rate > 3 ? 'critical' : telemetry.syn_rate > 2 ? 'elevated' : 'normal' 
    },
    { 
      label: 'Port Diversity Index', 
      value: telemetry.port_diversity, 
      threshold: 0.3, 
      unit: '', 
      status: telemetry.port_diversity > 0.5 ? 'critical' : telemetry.port_diversity > 0.3 ? 'elevated' : 'normal' 
    },
    { 
      label: 'Flow Intensity', 
      value: telemetry.flow_rate_per_sec, 
      threshold: 10, 
      unit: '/sec', 
      status: telemetry.flow_rate_per_sec > 20 ? 'critical' : telemetry.flow_rate_per_sec > 10 ? 'elevated' : 'normal' 
    },
    { 
      label: 'URG Flag Count', 
      value: telemetry.urg_count, 
      threshold: 5, 
      unit: '', 
      status: telemetry.urg_count > 10 ? 'critical' : telemetry.urg_count > 5 ? 'elevated' : 'normal' 
    },
    { 
      label: 'Packet Rate', 
      value: telemetry.packet_rate_per_sec, 
      threshold: 500, 
      unit: '/sec', 
      status: telemetry.packet_rate_per_sec > 1000 ? 'critical' : telemetry.packet_rate_per_sec > 500 ? 'elevated' : 'normal' 
    },
    { 
      label: 'TCP/UDP Ratio', 
      value: telemetry.tcp_udp_ratio, 
      threshold: 100, 
      unit: '', 
      status: telemetry.tcp_udp_ratio > 200 ? 'elevated' : 'normal' 
    },
  ] : [];

  const handleInspect = () => {
    useDashboardStore.getState().addToast({
      type: 'info',
      title: 'Prediction Inspector',
      message: 'Opening detailed prediction view...',
    });
  };

  return (
    <Card variant="elevated" className={cn('overflow-hidden', colors.border, colors.glow)}>
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <div>
          <CardTitle>Attack Forecast Decision</CardTitle>
          <p className="text-body-sm text-text-muted mt-1">
            SOC-style threat assessment for the next 5-minute window
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={mode === 'REAL_MODEL' ? 'real-model' : 'demo'} size="sm">{mode}</Badge>
          <Button variant="ghost" size="sm" onClick={handleInspect} leftIcon={<Eye className="w-4 h-4" />}>
            Inspect
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-baseline gap-3">
                  <motion.span
                    initial={false}
                    animate={{ scale: isAttackLikely ? 1.05 : 1 }}
                    transition={{ duration: 500 }}
                    className={cn('font-display font-bold', colors.primary)}
                    style={{ fontSize: 'clamp(3rem, 5vw, 4rem)', lineHeight: 1 }}
                  >
                    {(probability * 100).toFixed(1)}%
                  </motion.span>
                  <span className={cn('px-3 py-1.5 rounded-full text-caption font-semibold uppercase tracking-wider border', colors.bg, colors.primary, colors.border)}>
                    {riskLevel.level}
                  </span>
                </div>
                <p className={cn('text-heading-md font-semibold mt-2', isAttackLikely ? 'text-critical-400' : 'text-secure-400')}>
                  {isAttackLikely ? 'ATTACK LIKELY' : 'NORMAL OPERATIONS'}
                </p>
              </div>
              <div className="text-right">
                <p className="text-caption text-text-muted">Decision Threshold</p>
                <p className="text-heading-sm font-display font-bold text-text-primary">{(threshold * 100).toFixed(0)}%</p>
              </div>
            </div>

            <div className="h-3 bg-surface-800 rounded-full overflow-hidden relative">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(probability, 1) * 100}%` }}
                transition={{ duration: 800, ease: [0.34, 1.56, 0.64, 1] }}
                className="h-full rounded-full relative"
                style={{ background: `linear-gradient(90deg, ${colors.primary}, ${colors.primary}cc)` }}
              >
                <div className="absolute right-0 top-0 bottom-0 w-4 bg-gradient-to-r from-transparent to-white/20" />
              </motion.div>
              <div
                className="absolute top-0 bottom-0 w-1 bg-white/50 transform -translate-x-1/2"
                style={{ left: `${Math.min(threshold, 1) * 100}%` }}
                title={`Threshold: ${(threshold * 100).toFixed(0)}%`}
              />
            </div>

            <div className="flex flex-wrap items-center gap-4 text-caption text-text-muted pt-4 border-t border-border-subtle">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: colors.primary }} />
                Current Risk
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-white/30" />
                Threshold
              </span>
              <span className="flex items-center gap-1.5 ml-auto" style={{ color: mode === 'REAL_MODEL' ? '#3b82f6' : '#8b5cf6' }}>
                {mode === 'REAL_MODEL' ? <CheckCircle className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                {mode === 'REAL_MODEL' ? 'Trained Logistic Regression' : 'Heuristic Demo Mode'}
              </span>
            </div>

            <div className="space-y-3">
              <p className="text-caption text-text-muted">Key Observed Signals</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {signals.map((signal) => (
                  <motion.div
                    key={signal.label}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 300, delay: 200 }}
                    className={cn(
                      'p-3 rounded-lg border transition-colors',
                      signal.status === 'critical' ? 'border-critical-500/30 bg-critical-500/10' :
                      signal.status === 'elevated' ? 'border-amber-500/30 bg-amber-500/10' :
                      'border-border-subtle bg-surface-800/50'
                    )}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-caption font-medium text-text-secondary">{signal.label}</p>
                      <span className={cn('text-caption font-mono font-medium', 
                        signal.status === 'critical' ? 'text-critical-400' :
                        signal.status === 'elevated' ? 'text-amber-400' :
                        'text-secure-400'
                      )}>
                        {signal.value.toFixed(signal.unit === '/sec' ? 1 : 2)}{signal.unit}
                      </span>
                    </div>
                    <div className="h-2 bg-surface-800 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(signal.value / Math.max(signal.threshold * 2, 1), 1) * 100}%` }}
                        transition={{ duration: 600, ease: [0.34, 1.56, 0.64, 1] }}
                        className="h-full rounded-full"
                        style={{ 
                          backgroundColor: signal.status === 'critical' ? '#ef4444' :
                                         signal.status === 'elevated' ? '#f59e0b' : '#22c55e' 
                        }}
                      />
                    </div>
                    <p className="text-caption text-text-muted mt-1">
                      Threshold: {signal.threshold}{signal.unit} • {signal.status}
                    </p>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-surface-800/50 border border-border-subtle">
              <p className="text-caption text-text-muted mb-2">Forecast Window</p>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-electric-500/15 flex items-center justify-center text-electric-400">
                  <Clock className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-heading-md font-display font-bold text-text-primary">5 min</p>
                  <p className="text-caption text-text-muted">Next attack window</p>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-surface-800/50 border border-border-subtle">
              <p className="text-caption text-text-muted mb-2">Model Confidence</p>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: colors.bg.replace('bg-', ''), border: '1px solid', borderColor: colors.border.replace('border-', '') }}>
                  <Target className={cn('w-6 h-6', colors.primary)} />
                </div>
                <div>
                  <p className="text-heading-md font-display font-bold" style={{ color: colors.primary.replace('text-', '') }}>
                    {(probability > threshold ? probability : 1 - probability) * 100 > 95 ? '95%' : ((probability > threshold ? probability : 1 - probability) * 200).toFixed(0)}%
                  </p>
                  <p className="text-caption text-text-muted">{isAttackLikely ? 'High confidence in attack' : 'High confidence in normal'}</p>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-surface-800/50 border border-border-subtle">
              <p className="text-caption text-text-muted mb-2">Last Updated</p>
              <p className="text-body font-mono text-text-primary">{new Date(prediction.received_at).toLocaleTimeString('en-US', { hour12: false })}</p>
            </div>

            <Button className="w-full" leftIcon={<BarChart2 className="w-4 h-4" />} onClick={handleInspect}>
              Open Prediction Inspector
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}