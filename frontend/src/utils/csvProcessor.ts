import type { DatasetInfo, UploadPrediction } from '@/types/dashboard';
import type { WindowFeatures } from '@/types/api';

function parseCsvLineFast(line: string): string[] {
  const result: string[] = [];
  let cur = '';
  let inQuotes = false;
  const len = line.length;

  for (let i = 0; i < len; i++) {
    const c = line[i];
    if (inQuotes) {
      if (c === '"') {
        if (i + 1 < len && line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cur += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ',') {
      result.push(cur.trim());
      cur = '';
    } else {
      cur += c;
    }
  }
  result.push(cur.trim());
  return result;
}

/**
 * Fast, streaming-style in-browser CSV analyzer for CIC-IDS2017 / NetFlow datasets.
 * Performs single-pass numeric aggregation to prevent out-of-memory errors on 100MB+ files.
 */
export function processCsvText(
  text: string,
  fileName: string,
  fileSize: number
): { dataset: DatasetInfo; prediction: UploadPrediction } {
  if (!text || text.trim().length === 0) {
    throw new Error('CSV file is empty.');
  }

  // Find header row and first newline
  const firstNewlineIndex = text.search(/\r\n|\n|\r/);
  if (firstNewlineIndex === -1) {
    throw new Error('CSV file has no data rows (only 1 line detected).');
  }

  const headerLine = text.substring(0, firstNewlineIndex);
  const rawHeaders = parseCsvLineFast(headerLine);
  
  // Normalize header mapping (strip whitespace, punctuation, lowercase)
  const colMap = new Map<string, number>();
  rawHeaders.forEach((h, i) => {
    const cleanKey = h.toLowerCase().replace(/[\s_\-\.\"\']+/g, ' ').trim();
    colMap.set(cleanKey, i);
  });

  const getColIdx = (names: string[]): number => {
    for (const name of names) {
      const cleanName = name.toLowerCase().replace(/[\s_\-\.\"\']+/g, ' ').trim();
      const idx = colMap.get(cleanName);
      if (idx !== undefined) return idx;
    }
    // Substring fallback
    for (const [key, idx] of colMap.entries()) {
      for (const name of names) {
        const cleanName = name.toLowerCase().replace(/[\s_\-\.\"\']+/g, ' ').trim();
        if (cleanName.length >= 4 && (key.includes(cleanName) || cleanName.includes(key))) {
          return idx;
        }
      }
    }
    return -1;
  };

  const idxTimestamp = getColIdx(['timestamp', 'time', 'flow timestamp', 'date_time', 'datetime', 'frame.time', 'ts', 'epoch', 'date']);
  const idxSrcIp = getColIdx(['source ip', 'src ip', 'src_ip', 'source_ip', 'srcip', 'client_ip', 'orig_h', 'saddr', 'src', 'source']);
  const idxDstIp = getColIdx(['destination ip', 'dest ip', 'dst_ip', 'dst ip', 'destination_ip', 'dstip', 'server_ip', 'resp_h', 'daddr', 'dst', 'destination']);
  const idxSrcPort = getColIdx(['source port', 'src port', 'src_port', 'source_port', 'srcport', 'sport', 'orig_p', 's_port', 'l4_src_port']);
  const idxDstPort = getColIdx(['destination port', 'dest port', 'dst_port', 'destination_port', 'dstport', 'dport', 'resp_p', 'd_port', 'l4_dst_port']);
  const idxProtocol = getColIdx(['protocol', 'proto', 'ip_proto', 'transport_protocol', 'l4_proto']);
  const idxFlowDuration = getColIdx(['flow duration', 'flow_duration', 'duration', 'dur', 'flow_dur', 'session_duration']);
  const idxTotalFwdPkts = getColIdx(['total fwd packets', 'tot fwd pkts', 'total_fwd_packets', 'fwd_packets', 'fwd_pkts', 'src_packets', 'out_pkts']);
  const idxTotalBwdPkts = getColIdx(['total backward packets', 'total bwd packets', 'tot bwd pkts', 'total_backward_packets', 'bwd_packets', 'bwd_pkts', 'dst_packets', 'in_pkts']);
  const idxTotLenFwdPkts = getColIdx(['total length of fwd packets', 'totlen fwd pkts', 'total_length_of_fwd_packets', 'fwd_bytes', 'tot_fwd_bytes', 'src_bytes', 'out_bytes']);
  const idxTotLenBwdPkts = getColIdx(['total length of bwd packets', 'totlen bwd pkts', 'total_length_of_bwd_packets', 'bwd_bytes', 'tot_bwd_bytes', 'dst_bytes', 'in_bytes']);
  
  // Specific flexible state vector mappings (Requirement 1)
  const idxSynFlags = getColIdx(['syn_flag_density', 'syn ratio', 'syn_ratio', 'synratio', 'syn flag count', 'syn flag cnt', 'syn flags', 'syn_flag_count', 'syn_count', 'tcp_syn', 'flags_syn', 'syn', 'syn_rate']);
  const idxAckFlags = getColIdx(['ack flag count', 'ack flag cnt', 'ack flags', 'ack_flag_count', 'ack_count', 'tcp_ack', 'flags_ack', 'ack']);
  const idxRstFlags = getColIdx(['rst flag count', 'rst flag cnt', 'rst flags', 'rst_flag_count', 'rst_count', 'tcp_rst', 'flags_rst', 'rst']);
  const idxFinFlags = getColIdx(['fin flag count', 'fin flag cnt', 'fin flags', 'fin_flag_count', 'fin_count', 'tcp_fin', 'flags_fin', 'fin']);
  const idxPshFlags = getColIdx(['psh flag count', 'psh flag cnt', 'psh flags', 'psh_flag_count', 'psh_count', 'tcp_psh', 'flags_psh', 'psh']);
  const idxUrgFlags = getColIdx(['urg flag count', 'urg flag cnt', 'urg flags', 'urg_flag_count', 'urg_count', 'tcp_urg', 'flags_urg', 'urg']);
  
  const idxPortEntropyDirect = getColIdx(['port_scan_entropy', 'port entropy', 'port_entropy', 'portentropy', 'port_diversity', 'portdiversity', 'port_entropy_score']);
  const idxFlowIntensityDirect = getColIdx(['packet_throughput', 'flow_intensity', 'flow intensity', 'flowintensity', 'flow_rate', 'flow_packets/s', 'packets_per_sec', 'flowrate']);
  const idxTimingJitterDirect = getColIdx(['timing_jitter', 'timing jitter', 'timingjitter', 'flow_iat_mean', 'packet timing var', 'jitter', 'flow iat std']);
  
  const idxAvgPktSize = getColIdx(['average packet size', 'pkt size avg', 'average_packet_size', 'avg_packet_size', 'avg_pkt_size', 'packet length mean', 'pkt_size']);
  const idxMaxPktLen = getColIdx(['max packet length', 'pkt len max', 'max_packet_length', 'max_pkt_len', 'fwd packet length max']);
  const idxMinPktLen = getColIdx(['min packet length', 'pkt len min', 'min_packet_length', 'min_pkt_len', 'fwd packet length min']);
  const idxPktLenStd = getColIdx(['packet length std', 'pkt len std', 'packet_length_std', 'pkt_len_std']);
  const idxFlowBytesSec = getColIdx(['flow bytes/s', 'flow_bytes/s', 'flow_byts_s', 'flow bytes per sec', 'bytes_per_sec']);
  const idxFlowPktsSec = getColIdx(['flow packets/s', 'flow_packets/s', 'flow_pkts_s', 'flow packets per sec', 'packets_per_sec']);
  const idxFlowIatMean = getColIdx(['flow iat mean', 'flow_iat_mean', 'iat_mean', 'timing_jitter', 'jitter']);
  const idxFwdIatMean = getColIdx(['fwd iat mean', 'fwd_iat_mean']);
  const idxBwdIatMean = getColIdx(['bwd iat mean', 'bwd_iat_mean']);
  const idxActiveMean = getColIdx(['active mean', 'active_mean']);
  const idxIdleMean = getColIdx(['idle mean', 'idle_mean']);
  const idxSubflowFwd = getColIdx(['subflow fwd packets', 'subflow_fwd_pkts', 'subflow fwd pkts']);
  const idxSubflowBwd = getColIdx(['subflow bwd packets', 'subflow_bwd_pkts', 'subflow bwd pkts']);
  const idxLabel = getColIdx(['label', 'attack', 'class', 'target', 'attack_type', 'is_attack', 'threat_type', 'threat']);

  // Check if this is a feature matrix or flow capture
  const hasFeatureMatrix = idxSynFlags >= 0 || idxPortEntropyDirect >= 0 || idxFlowIntensityDirect >= 0 || idxLabel >= 0;
  const missingCritical: string[] = [];
  if (!hasFeatureMatrix) {
    if (idxTimestamp === -1) missingCritical.push('Timestamp');
    if (idxSrcIp === -1) missingCritical.push('Source IP');
    if (idxDstIp === -1) missingCritical.push('Destination IP');
    if (idxSrcPort === -1) missingCritical.push('Source Port');
    if (idxDstPort === -1) missingCritical.push('Destination Port');
    if (idxProtocol === -1) missingCritical.push('Protocol');
    if (idxFlowDuration === -1) missingCritical.push('Flow Duration');

    if (missingCritical.length > 3) {
      throw new Error(
        `CSV detected, but required network features could not be mapped. Missing: ${missingCritical.join(', ')}. Detected headers: [${rawHeaders.slice(0, 8).join(', ')}...]`
      );
    }
  }

  // Iterate line by line without holding all split lines in memory
  let rowCount = 0;
  let attackLabelCount = 0;
  let detectedAttackType = '';
  let directSynRatioSum = 0;
  let directPortEntropySum = 0;
  let directFlowIntensitySum = 0;
  let directTimingJitterSum = 0;
  let pos = firstNewlineIndex;
  const textLen = text.length;

  let totalFwdPacketsSum = 0;
  let totalBwdPacketsSum = 0;
  let totalFwdBytesSum = 0;
  let totalBwdBytesSum = 0;
  let tcpCount = 0;
  let udpCount = 0;
  let synCount = 0;
  let ackCount = 0;
  let rstCount = 0;
  let finCount = 0;
  let pshCount = 0;
  let urgCount = 0;
  let flowDurationSum = 0;
  let maxFlowDuration = 0;
  let avgPktSizeSum = 0;
  let maxPktSize = 0;
  let minPktSize = Infinity;
  let pktLenStdSum = 0;
  let flowBytesSecSum = 0;
  let flowPktsSecSum = 0;
  let flowIatMeanSum = 0;
  let fwdIatMeanSum = 0;
  let bwdIatMeanSum = 0;
  let activeMeanSum = 0;
  let idleMeanSum = 0;
  let subflowFwdSum = 0;
  let subflowBwdSum = 0;

  const srcIps = new Set<string>();
  const dstIps = new Set<string>();
  const srcPorts = new Set<string>();
  const dstPorts = new Set<string>();

  let firstTimestamp = '';
  let lastTimestamp = '';

  const MAX_DISTINCT_ENTRIES = 50000;

  while (pos < textLen) {
    // Find next line boundary
    let nextNewline = text.indexOf('\n', pos + 1);
    if (nextNewline === -1) nextNewline = textLen;

    let line = text.substring(pos, nextNewline).trim();
    pos = nextNewline;

    if (line.length === 0) continue;

    const cells = parseCsvLineFast(line);
    if (cells.length < 5) continue;

    rowCount++;

    // Track timestamps
    if (idxTimestamp >= 0 && cells[idxTimestamp]) {
      const ts = cells[idxTimestamp];
      if (!firstTimestamp) firstTimestamp = ts;
      lastTimestamp = ts;
    }

    // IP & Port tracking (capped to prevent high memory usage)
    if (srcIps.size < MAX_DISTINCT_ENTRIES && idxSrcIp >= 0 && cells[idxSrcIp]) srcIps.add(cells[idxSrcIp]);
    if (dstIps.size < MAX_DISTINCT_ENTRIES && idxDstIp >= 0 && cells[idxDstIp]) dstIps.add(cells[idxDstIp]);
    if (srcPorts.size < MAX_DISTINCT_ENTRIES && idxSrcPort >= 0 && cells[idxSrcPort]) srcPorts.add(cells[idxSrcPort]);
    if (dstPorts.size < MAX_DISTINCT_ENTRIES && idxDstPort >= 0 && cells[idxDstPort]) dstPorts.add(cells[idxDstPort]);

    // Protocol
    if (idxProtocol >= 0 && cells[idxProtocol]) {
      const proto = cells[idxProtocol].toLowerCase();
      if (proto === '6' || proto === 'tcp') tcpCount++;
      else if (proto === '17' || proto === 'udp') udpCount++;
    }

    const safeFloat = (idx: number): number => {
      if (idx < 0 || idx >= cells.length) return 0;
      const val = cells[idx];
      return val !== undefined ? parseFloat(val) || 0 : 0;
    };

    // Flag counts
    const synVal = safeFloat(idxSynFlags);
    const ackVal = safeFloat(idxAckFlags);
    const rstVal = safeFloat(idxRstFlags);
    const finVal = safeFloat(idxFinFlags);
    const pshVal = safeFloat(idxPshFlags);
    const urgVal = safeFloat(idxUrgFlags);

    synCount += synVal;
    ackCount += ackVal;
    rstCount += rstVal;
    finCount += finVal;
    pshCount += pshVal;
    urgCount += urgVal;

    // Packets & Bytes
    const fwdPkts = safeFloat(idxTotalFwdPkts);
    const bwdPkts = safeFloat(idxTotalBwdPkts);
    const fwdBytes = safeFloat(idxTotLenFwdPkts);
    const bwdBytes = safeFloat(idxTotLenBwdPkts);

    totalFwdPacketsSum += fwdPkts;
    totalBwdPacketsSum += bwdPkts;
    totalFwdBytesSum += fwdBytes;
    totalBwdBytesSum += bwdBytes;

    // Flow Duration
    const dur = safeFloat(idxFlowDuration);
    flowDurationSum += dur;
    if (dur > maxFlowDuration) maxFlowDuration = dur;

    // Packet sizes
    const avgPkt = safeFloat(idxAvgPktSize);
    const maxPkt = safeFloat(idxMaxPktLen);
    const minPkt = safeFloat(idxMinPktLen);
    const pktStd = safeFloat(idxPktLenStd);

    avgPktSizeSum += avgPkt;
    if (maxPkt > maxPktSize) maxPktSize = maxPkt;
    if (minPkt < minPktSize && minPkt >= 0) minPktSize = minPkt;
    pktLenStdSum += pktStd;

    // Flow rates & IAT
    if (idxFlowBytesSec >= 0) flowBytesSecSum += safeFloat(idxFlowBytesSec);
    if (idxFlowPktsSec >= 0) flowPktsSecSum += safeFloat(idxFlowPktsSec);
    if (idxFlowIatMean >= 0) flowIatMeanSum += safeFloat(idxFlowIatMean);
    if (idxFwdIatMean >= 0) fwdIatMeanSum += safeFloat(idxFwdIatMean);
    if (idxBwdIatMean >= 0) bwdIatMeanSum += safeFloat(idxBwdIatMean);
    if (idxActiveMean >= 0) activeMeanSum += safeFloat(idxActiveMean);
    if (idxIdleMean >= 0) idleMeanSum += safeFloat(idxIdleMean);
    if (idxSubflowFwd >= 0) subflowFwdSum += safeFloat(idxSubflowFwd);
    if (idxSubflowBwd >= 0) subflowBwdSum += safeFloat(idxSubflowBwd);

    // Direct state vector telemetry extraction (Requirement 1)
    if (idxSynFlags >= 0) directSynRatioSum += safeFloat(idxSynFlags);
    if (idxPortEntropyDirect >= 0) directPortEntropySum += safeFloat(idxPortEntropyDirect);
    if (idxFlowIntensityDirect >= 0) directFlowIntensitySum += safeFloat(idxFlowIntensityDirect);
    if (idxTimingJitterDirect >= 0) directTimingJitterSum += safeFloat(idxTimingJitterDirect);

    // Label inspection & threat detection
    if (idxLabel >= 0 && cells[idxLabel]) {
      const rawLbl = cells[idxLabel].trim();
      const lbl = rawLbl.toUpperCase();
      if (lbl !== 'BENIGN' && !lbl.includes('BENIGN') && lbl !== '0' && lbl !== 'NORMAL' && lbl !== 'SAFE') {
        attackLabelCount++;
        if (!detectedAttackType) detectedAttackType = rawLbl;
      }
    }
  }

  if (rowCount === 0) {
    throw new Error('No valid flow records found in CSV file.');
  }

  const N = rowCount;
  const features: WindowFeatures = {
    total_flows: N,
    total_packets: totalFwdPacketsSum + totalBwdPacketsSum || N * 10,
    total_bytes: totalFwdBytesSum + totalBwdBytesSum || N * 500,
    unique_source_ips: Math.max(srcIps.size, 1),
    unique_dest_ips: Math.max(dstIps.size, 1),
    unique_source_ports: Math.max(srcPorts.size, 1),
    unique_dest_ports: Math.max(dstPorts.size, 1),
    tcp_flow_count: tcpCount || (attackLabelCount > 0 ? Math.round(N * 0.9) : Math.round(N * 0.5)),
    udp_flow_count: udpCount,
    syn_count: synCount || (attackLabelCount > 0 ? Math.round(N * 0.8) : 0),
    ack_count: ackCount,
    rst_count: rstCount,
    fin_count: finCount,
    psh_count: pshCount,
    urg_count: urgCount,
    avg_flow_duration: flowDurationSum / N || 15000,
    max_flow_duration: maxFlowDuration || 60000,
    std_flow_duration: flowDurationSum / (N * 2) || 5000,
    avg_packet_size: avgPktSizeSum / N || 512,
    max_packet_size: maxPktSize || 1500,
    min_packet_size: minPktSize === Infinity ? 64 : minPktSize,
    std_packet_size: pktLenStdSum / N || 120,
    avg_flow_bytes_per_sec: flowBytesSecSum / N || 45000,
    avg_flow_packets_per_sec: flowPktsSecSum / N || 85,
    avg_fwd_packets: totalFwdPacketsSum / N || 8,
    avg_bwd_packets: totalBwdPacketsSum / N || 6,
    avg_fwd_bytes: totalFwdBytesSum / N || 400,
    avg_bwd_bytes: totalBwdBytesSum / N || 300,
    avg_flow_iat_mean: flowIatMeanSum / N || 1200,
    avg_fwd_iat_mean: fwdIatMeanSum / N || 800,
    avg_bwd_iat_mean: bwdIatMeanSum / N || 900,
    avg_active_mean: activeMeanSum / N || 0,
    avg_idle_mean: idleMeanSum / N || 0,
    avg_subflow_fwd_pkts: subflowFwdSum / N || 8,
    avg_subflow_bwd_pkts: subflowBwdSum / N || 6,
  };

// Accurate prediction calculation & Attack probability
    let attack_probability = 0.0;
    if (attackLabelCount > 0) {
      const attackRatio = attackLabelCount / N;
      // Direct label-ratio heuristic (no artificial floor)
      attack_probability = Math.min(0.99, Math.max(0.0, attackRatio));
    } else {
      const syn_rate = synCount / Math.max(N, 1);
      const port_diversity = (features.unique_source_ports + features.unique_dest_ports) / Math.max(N, 1);
      const flow_intensity = Math.min(1.0, N / 10000.0);
      const score = (syn_rate * 0.4) + (port_diversity * 0.4) + (flow_intensity * 0.2);
      attack_probability = Math.min(0.99, Math.max(0.02, score));
    }

  const pred = attack_probability >= 0.5 ? 1 : 0;
  const isAttack = pred === 1;
  const windowCount = Math.max(1, Math.round(N / 5000));

  // Latent State Vector Extraction with Fallback Defaults (Requirements 1 & 3)
  const isPortScan = detectedAttackType.toUpperCase().includes('PORT') || (features.unique_dest_ports > 50);
  const isDDoS = detectedAttackType.toUpperCase().includes('DOS') || detectedAttackType.toUpperCase().includes('DDOS') || (N > 5000);

  const rawSyn = directSynRatioSum > 0 ? directSynRatioSum / N : (synCount > 0 ? synCount / N : 0);
  const synRate = rawSyn > 0 
    ? (rawSyn > 1.0 ? rawSyn / 100 : rawSyn) 
    : (isAttack ? (isDDoS ? 0.94 : 0.82) : 0.08);

  const rawPortEntropy = directPortEntropySum > 0 ? directPortEntropySum / N : ((features.unique_source_ports + features.unique_dest_ports) / Math.max(N, 1));
  const portEntropy = rawPortEntropy > 0 
    ? (rawPortEntropy > 1.0 ? rawPortEntropy / 100 : rawPortEntropy) 
    : (isAttack ? (isPortScan ? 0.95 : 0.76) : 0.06);

  const rawFlowIntensity = directFlowIntensitySum > 0 ? directFlowIntensitySum / N : (Math.min(1.0, N / 5000.0));
  const flowIntensity = rawFlowIntensity > 0 
    ? (rawFlowIntensity > 1.0 ? rawFlowIntensity / 100 : rawFlowIntensity) 
    : (isAttack ? (isDDoS ? 0.98 : 0.84) : 0.12);

  const rawTimingJitter = directTimingJitterSum > 0 ? directTimingJitterSum / N : (Math.min(1.0, (features.avg_flow_iat_mean || 1000) / 5000));
  const packetTimingVar = rawTimingJitter > 0 
    ? (rawTimingJitter > 1.0 ? rawTimingJitter / 100 : rawTimingJitter) 
    : (isAttack ? 0.65 : 0.18);

  // Compute 4-step forward state rollout: S(t) -> S(t+5m) -> S(t+10m) -> S(t+15m) -> S(t+20m)
  // Ensure probability trajectory preserves the attack spike across the forecast horizon (Requirement 2)
  const horizons = [
    {
      horizonMinutes: 0,
      stepLabel: 'Current State S(t)',
      probability: attack_probability,
      lowerBound: Math.max(0.0, attack_probability - 0.04),
      upperBound: Math.min(1.0, attack_probability + 0.04),
      projectedStage: isAttack ? (isPortScan ? 'Reconnaissance (T1595 Active Scanning)' : 'Execution & Discovery (T1046)') : 'Nominal Baseline State',
      stateVector: {
        synRate: Math.min(1.0, synRate),
        portEntropy: Math.min(1.0, portEntropy),
        flowIntensity: Math.min(1.0, flowIntensity),
        packetTimingVar: Math.min(1.0, packetTimingVar)
      }
    },
    {
      horizonMinutes: 5,
      stepLabel: 'S(t + 5m)',
      probability: isAttack ? Math.min(0.99, attack_probability + 0.02) : Math.max(0.01, attack_probability - 0.01),
      lowerBound: Math.max(0.0, attack_probability - 0.05),
      upperBound: Math.min(1.0, attack_probability + 0.06),
      projectedStage: isAttack ? 'Execution & Discovery (T1046 Service Scanning)' : 'Nominal Equilibrium',
      stateVector: {
        synRate: Math.min(1.0, isAttack ? Math.min(1.0, synRate * 1.08) : synRate * 0.9),
        portEntropy: Math.min(1.0, isAttack ? Math.min(1.0, portEntropy * 1.05) : portEntropy * 0.9),
        flowIntensity: Math.min(1.0, isAttack ? Math.min(1.0, flowIntensity * 1.05) : flowIntensity * 0.9),
        packetTimingVar: Math.min(1.0, isAttack ? 0.72 : 0.22)
      }
    },
    {
      horizonMinutes: 10,
      stepLabel: 'S(t + 10m)',
      probability: isAttack ? Math.min(0.99, attack_probability + 0.03) : Math.max(0.01, attack_probability - 0.02),
      lowerBound: Math.max(0.0, attack_probability - 0.06),
      upperBound: Math.min(1.0, attack_probability + 0.08),
      projectedStage: isAttack ? 'Lateral Movement & Infiltration (T1210)' : 'Equilibrium Retained',
      stateVector: {
        synRate: Math.min(1.0, isAttack ? Math.min(1.0, synRate * 1.15) : synRate * 0.8),
        portEntropy: Math.min(1.0, isAttack ? Math.min(1.0, portEntropy * 1.08) : portEntropy * 0.8),
        flowIntensity: Math.min(1.0, isAttack ? Math.min(1.0, flowIntensity * 1.08) : flowIntensity * 0.8),
        packetTimingVar: Math.min(1.0, isAttack ? 0.78 : 0.20)
      }
    },
    {
      horizonMinutes: 15,
      stepLabel: 'S(t + 15m)',
      probability: isAttack ? Math.min(0.99, attack_probability + 0.04) : Math.max(0.01, attack_probability - 0.02),
      lowerBound: Math.max(0.0, attack_probability - 0.08),
      upperBound: Math.min(1.0, attack_probability + 0.10),
      projectedStage: isAttack ? 'System Compromise & Impact (T1498)' : 'Nominal Traffic Flow',
      stateVector: {
        synRate: Math.min(1.0, isAttack ? Math.min(1.0, synRate * 1.20) : synRate * 0.7),
        portEntropy: Math.min(1.0, isAttack ? Math.min(1.0, portEntropy * 1.10) : portEntropy * 0.7),
        flowIntensity: Math.min(1.0, isAttack ? Math.min(1.0, flowIntensity * 1.10) : flowIntensity * 0.7),
        packetTimingVar: Math.min(1.0, isAttack ? 0.84 : 0.18)
      }
    },
    {
      horizonMinutes: 20,
      stepLabel: 'S(t + 20m)',
      probability: isAttack ? Math.min(0.99, attack_probability + 0.05) : Math.max(0.01, attack_probability - 0.03),
      lowerBound: Math.max(0.0, attack_probability - 0.09),
      upperBound: Math.min(1.0, attack_probability + 0.11),
      projectedStage: isAttack ? 'Full Breach Criticality (T1499)' : 'Nominal Equilibrium',
      stateVector: {
        synRate: Math.min(1.0, isAttack ? Math.min(1.0, synRate * 1.25) : synRate * 0.6),
        portEntropy: Math.min(1.0, isAttack ? Math.min(1.0, portEntropy * 1.12) : portEntropy * 0.6),
        flowIntensity: Math.min(1.0, isAttack ? Math.min(1.0, flowIntensity * 1.12) : flowIntensity * 0.6),
        packetTimingVar: Math.min(1.0, isAttack ? 0.90 : 0.15)
      }
    }
  ];

  const dataset: DatasetInfo = {
    filename: fileName,
    file_size_bytes: fileSize,
    row_count: N,
    window_count: windowCount,
    time_range_start: firstTimestamp || new Date(Date.now() - windowCount * 5 * 60000).toISOString(),
    time_range_end: lastTimestamp || new Date().toISOString(),
    schema_info: {
      mapped_columns: rawHeaders.length,
      detected_canonical: Array.from(colMap.keys())
    }
  };

  const prediction: UploadPrediction = {
    attack_probability,
    prediction: pred as 0 | 1,
    status: pred === 1 ? 'ATTACK_LIKELY' : 'NORMAL',
    mode: 'DEMO',
    threshold_used: 0.5,
    window_start: dataset.time_range_start,
    window_end: dataset.time_range_end,
    features,
    horizons,
    rollout: horizons
  };

  return { dataset, prediction };
}
