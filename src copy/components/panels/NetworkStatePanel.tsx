import { useState } from 'react';
import { Network } from 'lucide-react';
import { cn, formatNumber } from '@/utils/helpers';
import { useTelemetry, useSelectedScenario } from '@/contexts/DashboardContext';
import { NetworkTopologyCanvas } from '@/components/visualizations/NetworkTopologyCanvas';
import { useSound } from '@/contexts/SoundContext';

export function NetworkStatePanel() {
  const telemetry = useTelemetry();
  const selectedScenario = useSelectedScenario();
  const { play } = useSound();
  const [filterType, setFilterType] = useState<'all' | 'tcp' | 'syn'>('all');

  const prob = selectedScenario.attackProbability;
  const isAttack = selectedScenario.status === 'ATTACK_LIKELY';

  // Extract key telemetry metrics cleanly
  const totalFlows = telemetry?.total_flows ?? selectedScenario.features.total_flows;
  const totalPackets = telemetry?.total_packets ?? selectedScenario.features.total_packets;
  const synRate = telemetry?.syn_rate ?? (selectedScenario.features.syn_count / Math.max(1, selectedScenario.features.total_flows));
  const portEntropy = (selectedScenario.features.unique_source_ports + selectedScenario.features.unique_dest_ports) / Math.max(1, selectedScenario.features.total_flows);
  const flowRate = telemetry?.flow_rate_per_sec ?? (totalFlows / 300);
  const packetRate = telemetry?.packet_rate_per_sec ?? (totalPackets / 300);

  return (
    <div className="space-y-6 font-sans">
      {/* Interactive Network Topology Visualizer Canvas */}
      <div className="glass-panel rounded-2xl p-5 border border-border-default/60 relative overflow-hidden space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 relative z-10">
          <div>
            <div className="flex items-center gap-2">
              <Network className="w-4 h-4 text-electric-400" />
              <h3 className="text-body font-semibold text-text-primary">
                Live State Topology &amp; Ingress Particle Field
              </h3>
            </div>
            <p className="text-caption text-text-muted mt-0.5">
              Graph state representation $G=(V, E, X_t)$ encoding active network telemetry and packet flow dynamics
            </p>
          </div>

          {/* Interactive Filter Pills */}
          <div className="flex items-center gap-1.5 bg-surface-900/90 p-1 rounded-xl border border-border-subtle">
            <button
              type="button"
              onClick={() => { play('click'); setFilterType('all'); }}
              className={cn(
                'px-2.5 py-1 rounded-lg text-caption font-medium transition-all',
                filterType === 'all' ? 'bg-electric-500/20 text-electric-300' : 'text-text-muted hover:text-text-primary'
              )}
            >
              All Flows
            </button>
            <button
              type="button"
              onClick={() => { play('click'); setFilterType('tcp'); }}
              className={cn(
                'px-2.5 py-1 rounded-lg text-caption font-medium transition-all',
                filterType === 'tcp' ? 'bg-electric-500/20 text-electric-300' : 'text-text-muted hover:text-text-primary'
              )}
            >
              TCP Sessions
            </button>
            <button
              type="button"
              onClick={() => { play('click'); setFilterType('syn'); }}
              className={cn(
                'px-2.5 py-1 rounded-lg text-caption font-medium transition-all',
                filterType === 'syn' ? 'bg-critical-500/20 text-critical-300' : 'text-text-muted hover:text-text-primary'
              )}
            >
              SYN Probes
            </button>
          </div>
        </div>

        {/* Live Canvas Area */}
        <div className="h-[280px] w-full rounded-xl overflow-hidden bg-surface-950/80 border border-border-subtle/60 relative">
          <NetworkTopologyCanvas
            width={900}
            height={280}
            attackProbability={prob}
            isAttackLikely={isAttack}
            nodeCount={60}
            className="w-full h-full"
          />

          {/* Overlay Status telemetry banner */}
          <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between p-2 rounded-lg bg-surface-900/90 backdrop-blur-md border border-border-subtle text-[11px]">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1.5 text-text-secondary">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                Active Hosts: <strong className="text-white">64 Nodes</strong>
              </span>
              <span className="flex items-center gap-1.5 text-text-secondary">
                <span className="w-2 h-2 rounded-full bg-electric-400" />
                Ingress Flow: <strong className="text-white">{formatNumber(flowRate)} flows/s</strong>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-text-muted">Dynamic State Vector:</span>
              <span className={cn(
                'font-semibold px-2 py-0.5 rounded',
                isAttack ? 'bg-critical-500/20 text-critical-300' : 'bg-secure-500/20 text-secure-300'
              )}>
                {isAttack ? 'ANOMALOUS CONVERGENCE' : 'STABLE EQUILIBRIUM'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Visual Telemetry Gauges */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* SYN Flag Density Dial */}
        <div className="glass-panel rounded-xl p-4 border border-border-default/50 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-caption font-medium text-text-muted">SYN Flag Density</span>
            <span className={cn(
              'text-[10px] font-semibold px-1.5 py-0.5 rounded',
              synRate > 0.5 ? 'bg-critical-500/20 text-critical-300' : 'bg-secure-500/20 text-secure-300'
            )}>
              {synRate > 0.5 ? 'SPIKE' : 'NORMAL'}
            </span>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-bold text-text-primary">
              {(synRate * 100).toFixed(0)}%
            </span>
            <span className="text-caption text-text-muted">
              of total flows
            </span>
          </div>
          <div className="h-1.5 w-full bg-surface-950 rounded-full overflow-hidden">
            <div
              className={cn(
                'h-full rounded-full transition-all duration-700',
                synRate > 0.5 ? 'bg-critical-500' : 'bg-secure-500'
              )}
              style={{ width: `${Math.min(100, synRate * 100)}%` }}
            />
          </div>
        </div>

        {/* Port Scan Entropy Dial */}
        <div className="glass-panel rounded-xl p-4 border border-border-default/50 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-caption font-medium text-text-muted">Port Scan Entropy</span>
            <span className={cn(
              'text-[10px] font-semibold px-1.5 py-0.5 rounded',
              portEntropy > 0.4 ? 'bg-critical-500/20 text-critical-300' : 'bg-secure-500/20 text-secure-300'
            )}>
              {portEntropy > 0.4 ? 'PROBING' : 'CONFINED'}
            </span>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-bold text-text-primary">
              {(Math.min(1, portEntropy) * 100).toFixed(0)}%
            </span>
            <span className="text-caption text-text-muted">
              diversity index
            </span>
          </div>
          <div className="h-1.5 w-full bg-surface-950 rounded-full overflow-hidden">
            <div
              className={cn(
                'h-full rounded-full transition-all duration-700',
                portEntropy > 0.4 ? 'bg-amber-500' : 'bg-electric-500'
              )}
              style={{ width: `${Math.min(100, portEntropy * 100)}%` }}
            />
          </div>
        </div>

        {/* Ingress Packet Throughput */}
        <div className="glass-panel rounded-xl p-4 border border-border-default/50 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-caption font-medium text-text-muted">Packet Throughput</span>
            <span className="text-[10px] text-electric-300 bg-electric-500/20 px-1.5 py-0.5 rounded font-semibold">
              TELEMETRY
            </span>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-bold text-text-primary">
              {formatNumber(packetRate)}
            </span>
            <span className="text-caption text-text-muted">
              packets/sec
            </span>
          </div>
          <div className="h-1.5 w-full bg-surface-950 rounded-full overflow-hidden">
            <div
              className="h-full bg-electric-500 rounded-full transition-all duration-700"
              style={{ width: `${Math.min(100, (packetRate / 2000) * 100)}%` }}
            />
          </div>
        </div>

        {/* TCP vs UDP Balance */}
        <div className="glass-panel rounded-xl p-4 border border-border-default/50 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-caption font-medium text-text-muted">Protocol Composition</span>
            <span className="text-[10px] text-violet-300 bg-violet-500/20 px-1.5 py-0.5 rounded font-semibold">
              L4 MIX
            </span>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-bold text-text-primary">
              {selectedScenario.features.tcp_flow_count > selectedScenario.features.udp_flow_count ? 'TCP-Heavy' : 'UDP-Heavy'}
            </span>
            <span className="text-caption text-text-muted">
              {(selectedScenario.features.tcp_flow_count / Math.max(1, selectedScenario.features.total_flows) * 100).toFixed(0)}% TCP
            </span>
          </div>
          <div className="h-1.5 w-full bg-surface-950 rounded-full overflow-hidden flex">
            <div
              className="h-full bg-electric-500 rounded-l-full"
              style={{ width: `${(selectedScenario.features.tcp_flow_count / Math.max(1, selectedScenario.features.total_flows)) * 100}%` }}
            />
            <div
              className="h-full bg-violet-500 rounded-r-full"
              style={{ width: `${(selectedScenario.features.udp_flow_count / Math.max(1, selectedScenario.features.total_flows)) * 100}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}