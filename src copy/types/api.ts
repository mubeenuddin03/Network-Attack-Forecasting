export interface WindowFeatures {
  total_flows: number;
  total_packets: number;
  total_bytes: number;
  unique_source_ips: number;
  unique_dest_ips: number;
  unique_source_ports: number;
  unique_dest_ports: number;
  tcp_flow_count: number;
  udp_flow_count: number;
  syn_count: number;
  ack_count: number;
  rst_count: number;
  fin_count: number;
  psh_count: number;
  urg_count: number;
  avg_flow_duration: number;
  max_flow_duration: number;
  std_flow_duration: number;
  avg_packet_size: number;
  max_packet_size: number;
  min_packet_size: number;
  std_packet_size: number;
  avg_flow_bytes_per_sec: number;
  avg_flow_packets_per_sec: number;
  avg_fwd_packets: number;
  avg_bwd_packets: number;
  avg_fwd_bytes: number;
  avg_bwd_bytes: number;
  avg_flow_iat_mean: number;
  avg_fwd_iat_mean: number;
  avg_bwd_iat_mean: number;
  avg_active_mean: number;
  avg_idle_mean: number;
  avg_subflow_fwd_pkts: number;
  avg_subflow_bwd_pkts: number;
}

export interface PredictRequest {
  features: WindowFeatures;
  threshold?: number;
}

export type ModelMode = 'REAL_MODEL' | 'DEMO';

export interface PredictResponse {
  attack_probability: number;
  prediction: 0 | 1;
  status: 'ATTACK_LIKELY' | 'NORMAL';
  mode: ModelMode;
  threshold_used: number;
}

export interface ModelInfo {
  algorithm?: string;
  features?: number;
  window_size_minutes?: number;
  forecast_horizon_minutes?: number;
  test_metrics?: TestMetrics;
  note?: string;
  error?: string;
}

export interface TestMetrics {
  precision: number;
  recall: number;
  f1: number;
  pr_auc: number;
  roc_auc: number;
  fpr: number;
  confusion_matrix: number[][];
  tn: number;
  fp: number;
  fn: number;
  tp: number;
}

export interface HealthResponse {
  status: 'healthy' | 'degraded';
  model_loaded: boolean;
  model_mode: ModelMode;
  model_info?: ModelInfo;
}

export interface RootResponse {
  message: string;
  version: string;
  endpoints: Record<string, string>;
}

export type ApiStatus = 'connected' | 'degraded' | 'offline' | 'checking';

export interface ApiError {
  code: string;
  message: string;
  details?: unknown;
  timestamp: string;
}