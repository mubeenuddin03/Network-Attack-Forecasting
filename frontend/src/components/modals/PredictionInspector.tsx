import { useState } from 'react';
import { cn, formatTimestamp, formatNumber } from '@/utils/helpers';
import { usePrediction, useCurrentFeatures } from '@/contexts/DashboardContext';
import { useSound } from '@/contexts/SoundContext';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import type { WindowFeatures } from '@/types/api';
import {
  Copy,
  Shield,
  Cpu,
  Target,
  Eye,
  EyeOff,
  Code,
  Database,
} from 'lucide-react';

interface PredictionInspectorProps {
  isOpen: boolean;
  onClose: () => void;
}

export function PredictionInspector({ isOpen, onClose }: PredictionInspectorProps) {
  const prediction = usePrediction();
  const { play } = useSound();
  const currentFeatures = useCurrentFeatures();
  const [showRaw, setShowRaw] = useState(false);

  if (!prediction) return null;

  const probability = prediction.attack_probability;
  const status = prediction.status;
  const threshold = prediction.threshold_used;
  const mode = prediction.mode;
  const isAttackLikely = status === 'ATTACK_LIKELY';
  const features: WindowFeatures = currentFeatures;

  const copyToClipboard = (data: unknown) => {
    navigator.clipboard.writeText(JSON.stringify(data, null, 2));
    play('success');
  };

  const featureGroups: { label: string; keys: (keyof WindowFeatures)[] }[] = [
    { label: 'Flow Counts', keys: ['total_flows', 'tcp_flow_count', 'udp_flow_count'] },
    { label: 'Packet Stats', keys: ['total_packets', 'avg_fwd_packets', 'avg_bwd_packets', 'avg_fwd_iat_mean', 'avg_bwd_iat_mean'] },
    { label: 'Byte Stats', keys: ['total_bytes', 'avg_fwd_bytes', 'avg_bwd_bytes', 'avg_flow_bytes_per_sec', 'avg_flow_packets_per_sec'] },
    { label: 'IP/Port Diversity', keys: ['unique_source_ips', 'unique_dest_ips', 'unique_source_ports', 'unique_dest_ports'] },
    { label: 'Flag Counts', keys: ['syn_count', 'ack_count', 'rst_count', 'fin_count', 'psh_count', 'urg_count'] },
    { label: 'Duration/Size', keys: ['avg_flow_duration', 'max_flow_duration', 'std_flow_duration', 'avg_packet_size', 'max_packet_size', 'min_packet_size', 'std_packet_size'] },
    { label: 'IAT/Activity', keys: ['avg_flow_iat_mean', 'avg_active_mean', 'avg_idle_mean', 'avg_subflow_fwd_pkts', 'avg_subflow_bwd_pkts'] },
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Prediction Inspector"
      description="Detailed prediction payload and model decision breakdown"
      size="xl"
      showCloseButton={true}
    >
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4 flex-wrap">
            <div className={cn('px-4 py-2 rounded-lg border font-mono text-lg font-bold', 
              isAttackLikely ? 'bg-critical-500/15 text-critical-400 border-critical-500/30' : 'bg-secure-500/15 text-secure-400 border-secure-500/30'
            )}>
              {(probability * 100).toFixed(2)}%
            </div>
            <Badge variant={isAttackLikely ? 'error' : 'success'} size="md">{status}</Badge>
            <Badge variant={mode === 'REAL_MODEL' ? 'real-model' : 'demo'} size="md">{mode}</Badge>
            <Badge variant="info" size="md">Threshold: {(threshold * 100).toFixed(0)}%</Badge>
            <Badge variant="info" size="md">Horizon: 5 min</Badge>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => { setShowRaw(!showRaw); play('click'); }} leftIcon={showRaw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}>
              {showRaw ? 'Hide Raw' : 'Show Raw'}
            </Button>
            <Button variant="secondary" size="sm" onClick={() => { copyToClipboard(prediction); play('success'); }} leftIcon={<Copy className="w-4 h-4" />}>
              Copy JSON
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card variant="default" padding="md">
            <h3 className="text-heading-sm text-text-primary mb-3 flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Decision Summary
            </h3>
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-text-muted">Attack Probability</dt>
                <dd className="font-mono font-bold text-text-primary">{(probability * 100).toFixed(2)}%</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-text-muted">Binary Decision</dt>
                <dd className="font-mono font-bold" style={{ color: isAttackLikely ? '#ef4444' : '#22c55e' }}>
                  {prediction.prediction === 1 ? 'ATTACK (1)' : 'NORMAL (0)'}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-text-muted">Threshold Used</dt>
                <dd className="font-mono font-bold text-text-primary">{(threshold * 100).toFixed(2)}%</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-text-muted">Model Mode</dt>
                <dd className="font-mono font-bold text-text-primary">{mode}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-text-muted">Forecast Horizon</dt>
                <dd className="font-mono font-bold text-text-primary">5 minutes</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-text-muted">Prediction Time</dt>
                <dd className="font-mono font-bold text-text-primary">{formatTimestamp(prediction.received_at)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-text-muted">API Latency</dt>
                <dd className="font-mono font-bold text-text-primary">{prediction.latency_ms} ms</dd>
              </div>
            </dl>
          </Card>

          <Card variant="default" padding="md">
            <h3 className="text-heading-sm text-text-primary mb-3 flex items-center gap-2">
              <Target className="w-5 h-5" />
              Confidence Assessment
            </h3>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-caption text-text-muted">Distance from Threshold</span>
                  <span className="text-caption font-mono text-text-primary">
                    {((probability - threshold) * 100).toFixed(2)}%
                  </span>
                </div>
                <div className="h-2 bg-surface-800 rounded-full overflow-hidden">
                  <div 
                    className="h-full rounded-full transition-all duration-500"
                    style={{ 
                      width: `${Math.min(Math.abs(probability - threshold) * 2, 1) * 100}%`,
                      backgroundColor: probability > threshold ? '#ef4444' : '#22c55e'
                    }}
                  />
                </div>
              </div>
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-caption text-text-muted">Confidence Level</span>
                  <span className="text-caption font-mono text-text-primary">
                    {(probability > 0.5 ? probability : 1 - probability) * 200 > 95 ? '95%' : ((probability > 0.5 ? probability : 1 - probability) * 200).toFixed(0)}%
                  </span>
                </div>
              </div>
              <div className="pt-3 border-t border-border-subtle">
                <p className="text-body-sm text-text-secondary">
                  {isAttackLikely 
                    ? 'Probability exceeds threshold — attack conditions detected in current network window. Recommend elevated monitoring and immediate investigation of flagged signals.' 
                    : 'Probability below threshold — network behavior within normal parameters. Continue routine monitoring.'}
                </p>
              </div>
            </div>
          </Card>

          <Card variant="default" padding="md">
            <h3 className="text-heading-sm text-text-primary mb-3 flex items-center gap-2">
              <Cpu className="w-5 h-5" />
              Model Info
            </h3>
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-text-muted">Algorithm</dt>
                <dd className="font-mono text-text-primary">Logistic Regression</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-text-muted">Features</dt>
                <dd className="font-mono text-text-primary">35</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-text-muted">Window Size</dt>
                <dd className="font-mono text-text-primary">5 minutes</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-text-muted">Scaling</dt>
                <dd className="font-mono text-text-primary">StandardScaler</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-text-muted">Training Data</dt>
                <dd className="font-mono text-text-primary">CICIDS2017</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-text-muted">Validation F1</dt>
                <dd className="font-mono text-text-primary">0.857</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-text-muted">Test F1</dt>
                <dd className="font-mono text-text-primary">0.000</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-text-muted">Test Set Size</dt>
                <dd className="font-mono text-text-primary">6 samples</dd>
              </div>
            </dl>
          </Card>
        </div>

        {showRaw && (
          <div className="lg:col-span-3">
            <Card variant="default" padding="md">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-heading-sm text-text-primary flex items-center gap-2">
                  <Code className="w-5 h-5" />
                  Raw Prediction Payload
                </h3>
                <Button variant="ghost" size="sm" onClick={() => { copyToClipboard(prediction); play('success'); }} leftIcon={<Copy className="w-4 h-4" />}>
                  Copy
                </Button>
              </div>
              <pre className="bg-surface-900/50 border border-border-subtle rounded-lg p-4 overflow-x-auto text-[0.7rem] font-mono text-text-secondary max-h-96">
                {JSON.stringify(prediction, null, 2)}
              </pre>
            </Card>
          </div>
        )}

        <div className="lg:col-span-3">
          <Card variant="default" padding="md">
            <h3 className="text-heading-sm text-text-primary mb-3 flex items-center gap-2">
              <Database className="w-5 h-5" />
              Input Features (35 dimensions)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              {featureGroups.map((group) => (
                <div key={group.label} className="p-3 rounded-lg bg-surface-800/50 border border-border-subtle">
                  <p className="text-caption font-medium text-text-muted mb-2">{group.label}</p>
                  <dl className="space-y-1.5 text-sm">
                    {group.keys.map((key) => (
                      <div key={key} className="flex justify-between gap-2">
                        <dt className="text-caption text-text-secondary font-mono truncate">{key}</dt>
                        <dd className="text-caption font-mono text-text-primary text-right whitespace-nowrap">
                          {features?.[key] !== undefined ? formatNumber(features[key]) : 'N/A'}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </Modal>
  );
}