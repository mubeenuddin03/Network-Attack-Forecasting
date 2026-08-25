import { motion } from 'framer-motion';
import { cn } from '@/utils/helpers';
import { usePrediction, useTelemetry, useDefenderFocus } from '@/contexts/DashboardContext';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import {
  AlertTriangle,
  CheckCircle,
  Target,
  LineChart,
  Zap,
  Search,
  Flag,
} from 'lucide-react';

const MITRE_TECHNIQUES = [
  { id: 'T1590', name: 'Active Scanning', phase: 'Reconnaissance', confidence: 0.85 },
  { id: 'T1595', name: 'Active Scanning', phase: 'Reconnaissance', confidence: 0.72 },
  { id: 'T1046', name: 'Network Service Discovery', phase: 'Discovery', confidence: 0.68 },
  { id: 'T1069', name: 'Permission Groups Discovery', phase: 'Discovery', confidence: 0.45 },
];

const ATTACK_STAGES = [
  { stage: 'Reconnaissance', label: 'Scanning & Enumeration', mitre: 'TA0043' },
  { stage: 'Initial Access', label: 'Exploit Public-Facing App', mitre: 'T1190' },
  { stage: 'Execution', label: 'Command & Script Interpreter', mitre: 'T1059' },
  { stage: 'Persistence', label: 'Create Account', mitre: 'T1136' },
  { stage: 'Defense Evasion', label: 'Impair Defenses', mitre: 'T1562' },
  { stage: 'Lateral Movement', label: 'Remote Services', mitre: 'T1021' },
  { stage: 'Collection', label: 'Data from Local System', mitre: 'T1005' },
  { stage: 'Exfiltration', label: 'Exfiltration Over C2', mitre: 'T1041' },
];

export function AttackIntelligencePanel() {
  const prediction = usePrediction();
  const telemetry = useTelemetry();
  const defenderFocus = useDefenderFocus();

  const probability = prediction?.attack_probability ?? 0;
  const isAttackLikely = prediction?.status === 'ATTACK_LIKELY';

  const getStageProgress = (stageIndex: number): number => {
    if (!isAttackLikely) return stageIndex === 0 ? 0.3 : 0;
    if (probability >= 0.8) return 1;
    if (probability >= 0.6) return stageIndex <= 2 ? 1 : stageIndex === 3 ? 0.5 : 0;
    if (probability >= 0.4) return stageIndex <= 1 ? 1 : stageIndex === 2 ? 0.5 : 0;
    return stageIndex === 0 ? 0.5 : 0;
  };

  const getStageStatus = (stageIndex: number): 'completed' | 'active' | 'pending' => {
    const progress = getStageProgress(stageIndex);
    if (progress >= 1) return 'completed';
    if (progress > 0) return 'active';
    return 'pending';
  };

  return (
    <section className="space-y-6" aria-labelledby="intelligence-title">
      <div className="flex items-center justify-between">
        <h2 id="intelligence-title" className="text-heading-lg font-semibold text-text-primary">Attack Intelligence</h2>
        <Badge variant={isAttackLikely ? 'error' : 'success'} size="sm">
          {isAttackLikely ? 'ELEVATED THREAT' : 'BASELINE'}
        </Badge>
      </div>

      <Card variant="elevated">
        <CardHeader>
          <CardTitle>Attack Progression Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {ATTACK_STAGES.map((stage, index) => {
              const status = getStageStatus(index);
              const progress = getStageProgress(index);
              const isObserved = index <= 1;
              
              return (
                <motion.div
                  key={stage.stage}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 300, delay: index * 100 }}
                  className="flex items-center gap-4 p-3 rounded-lg hover:bg-surface-800/50 transition-colors"
                >
                  <div className="relative flex items-center justify-center w-10 h-10 flex-shrink-0">
                    <div 
                      className={cn(
                        'w-8 h-8 rounded-full flex items-center justify-center border-2',
                        status === 'completed' ? 'bg-secure-500 border-secure-500' :
                        status === 'active' ? 'bg-amber-500 border-amber-500 animate-pulse' :
                        'bg-surface-700 border-border-default'
                      )}
                    >
                      {status === 'completed' ? <CheckCircle className="w-4 h-4 text-white" /> : <Target className="w-4 h-4 text-text-muted" />}
                    </div>
                    {index < ATTACK_STAGES.length - 1 && (
                      <div className="absolute left-1/2 top-10 w-0.5 h-[calc(100%_-_20px)] bg-border-subtle" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3">
                      <span className="text-caption font-medium text-text-muted w-24 text-right">{stage.mitre}</span>
                      <span className={cn('font-medium', status === 'completed' ? 'text-secure-400' : status === 'active' ? 'text-amber-400' : 'text-text-secondary')}>
                        {stage.stage}
                      </span>
                      <span className="text-body-sm text-text-muted">{stage.label}</span>
                      {!isObserved && (
                        <Badge variant="info" size="sm">FORECAST</Badge>
                      )}
                    </div>
                    <div className="mt-2 h-2 bg-surface-800 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${progress * 100}%` }}
                        transition={{ duration: 600, delay: index * 100 + 200, ease: [0.34, 1.56, 0.64, 1] }}
                        className={cn('h-full rounded-full', 
                          status === 'completed' ? 'bg-secure-500' :
                          status === 'active' ? 'bg-amber-500' :
                          'bg-border-subtle'
                        )}
                      />
                    </div>
                  </div>
                  <div className="text-right w-24">
                    <span className={cn('text-caption font-mono font-medium', 
                      status === 'completed' ? 'text-secure-400' :
                      status === 'active' ? 'text-amber-400' :
                      'text-text-muted'
                    )}>
                      {(progress * 100).toFixed(0)}%
                    </span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card variant="elevated">
          <CardHeader>
            <CardTitle>MITRE ATT&CK Mapping</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {MITRE_TECHNIQUES.map((tech) => (
                <motion.div
                  key={tech.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 300, delay: 100 }}
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-surface-800/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-violet-500/15 flex items-center justify-center text-violet-400">
                      <Flag className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="font-mono text-body-sm font-medium text-text-primary">{tech.id}</p>
                      <p className="text-caption text-text-muted">{tech.name}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-32 h-2 bg-surface-800 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${tech.confidence * 100}%` }}
                        transition={{ duration: 500, delay: 200 }}
                        className="h-full rounded-full bg-violet-500"
                      />
                    </div>
                    <span className="text-caption font-mono text-violet-400 w-10 text-right">
                      {(tech.confidence * 100).toFixed(0)}%
                    </span>
                  </div>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card variant="elevated">
          <CardHeader>
            <CardTitle>Observed vs Forecast</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-surface-800/50 border border-border-subtle">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-8 h-8 rounded-lg bg-electric-500/15 flex items-center justify-center text-electric-400">
                    <Search className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="font-medium text-text-primary">What Happened (Observed)</p>
                    <p className="text-caption text-text-muted">Network behavior in the last 5-minute window</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 ml-11">
                  {(telemetry ? [
                    { label: 'Flows', value: telemetry.total_flows.toLocaleString() },
                    { label: 'SYN Rate', value: telemetry.syn_rate.toFixed(2) },
                    { label: 'Port Div.', value: telemetry.port_diversity.toFixed(2) },
                    { label: 'URG Flags', value: String(telemetry.urg_count) },
                  ] : [
                    { label: 'Flows', value: '--' },
                    { label: 'SYN Rate', value: '--' },
                    { label: 'Port Div.', value: '--' },
                    { label: 'URG Flags', value: '--' },
                  ]).map((item) => (
                    <div key={item.label} className="text-center p-2 rounded bg-surface-900/50">
                      <p className="text-metric-sm font-display font-bold text-text-primary">{item.value}</p>
                      <p className="text-caption text-text-muted">{item.label}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-4 rounded-lg bg-surface-800/50 border border-border-subtle">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-8 h-8 rounded-lg bg-amber-500/15 flex items-center justify-center text-amber-400">
                    <Zap className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="font-medium text-text-primary">What Is Happening (Current)</p>
                    <p className="text-caption text-text-muted">Real-time network state indicators</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 ml-11">
                  {(telemetry ? [
                    { label: 'Packet Rate', value: formatNumber(telemetry.packet_rate_per_sec) + '/s' },
                    { label: 'Byte Rate', value: formatNumber(telemetry.byte_rate_per_sec / 1000) + ' KB/s' },
                    { label: 'Avg Flow Dur', value: telemetry.avg_flow_duration.toFixed(1) + 's' },
                    { label: 'TCP/UDP', value: telemetry.tcp_udp_ratio.toFixed(1) },
                  ] : [
                    { label: 'Packet Rate', value: '--' },
                    { label: 'Byte Rate', value: '--' },
                    { label: 'Avg Flow Dur', value: '--' },
                    { label: 'TCP/UDP', value: '--' },
                  ]).map((item) => (
                    <div key={item.label} className="text-center p-2 rounded bg-surface-900/50">
                      <p className="text-metric-sm font-display font-bold text-text-primary">{item.value}</p>
                      <p className="text-caption text-text-muted">{item.label}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-4 rounded-lg bg-surface-800/50 border border-border-subtle">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: isAttackLikely ? 'rgba(239,68,68,0.15)' : 'rgba(34,197,94,0.15)', color: isAttackLikely ? '#ef4444' : '#22c55e' }}>
                    <LineChart className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="font-medium text-text-primary">What Is Likely Next (Forecast)</p>
                    <p className="text-caption text-text-muted">Predicted attack probability for next 5 minutes</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 ml-11">
                  <div className="flex-1">
                    <div className="h-3 bg-surface-800 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${probability * 100}%` }}
                        transition={{ duration: 800 }}
                        className="h-full rounded-full"
                        style={{ backgroundColor: isAttackLikely ? '#ef4444' : '#22c55e' }}
                      />
                    </div>
                    <p className="text-caption text-text-muted mt-1">
                      {isAttackLikely ? 'Attack conditions forming — elevate monitoring' : 'Normal operations expected to continue'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-heading-md font-display font-bold" style={{ color: isAttackLikely ? '#ef4444' : '#22c55e' }}>
                      {(probability * 100).toFixed(1)}%
                    </p>
                    <p className="text-caption text-text-muted">Next 5 min window</p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {defenderFocus && (
        <Card variant="elevated" className="border-l-4" style={{ borderColor: defenderFocus.state === 'elevated' ? '#ef4444' : defenderFocus.state === 'high_syn' ? '#f59e0b' : '#22c55e' }}>
          <CardHeader>
            <CardTitle>Defender Focus Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-start gap-4">
              <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0',
                defenderFocus.state === 'elevated' ? 'bg-critical-500/15 text-critical-400' :
                defenderFocus.state === 'high_syn' ? 'bg-amber-500/15 text-amber-400' :
                'bg-secure-500/15 text-secure-400'
              )}>
                {defenderFocus.state === 'elevated' ? <AlertTriangle className="w-5 h-5" /> :
                 defenderFocus.state === 'high_syn' ? <Zap className="w-5 h-5" /> :
                 <CheckCircle className="w-5 h-5" />}
              </div>
              <div className="flex-1">
                <p className="text-body font-medium text-text-primary">{defenderFocus.summary}</p>
                <p className="text-caption text-text-muted mt-1">Confidence: {(defenderFocus.confidence * 100).toFixed(0)}%</p>
                <ul className="mt-3 space-y-1">
                  {defenderFocus.details.map((detail, i) => (
                    <li key={i} className="flex items-center gap-2 text-body-sm text-text-secondary">
                      <span className="w-1.5 h-1.5 rounded-full bg-electric-400 flex-shrink-0" />
                      {detail}
                    </li>
                  ))}
                </ul>
                <p className="text-caption text-text-muted mt-2">Based on: {defenderFocus.based_on.join(', ')}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </section>
  );
}

function formatNumber(num: number): string {
  return num >= 1000 ? (num / 1000).toFixed(1) + 'k' : num.toString();
}