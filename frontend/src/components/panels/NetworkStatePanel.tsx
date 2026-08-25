import { motion } from 'framer-motion';
import { cn, formatNumber, formatNumberFull } from '@/utils/helpers';
import { useTelemetry } from '@/contexts/DashboardContext';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { CardSkeleton } from '@/components/ui/Skeleton';
import { Sparkline } from '@/components/visualizations/Sparkline';
import {
  GitBranch,
  Globe,
  Server,
  HardDrive,
  Activity,
  Zap,
  Timer,
  RotateCcw,
  ArrowUpRight,
  ArrowDownRight,
  Hash,
  Link,
  Cpu,
  MemoryStick,
  XCircle,
  CheckCircle,
  AlertTriangle,
} from 'lucide-react';

interface TelemetryCardProps {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: number;
  sparklineData?: number[];
  sparklineColor?: 'electric' | 'violet' | 'amber' | 'critical' | 'secure';
  unit?: string;
  precision?: number;
}

function TelemetryCard({ label, value, icon, trend, sparklineData, sparklineColor = 'electric', unit = '', precision = 0 }: TelemetryCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 400, ease: 'easeOut' }}
      className="glass-panel rounded-xl p-4 hover:border-border-default hover:shadow-glow-sm transition-all duration-300 group"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-electric-500/15 flex items-center justify-center text-electric-400 flex-shrink-0">
              {icon}
            </div>
            <p className="text-caption text-text-muted font-medium truncate">{label}</p>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-metric-sm font-display font-bold text-text-primary">
              {typeof value === 'number' ? (precision > 0 ? value.toFixed(precision) : formatNumber(value)) : value}
            </span>
            {unit && <span className="text-body-sm text-text-muted">{unit}</span>}
            {trend !== undefined && (
              <span className={cn('text-caption font-medium flex items-center gap-1', trend >= 0 ? 'text-secure-400' : 'text-critical-400')}>
                {trend >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                {Math.abs(trend).toFixed(1)}%
              </span>
            )}
          </div>
          {sparklineData && sparklineData.length > 1 && (
            <div className="mt-3 h-8 w-full opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              <Sparkline data={sparklineData} color={sparklineColor} height={8} width={200} />
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function RadialIndicator({ label, value, max = 100, color = 'electric', size = 80, strokeWidth = 6 }: { 
  label: string; 
  value: number; 
  max?: number; 
  color?: 'electric' | 'violet' | 'amber' | 'critical' | 'secure';
  size?: number;
  strokeWidth?: number;
}) {
  const percentage = Math.min(value / max, 1);
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - percentage);

  const colors = {
    electric: '#3b82f6',
    violet: '#8b5cf6',
    amber: '#f59e0b',
    critical: '#ef4444',
    secure: '#22c55e',
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="transform -rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="rgba(148, 163, 184, 0.1)"
            strokeWidth={strokeWidth}
          />
          <motion.circle
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 800, ease: [0.34, 1.56, 0.64, 1] }}
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={colors[color]}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            style={{ strokeDasharray: circumference, filter: `drop-shadow(0 0 4px ${colors[color]})` }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-heading-sm font-display font-bold text-text-primary">
            {(percentage * 100).toFixed(0)}%
          </span>
        </div>
      </div>
      <p className="text-caption text-text-muted text-center">{label}</p>
    </div>
  );
}

export function NetworkStatePanel() {
  const telemetry = useTelemetry();

  if (!telemetry) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1,2,3,4].map(i => <CardSkeleton key={i} />)}
      </div>
    );
  }

  const totalFlows = telemetry.total_flows;
  const totalPackets = telemetry.total_packets;
  const totalBytes = telemetry.total_bytes;
  const uniqueSrcIPs = telemetry.unique_source_ips;
  const uniqueDstIPs = telemetry.unique_dest_ips;
  const uniqueSrcPorts = telemetry.unique_source_ports;
  const uniqueDstPorts = telemetry.unique_dest_ports;
  const tcpFlows = telemetry.tcp_flow_count;
  const udpFlows = telemetry.udp_flow_count;
  const synCount = telemetry.syn_count;
  const ackCount = telemetry.ack_count;
  const rstCount = telemetry.rst_count;
  const finCount = telemetry.fin_count;
  const pshCount = telemetry.psh_count;
  const urgCount = telemetry.urg_count;
  const avgFlowDuration = telemetry.avg_flow_duration;
  const maxFlowDuration = telemetry.max_flow_duration;
  const avgPacketSize = telemetry.avg_packet_size;
  const maxPacketSize = telemetry.max_packet_size;
  const avgFlowBytesPerSec = telemetry.avg_flow_bytes_per_sec;
  const avgFlowPacketsPerSec = telemetry.avg_flow_packets_per_sec;
  const avgFwdPackets = telemetry.avg_fwd_packets;
  const avgBwdPackets = telemetry.avg_bwd_packets;
  const tcpUdpRatio = telemetry.tcp_udp_ratio;
  const synRate = telemetry.syn_rate;
  const portDiversity = telemetry.port_diversity;

  return (
    <section className="space-y-6" aria-labelledby="network-state-title">
      <div className="flex items-center justify-between">
        <h2 id="network-state-title" className="text-heading-lg font-semibold text-text-primary">Network State Intelligence</h2>
        <Badge variant="info" size="sm">Aggregated 5-min Window</Badge>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4">
        <TelemetryCard label="Total Flows" value={totalFlows} icon={<GitBranch className="w-4 h-4" />} unit="flows" sparklineColor="electric" />
        <TelemetryCard label="Total Packets" value={totalPackets} icon={<Activity className="w-4 h-4" />} unit="pkts" sparklineColor="violet" />
        <TelemetryCard label="Total Bytes" value={formatNumberFull(totalBytes)} icon={<HardDrive className="w-4 h-4" />} unit="B" sparklineColor="amber" />
        <TelemetryCard label="Unique Src IPs" value={uniqueSrcIPs} icon={<Globe className="w-4 h-4" />} unit="IPs" sparklineColor="electric" />
        <TelemetryCard label="Unique Dst IPs" value={uniqueDstIPs} icon={<Server className="w-4 h-4" />} unit="IPs" sparklineColor="violet" />
        <TelemetryCard label="Flow Rate" value={telemetry.flow_rate_per_sec.toFixed(1)} icon={<Zap className="w-4 h-4" />} unit="/sec" precision={1} sparklineColor="amber" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <TelemetryCard label="TCP Flows" value={tcpFlows} icon={<Link className="w-4 h-4" />} unit="flows" sparklineColor="electric" />
        <TelemetryCard label="UDP Flows" value={udpFlows} icon={<RotateCcw className="w-4 h-4" />} unit="flows" sparklineColor="violet" />
        <TelemetryCard label="TCP/UDP Ratio" value={tcpUdpRatio.toFixed(1)} icon={<Hash className="w-4 h-4" />} precision={1} sparklineColor="amber" />
        <TelemetryCard label="SYN Count" value={synCount} icon={<ArrowUpRight className="w-4 h-4" />} unit="SYN" sparklineColor={synRate > 2 ? 'critical' : 'electric'} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <TelemetryCard label="ACK Count" value={ackCount} icon={<ArrowDownRight className="w-4 h-4" />} unit="ACK" sparklineColor="violet" />
        <TelemetryCard label="RST Count" value={rstCount} icon={<XCircle className="w-4 h-4" />} unit="RST" sparklineColor="amber" />
        <TelemetryCard label="FIN Count" value={finCount} icon={<CheckCircle className="w-4 h-4" />} unit="FIN" sparklineColor="secure" />
        <TelemetryCard label="URG Count" value={urgCount} icon={<AlertTriangle className="w-4 h-4" />} unit="URG" sparklineColor={urgCount > 5 ? 'critical' : 'amber'} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <TelemetryCard label="Src Port Diversity" value={uniqueSrcPorts} icon={<Hash className="w-4 h-4" />} unit="ports" sparklineColor="electric" />
        <TelemetryCard label="Dst Port Diversity" value={uniqueDstPorts} icon={<Hash className="w-4 h-4" />} unit="ports" sparklineColor="violet" />
        <TelemetryCard label="Port Diversity Index" value={portDiversity.toFixed(2)} icon={<Cpu className="w-4 h-4" />} precision={2} sparklineColor="amber" />
        <TelemetryCard label="SYN Rate/Flow" value={synRate.toFixed(2)} icon={<Zap className="w-4 h-4" />} precision={2} sparklineColor={synRate > 2 ? 'critical' : 'electric'} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <TelemetryCard label="Avg Flow Duration" value={avgFlowDuration.toFixed(2)} icon={<Timer className="w-4 h-4" />} unit="s" precision={2} sparklineColor="electric" />
        <TelemetryCard label="Max Flow Duration" value={maxFlowDuration.toFixed(1)} icon={<Timer className="w-4 h-4" />} unit="s" precision={1} sparklineColor="amber" />
        <TelemetryCard label="Avg Packet Size" value={avgPacketSize.toFixed(0)} icon={<MemoryStick className="w-4 h-4" />} unit="B" sparklineColor="violet" />
        <TelemetryCard label="Max Packet Size" value={maxPacketSize} icon={<MemoryStick className="w-4 h-4" />} unit="B" sparklineColor="amber" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <TelemetryCard label="Avg Flow Bytes/sec" value={formatNumber(avgFlowBytesPerSec)} icon={<HardDrive className="w-4 h-4" />} unit="B/s" sparklineColor="electric" />
        <TelemetryCard label="Avg Flow Pkts/sec" value={avgFlowPacketsPerSec.toFixed(1)} icon={<Activity className="w-4 h-4" />} unit="p/s" precision={1} sparklineColor="violet" />
        <TelemetryCard label="Avg Fwd Packets" value={avgFwdPackets.toFixed(1)} icon={<ArrowUpRight className="w-4 h-4" />} precision={1} sparklineColor="amber" />
        <TelemetryCard label="Avg Bwd Packets" value={avgBwdPackets.toFixed(1)} icon={<ArrowDownRight className="w-4 h-4" />} precision={1} sparklineColor="secure" />
      </div>

      <Card variant="elevated" className="mt-4">
        <CardHeader>
          <CardTitle>Protocol Flag Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {[
              { label: 'SYN', value: synCount, color: 'critical' as const },
              { label: 'ACK', value: ackCount, color: 'electric' as const },
              { label: 'RST', value: rstCount, color: 'amber' as const },
              { label: 'FIN', value: finCount, color: 'secure' as const },
              { label: 'PSH', value: pshCount, color: 'violet' as const },
              { label: 'URG', value: urgCount, color: 'critical' as const },
            ].map(({ label, value, color }) => (
              <RadialIndicator key={label} label={label} value={value} max={Math.max(totalFlows, 1)} color={color} size={70} strokeWidth={5} />
            ))}
          </div>
        </CardContent>
      </Card>
    </section>
  );
}