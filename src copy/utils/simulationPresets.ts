import type { WindowFeatures } from '@/types/api';

export interface AttackScenario {
  id: string;
  name: string;
  category: 'Reconnaissance' | 'Lateral Movement' | 'Denial of Service' | 'Exfiltration' | 'Benign';
  description: string;
  attackProbability: number;
  status: 'ATTACK_LIKELY' | 'NORMAL';
  mitreStageIndex: number;
  mitreStage: string;
  mitreTechnique: { id: string; name: string; tactic: string; description: string };
  features: WindowFeatures;
  horizons: Array<{
    horizonMinutes: number;
    stepLabel: string;
    probability: number;
    lowerBound: number;
    upperBound: number;
    projectedStage: string;
    stateVector: { synRate: number; portEntropy: number; flowIntensity: number; packetTimingVar: number };
  }>;
  attentionAttribution: Array<{
    feature: string;
    label: string;
    weight: number;
    impact: 'critical' | 'high' | 'medium' | 'low';
    baselineVal: string;
    observedVal: string;
  }>;
  defenderRecommendations: Array<{
    action: string;
    priority: 'CRITICAL' | 'HIGH' | 'MEDIUM';
    target: string;
    rule: string;
  }>;
  timelinePoints: Array<{
    timestamp: string;
    risk_score: number;
    is_forecast: boolean;
    upper_bound?: number;
    lower_bound?: number;
  }>;
}

const ZERO_FEATURES: WindowFeatures = {
  total_flows: 0,
  total_packets: 0,
  total_bytes: 0,
  unique_source_ips: 0,
  unique_dest_ips: 0,
  unique_source_ports: 0,
  unique_dest_ports: 0,
  tcp_flow_count: 0,
  udp_flow_count: 0,
  syn_count: 0,
  ack_count: 0,
  rst_count: 0,
  fin_count: 0,
  psh_count: 0,
  urg_count: 0,
  avg_flow_duration: 0,
  max_flow_duration: 0,
  std_flow_duration: 0,
  avg_packet_size: 0,
  max_packet_size: 0,
  min_packet_size: 0,
  std_packet_size: 0,
  avg_flow_bytes_per_sec: 0,
  avg_flow_packets_per_sec: 0,
  avg_fwd_packets: 0,
  avg_bwd_packets: 0,
  avg_fwd_bytes: 0,
  avg_bwd_bytes: 0,
  avg_flow_iat_mean: 0,
  avg_fwd_iat_mean: 0,
  avg_bwd_iat_mean: 0,
  avg_active_mean: 0,
  avg_idle_mean: 0,
  avg_subflow_fwd_pkts: 0,
  avg_subflow_bwd_pkts: 0,
};

export const STANDBY_SCENARIO: AttackScenario = {
  id: 'standby',
  name: 'Standby / Awaiting Ingestion',
  category: 'Benign',
  description: 'World Model in standby mode. Select a scenario preset below or upload a network CSV to begin real-time forecasting.',
  attackProbability: 0.0,
  status: 'NORMAL',
  mitreStageIndex: 0,
  mitreStage: 'Standby (Zero Ingress)',
  mitreTechnique: {
    id: 'T0000',
    name: 'Standby Telemetry Monitor',
    tactic: 'Baseline Monitoring',
    description: 'System is initialized and awaiting live NetFlow/PCAP stream ingestion.'
  },
  features: ZERO_FEATURES,
  horizons: [
    { horizonMinutes: 0, stepLabel: 'S(t) Current', probability: 0.0, lowerBound: 0.0, upperBound: 0.02, projectedStage: 'Nominal Baseline', stateVector: { synRate: 0.0, portEntropy: 0.0, flowIntensity: 0.0, packetTimingVar: 0.0 } },
    { horizonMinutes: 5, stepLabel: 'S(t+1) +5m', probability: 0.0, lowerBound: 0.0, upperBound: 0.02, projectedStage: 'Nominal Baseline', stateVector: { synRate: 0.0, portEntropy: 0.0, flowIntensity: 0.0, packetTimingVar: 0.0 } },
    { horizonMinutes: 10, stepLabel: 'S(t+2) +10m', probability: 0.0, lowerBound: 0.0, upperBound: 0.02, projectedStage: 'Nominal Baseline', stateVector: { synRate: 0.0, portEntropy: 0.0, flowIntensity: 0.0, packetTimingVar: 0.0 } },
    { horizonMinutes: 15, stepLabel: 'S(t+3) +15m', probability: 0.0, lowerBound: 0.0, upperBound: 0.02, projectedStage: 'Nominal Baseline', stateVector: { synRate: 0.0, portEntropy: 0.0, flowIntensity: 0.0, packetTimingVar: 0.0 } },
    { horizonMinutes: 20, stepLabel: 'S(t+4) +20m', probability: 0.0, lowerBound: 0.0, upperBound: 0.02, projectedStage: 'Nominal Baseline', stateVector: { synRate: 0.0, portEntropy: 0.0, flowIntensity: 0.0, packetTimingVar: 0.0 } }
  ],
  attentionAttribution: [
    { feature: 'syn_ratio', label: 'SYN-to-Flow Ratio', weight: 0.0, impact: 'low', baselineVal: '0.00', observedVal: '0.00 (0%)' },
    { feature: 'port_entropy', label: 'Port Scan Entropy', weight: 0.0, impact: 'low', baselineVal: '0.00', observedVal: '0.00 (0%)' },
    { feature: 'rst_anomaly', label: 'RST Reject Frequency', weight: 0.0, impact: 'low', baselineVal: '0.00', observedVal: '0.00 (0%)' },
    { feature: 'iat_dispersion', label: 'Inter-Arrival Jitter', weight: 0.0, impact: 'low', baselineVal: '0.00s', observedVal: '0.00s' },
    { feature: 'fwd_bwd_ratio', label: 'Asymmetric Flow Ratio', weight: 0.0, impact: 'low', baselineVal: '1.0:1', observedVal: '1.0:1' }
  ],
  defenderRecommendations: [
    { action: 'Awaiting Telemetry Stream', priority: 'MEDIUM', target: 'SOC Telemetry Pipeline', rule: 'Standby for flow ingestion' }
  ],
  timelinePoints: generateTimelineSeries(0.0, false)
};

export const SIMULATION_SCENARIOS: AttackScenario[] = [
  {
    id: 'portscan-infiltration',
    name: 'CIC-IDS2018 PortScan & Reconnaissance',
    category: 'Reconnaissance',
    description: 'Systematic sequential & randomized TCP SYN port probing across subnet 192.168.10.0/24 preceding initial exploitation.',
    attackProbability: 0.89,
    status: 'ATTACK_LIKELY',
    mitreStageIndex: 1, // Initial Access imminent
    mitreStage: 'Initial Access (T1190)',
    mitreTechnique: {
      id: 'T1595.001',
      name: 'Port Scanning & Service Enumeration',
      tactic: 'Reconnaissance / Initial Access',
      description: 'Adversary executes rapid SYN scans across high-value ports (22, 80, 443, 3389, 8080) to fingerprint vulnerable network daemons.'
    },
    features: {
      total_flows: 14280,
      total_packets: 98450,
      total_bytes: 48920000,
      unique_source_ips: 42,
      unique_dest_ips: 18,
      unique_source_ports: 4890,
      unique_dest_ports: 1024,
      tcp_flow_count: 13950,
      udp_flow_count: 330,
      syn_count: 11200,
      ack_count: 3200,
      rst_count: 7800,
      fin_count: 850,
      psh_count: 420,
      urg_count: 12,
      avg_flow_duration: 120.4,
      max_flow_duration: 300.0,
      std_flow_duration: 85.2,
      avg_packet_size: 496.9,
      max_packet_size: 1500.0,
      min_packet_size: 40.0,
      std_packet_size: 142.1,
      avg_flow_bytes_per_sec: 406312.0,
      avg_flow_packets_per_sec: 817.0,
      avg_fwd_packets: 4.8,
      avg_bwd_packets: 2.1,
      avg_fwd_bytes: 2400.0,
      avg_bwd_bytes: 1020.0,
      avg_flow_iat_mean: 0.042,
      avg_fwd_iat_mean: 0.035,
      avg_bwd_iat_mean: 0.082,
      avg_active_mean: 24.5,
      avg_idle_mean: 180.2,
      avg_subflow_fwd_pkts: 6.9,
      avg_subflow_bwd_pkts: 2.1,
    },
    horizons: [
      { horizonMinutes: 0, stepLabel: 'Current State S(t)', probability: 0.89, lowerBound: 0.82, upperBound: 0.94, projectedStage: 'Reconnaissance', stateVector: { synRate: 0.78, portEntropy: 0.88, flowIntensity: 0.74, packetTimingVar: 0.62 } },
      { horizonMinutes: 5, stepLabel: 'S(t+1) +5 min', probability: 0.93, lowerBound: 0.86, upperBound: 0.97, projectedStage: 'Initial Access', stateVector: { synRate: 0.85, portEntropy: 0.92, flowIntensity: 0.82, packetTimingVar: 0.71 } },
      { horizonMinutes: 10, stepLabel: 'S(t+2) +10 min', probability: 0.96, lowerBound: 0.90, upperBound: 0.99, projectedStage: 'Execution / Discovery', stateVector: { synRate: 0.65, portEntropy: 0.95, flowIntensity: 0.89, packetTimingVar: 0.84 } },
      { horizonMinutes: 15, stepLabel: 'S(t+3) +15 min', probability: 0.98, lowerBound: 0.93, upperBound: 1.00, projectedStage: 'Lateral Movement', stateVector: { synRate: 0.52, portEntropy: 0.98, flowIntensity: 0.94, packetTimingVar: 0.91 } },
      { horizonMinutes: 20, stepLabel: 'S(t+4) +20 min', probability: 0.99, lowerBound: 0.95, upperBound: 1.00, projectedStage: 'Full Compromise', stateVector: { synRate: 0.40, portEntropy: 0.99, flowIntensity: 0.98, packetTimingVar: 0.96 } }
    ],
    attentionAttribution: [
      { feature: 'syn_ratio', label: 'SYN-to-Flow Ratio', weight: 0.92, impact: 'critical', baselineVal: '0.08', observedVal: '0.78 (+875%)' },
      { feature: 'port_entropy', label: 'Port Scan Entropy', weight: 0.88, impact: 'critical', baselineVal: '0.12', observedVal: '0.88 (+633%)' },
      { feature: 'rst_anomaly', label: 'RST Reject Frequency', weight: 0.76, impact: 'high', baselineVal: '0.04', observedVal: '0.55 (+1275%)' },
      { feature: 'iat_dispersion', label: 'Inter-Arrival Jitter', weight: 0.64, impact: 'high', baselineVal: '0.35s', observedVal: '0.04s (-88%)' },
      { feature: 'fwd_bwd_ratio', label: 'Asymmetric Flow Ratio', weight: 0.54, impact: 'medium', baselineVal: '1.2:1', observedVal: '3.3:1 (+175%)' },
    ],
    defenderRecommendations: [
      { action: 'Block Probing Source IPs', priority: 'CRITICAL', target: 'Edge Firewall / BGP Flowspec', rule: 'DENY src in {192.168.10.42, 192.168.10.88} timeout 3600s' },
      { action: 'Enable TCP SYN Cookie Validation', priority: 'HIGH', target: 'Core Switch Ingress', rule: 'sysctl net.ipv4.tcp_syncookies=1' },
      { action: 'Isolate DMZ Port 8080 Ingress', priority: 'HIGH', target: 'Security Group Policy', rule: 'RESTRICT port 8080 to authenticated bastion only' },
      { action: 'Trigger Honeypot Decoy Redirection', priority: 'MEDIUM', target: 'Decoy Subnet', rule: 'REROUTE unmapped port probes to HoneyNet telemetry collector' }
    ],
    timelinePoints: generateTimelineSeries(0.89, true)
  },
  {
    id: 'stealth-lateral',
    name: 'Stealth Low-and-Slow Lateral Movement',
    category: 'Lateral Movement',
    description: 'Evasive low-rate authentication probing and SMB/RPC session establishment designed to circumvent static threshold alarms.',
    attackProbability: 0.74,
    status: 'ATTACK_LIKELY',
    mitreStageIndex: 3, // Lateral Movement
    mitreStage: 'Lateral Movement (T1021)',
    mitreTechnique: {
      id: 'T1021.002',
      name: 'SMB/RPC Remote Services Protocol Exploitation',
      tactic: 'Lateral Movement',
      description: 'Attacker leverages stolen administrative credentials to pivot across internal domain controllers over SMB (TCP port 445).'
    },
    features: {
      total_flows: 3820,
      total_packets: 41200,
      total_bytes: 28400000,
      unique_source_ips: 6,
      unique_dest_ips: 34,
      unique_source_ports: 850,
      unique_dest_ports: 8,
      tcp_flow_count: 3790,
      udp_flow_count: 30,
      syn_count: 1420,
      ack_count: 3600,
      rst_count: 420,
      fin_count: 380,
      psh_count: 890,
      urg_count: 0,
      avg_flow_duration: 340.2,
      max_flow_duration: 900.0,
      std_flow_duration: 120.4,
      avg_packet_size: 689.3,
      max_packet_size: 1500.0,
      min_packet_size: 52.0,
      std_packet_size: 210.5,
      avg_flow_bytes_per_sec: 83480.0,
      avg_flow_packets_per_sec: 121.0,
      avg_fwd_packets: 6.2,
      avg_bwd_packets: 4.6,
      avg_fwd_bytes: 4200.0,
      avg_bwd_bytes: 3200.0,
      avg_flow_iat_mean: 0.850,
      avg_fwd_iat_mean: 0.720,
      avg_bwd_iat_mean: 0.940,
      avg_active_mean: 45.0,
      avg_idle_mean: 295.0,
      avg_subflow_fwd_pkts: 5.4,
      avg_subflow_bwd_pkts: 5.4,
    },
    horizons: [
      { horizonMinutes: 0, stepLabel: 'Current State S(t)', probability: 0.74, lowerBound: 0.65, upperBound: 0.81, projectedStage: 'Lateral Movement', stateVector: { synRate: 0.37, portEntropy: 0.42, flowIntensity: 0.48, packetTimingVar: 0.85 } },
      { horizonMinutes: 5, stepLabel: 'S(t+1) +5 min', probability: 0.81, lowerBound: 0.73, upperBound: 0.88, projectedStage: 'Privilege Escalation', stateVector: { synRate: 0.41, portEntropy: 0.55, flowIntensity: 0.58, packetTimingVar: 0.89 } },
      { horizonMinutes: 10, stepLabel: 'S(t+2) +10 min', probability: 0.89, lowerBound: 0.81, upperBound: 0.94, projectedStage: 'C2 Staging', stateVector: { synRate: 0.45, portEntropy: 0.68, flowIntensity: 0.72, packetTimingVar: 0.92 } },
      { horizonMinutes: 15, stepLabel: 'S(t+3) +15 min', probability: 0.95, lowerBound: 0.89, upperBound: 0.98, projectedStage: 'Data Exfiltration', stateVector: { synRate: 0.48, portEntropy: 0.79, flowIntensity: 0.88, packetTimingVar: 0.95 } },
      { horizonMinutes: 20, stepLabel: 'S(t+4) +20 min', probability: 0.98, lowerBound: 0.93, upperBound: 1.00, projectedStage: 'Objective Complete', stateVector: { synRate: 0.50, portEntropy: 0.85, flowIntensity: 0.95, packetTimingVar: 0.98 } }
    ],
    attentionAttribution: [
      { feature: 'smb_dest_entropy', label: 'SMB Host Fan-Out Rate', weight: 0.89, impact: 'critical', baselineVal: '2 hosts/hr', observedVal: '34 hosts/5m (+1600%)' },
      { feature: 'iat_dispersion', label: 'Timing Cadence Regularity', weight: 0.82, impact: 'critical', baselineVal: 'Poisson-like', observedVal: 'Synchronized Beacons' },
      { feature: 'unique_dest_ips', label: 'Target IP Dispersion', weight: 0.71, impact: 'high', baselineVal: '4 IPs', observedVal: '34 IPs (+750%)' },
      { feature: 'psh_flag_rate', label: 'Interactive PSH Frequency', weight: 0.62, impact: 'medium', baselineVal: '0.05', observedVal: '0.23 (+360%)' },
      { feature: 'duration_std', label: 'Flow Duration Variance', weight: 0.48, impact: 'medium', baselineVal: '15s', observedVal: '120.4s (+702%)' },
    ],
    defenderRecommendations: [
      { action: 'Revoke Compromised Service Token', priority: 'CRITICAL', target: 'Active Directory Kerberos KDC', rule: 'klist purge /target:HOST/dc01.corp.internal' },
      { action: 'Enforce Microsegmentation Quarantine', priority: 'HIGH', target: 'SDN Controller / VXLAN', rule: 'ISOLATE subnet 10.0.4.0/24 from Production DB VLAN' },
      { action: 'Trigger Endpoint Agent Memory Scan', priority: 'HIGH', target: 'CrowdStrike / EDR Falcon', rule: 'INVOKE edr.scan_memory(target_hosts=34)' }
    ],
    timelinePoints: generateTimelineSeries(0.74, true)
  },
  {
    id: 'synflood-dos',
    name: 'Volumetric SYN-Flood Exhaustion',
    category: 'Denial of Service',
    description: 'Massive multi-threaded half-open TCP SYN packet flooding intended to exhaust kernel socket connection state tables.',
    attackProbability: 0.96,
    status: 'ATTACK_LIKELY',
    mitreStageIndex: 4, // Impact
    mitreStage: 'Impact / Exhaustion (T1498)',
    mitreTechnique: {
      id: 'T1498.001',
      name: 'Direct Network Flooding (TCP SYN Stream)',
      tactic: 'Impact',
      description: 'Adversary transmits high-frequency SYN packets without completing the 3-way handshake to exhaust target backlog queues.'
    },
    features: {
      total_flows: 95400,
      total_packets: 840200,
      total_bytes: 420000000,
      unique_source_ips: 14200,
      unique_dest_ips: 2,
      unique_source_ports: 48900,
      unique_dest_ports: 2,
      tcp_flow_count: 95300,
      udp_flow_count: 100,
      syn_count: 92400,
      ack_count: 1200,
      rst_count: 45000,
      fin_count: 200,
      psh_count: 50,
      urg_count: 0,
      avg_flow_duration: 1.2,
      max_flow_duration: 15.0,
      std_flow_duration: 0.8,
      avg_packet_size: 64.0,
      max_packet_size: 128.0,
      min_packet_size: 40.0,
      std_packet_size: 4.2,
      avg_flow_bytes_per_sec: 35000000.0,
      avg_flow_packets_per_sec: 70000.0,
      avg_fwd_packets: 8.8,
      avg_bwd_packets: 0.0,
      avg_fwd_bytes: 4400.0,
      avg_bwd_bytes: 0.0,
      avg_flow_iat_mean: 0.0001,
      avg_fwd_iat_mean: 0.0001,
      avg_bwd_iat_mean: 0.0,
      avg_active_mean: 1.2,
      avg_idle_mean: 0.0,
      avg_subflow_fwd_pkts: 1.0,
      avg_subflow_bwd_pkts: 0.0,
    },
    horizons: [
      { horizonMinutes: 0, stepLabel: 'Current State S(t)', probability: 0.96, lowerBound: 0.92, upperBound: 0.99, projectedStage: 'SYN Flooding', stateVector: { synRate: 0.97, portEntropy: 0.95, flowIntensity: 0.99, packetTimingVar: 0.12 } },
      { horizonMinutes: 5, stepLabel: 'S(t+1) +5 min', probability: 0.98, lowerBound: 0.95, upperBound: 1.00, projectedStage: 'Backlog Saturation', stateVector: { synRate: 0.98, portEntropy: 0.96, flowIntensity: 1.00, packetTimingVar: 0.08 } },
      { horizonMinutes: 10, stepLabel: 'S(t+2) +10 min', probability: 0.99, lowerBound: 0.97, upperBound: 1.00, projectedStage: 'Complete Denial of Service', stateVector: { synRate: 0.99, portEntropy: 0.98, flowIntensity: 1.00, packetTimingVar: 0.05 } },
      { horizonMinutes: 15, stepLabel: 'S(t+3) +15 min', probability: 0.99, lowerBound: 0.97, upperBound: 1.00, projectedStage: 'Target Crash', stateVector: { synRate: 0.99, portEntropy: 0.98, flowIntensity: 1.00, packetTimingVar: 0.04 } },
      { horizonMinutes: 20, stepLabel: 'S(t+4) +20 min', probability: 0.99, lowerBound: 0.98, upperBound: 1.00, projectedStage: 'Sustained Outage', stateVector: { synRate: 0.99, portEntropy: 0.99, flowIntensity: 1.00, packetTimingVar: 0.02 } }
    ],
    attentionAttribution: [
      { feature: 'syn_rate', label: 'SYN Packet Dominance', weight: 0.98, impact: 'critical', baselineVal: '0.08', observedVal: '0.97 (+1112%)' },
      { feature: 'packet_rate', label: 'Packet Throughput Velocity', weight: 0.94, impact: 'critical', baselineVal: '320 pkts/s', observedVal: '2800 pkts/s (+775%)' },
      { feature: 'flow_duration_mean', label: 'Incomplete Handshake Abort', weight: 0.86, impact: 'high', baselineVal: '45.2s', observedVal: '1.2s (-97%)' },
      { feature: 'unique_source_ips', label: 'Spoofed Ingress IP Count', weight: 0.79, impact: 'high', baselineVal: '12 IPs', observedVal: '14,200 IPs' }
    ],
    defenderRecommendations: [
      { action: 'Engage Edge SYN Proxy Mitigation', priority: 'CRITICAL', target: 'Cloudflare Magic Transit / Arbor', rule: 'ENABLE syn_proxy_mode rate_limit=50000pps' },
      { action: 'Dynamic Blackhole Route BGP Announcement', priority: 'CRITICAL', target: 'Upstream Transit ASNs', rule: 'ANNOUNCE 192.168.10.2/32 community=65535:666' },
      { action: 'Scale Up Socket Backlog Allocation', priority: 'HIGH', target: 'Linux Kernel Host OS', rule: 'sysctl -w net.ipv4.tcp_max_syn_backlog=65536' }
    ],
    timelinePoints: generateTimelineSeries(0.96, true)
  },
  {
    id: 'benign-corporate',
    name: 'Benign Corporate Telemetry Baseline',
    category: 'Benign',
    description: 'Legitimate business-hours network activity consisting of encrypted HTTPS, internal DB queries, and routine DNS queries.',
    attackProbability: 0.03,
    status: 'NORMAL',
    mitreStageIndex: 0,
    mitreStage: 'Benign Baseline (T0000)',
    mitreTechnique: {
      id: 'T0000',
      name: 'Legitimate Network Telemetry',
      tactic: 'Nominal Operations',
      description: 'Standard business applications operating inside expected baseline statistical thresholds.'
    },
    features: {
      total_flows: 8450,
      total_packets: 62400,
      total_bytes: 41200000,
      unique_source_ips: 120,
      unique_dest_ips: 45,
      unique_source_ports: 6200,
      unique_dest_ports: 80,
      tcp_flow_count: 7800,
      udp_flow_count: 650,
      syn_count: 680,
      ack_count: 7600,
      rst_count: 90,
      fin_count: 650,
      psh_count: 3200,
      urg_count: 0,
      avg_flow_duration: 48.2,
      max_flow_duration: 300.0,
      std_flow_duration: 22.1,
      avg_packet_size: 660.2,
      max_packet_size: 1500.0,
      min_packet_size: 52.0,
      std_packet_size: 180.4,
      avg_flow_bytes_per_sec: 137333.0,
      avg_flow_packets_per_sec: 208.0,
      avg_fwd_packets: 7.3,
      avg_bwd_packets: 7.3,
      avg_fwd_bytes: 4800.0,
      avg_bwd_bytes: 4800.0,
      avg_flow_iat_mean: 0.350,
      avg_fwd_iat_mean: 0.310,
      avg_bwd_iat_mean: 0.380,
      avg_active_mean: 18.0,
      avg_idle_mean: 240.0,
      avg_subflow_fwd_pkts: 7.3,
      avg_subflow_bwd_pkts: 7.3,
    },
    horizons: [
      { horizonMinutes: 0, stepLabel: 'Current State S(t)', probability: 0.03, lowerBound: 0.01, upperBound: 0.06, projectedStage: 'Nominal Baseline', stateVector: { synRate: 0.08, portEntropy: 0.12, flowIntensity: 0.15, packetTimingVar: 0.18 } },
      { horizonMinutes: 5, stepLabel: 'S(t+1) +5 min', probability: 0.04, lowerBound: 0.02, upperBound: 0.07, projectedStage: 'Nominal Baseline', stateVector: { synRate: 0.08, portEntropy: 0.12, flowIntensity: 0.16, packetTimingVar: 0.19 } },
      { horizonMinutes: 10, stepLabel: 'S(t+2) +10 min', probability: 0.03, lowerBound: 0.01, upperBound: 0.06, projectedStage: 'Nominal Baseline', stateVector: { synRate: 0.07, portEntropy: 0.11, flowIntensity: 0.14, packetTimingVar: 0.17 } },
      { horizonMinutes: 15, stepLabel: 'S(t+3) +15 min', probability: 0.04, lowerBound: 0.02, upperBound: 0.07, projectedStage: 'Nominal Baseline', stateVector: { synRate: 0.08, portEntropy: 0.12, flowIntensity: 0.15, packetTimingVar: 0.18 } },
      { horizonMinutes: 20, stepLabel: 'S(t+4) +20 min', probability: 0.03, lowerBound: 0.01, upperBound: 0.06, projectedStage: 'Nominal Baseline', stateVector: { synRate: 0.07, portEntropy: 0.11, flowIntensity: 0.14, packetTimingVar: 0.16 } }
    ],
    attentionAttribution: [
      { feature: 'syn_ratio', label: 'SYN-to-Flow Ratio', weight: 0.08, impact: 'low', baselineVal: '0.08', observedVal: '0.08 (Nominal)' },
      { feature: 'port_entropy', label: 'Port Scan Entropy', weight: 0.12, impact: 'low', baselineVal: '0.12', observedVal: '0.12 (Nominal)' },
      { feature: 'rst_anomaly', label: 'RST Reject Frequency', weight: 0.04, impact: 'low', baselineVal: '0.04', observedVal: '0.01 (Low)' },
      { feature: 'ack_completion', label: 'Full 3-Way Handshake Ratio', weight: 0.91, impact: 'low', baselineVal: '0.90', observedVal: '0.94 (Healthy)' }
    ],
    defenderRecommendations: [
      { action: 'Maintain Baseline Telemetry Logging', priority: 'MEDIUM', target: 'Elastic SIEM / Splunk', rule: 'LOG info retention 90d' },
      { action: 'Continuous World Model Heartbeat', priority: 'MEDIUM', target: 'Forecasting Pipeline', rule: 'RE-EVALUATE 5-min rolling window' }
    ],
    timelinePoints: generateTimelineSeries(0.03, false)
  }
];

function generateTimelineSeries(baseProbability: number, isAttack: boolean) {
  const points = [];
  const now = Date.now();
  for (let i = -12; i <= 5; i++) {
    const isForecast = i > 0;
    const timeOffsetMs = i * 5 * 60 * 1000;
    const pointTime = new Date(now + timeOffsetMs).toISOString();

    let score = baseProbability;
    if (isAttack) {
      if (i < -6) {
        score = Math.max(0.05, baseProbability * 0.15 + (i + 12) * 0.03);
      } else if (i <= 0) {
        score = Math.min(0.99, baseProbability * 0.5 + (i + 6) * (baseProbability * 0.1));
      } else {
        score = Math.min(0.99, baseProbability + i * 0.02);
      }
    } else {
      score = Math.max(0.0, Math.min(0.05, baseProbability + (i % 2 === 0 ? 0.01 : 0)));
    }

    const finalScore = Math.max(0.0, Math.min(0.99, score));
    const upper = isForecast ? Math.min(1.0, finalScore + (isAttack ? 0.05 : 0.02)) : undefined;
    const lower = isForecast ? Math.max(0.0, finalScore - (isAttack ? 0.05 : 0.01)) : undefined;

    points.push({
      timestamp: pointTime,
      risk_score: finalScore,
      is_forecast: isForecast,
      upper_bound: upper,
      lower_bound: lower
    });
  }
  return points;
}
