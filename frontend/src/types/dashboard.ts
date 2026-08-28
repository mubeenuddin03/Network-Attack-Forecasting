import type { PredictResponse, HealthResponse, WindowFeatures, ModelMode, TestMetrics } from './api';

export interface DashboardPrediction extends PredictResponse {
  timestamp: string;
  received_at: string;
  latency_ms: number;
}

export interface DatasetInfo {
  filename: string;
  file_size_bytes: number;
  row_count: number;
  window_count: number;
  time_range_start: string;
  time_range_end: string;
  schema_info?: {
    mapped_columns?: number;
    detected_canonical?: string[];
  };
}

export interface UploadPrediction {
  attack_probability: number;
  prediction: 0 | 1;
  status: 'ATTACK_LIKELY' | 'NORMAL';
  mode: ModelMode;
  threshold_used: number;
  window_start: string;
  window_end: string;
  features: WindowFeatures;
  horizons?: Array<{
    horizonMinutes: number;
    stepLabel: string;
    probability: number;
    lowerBound: number;
    upperBound: number;
    projectedStage: string;
    stateVector: { synRate: number; portEntropy: number; flowIntensity: number; packetTimingVar: number };
    predictedFeatures?: Record<string, number>;
  }>;
  rollout?: Array<any>;
  windows?: Array<{
    window_start: string;
    window_end: string;
    attack_probability: number;
    prediction: 0 | 1;
    status: 'ATTACK_LIKELY' | 'NORMAL';
  }>;
}

export interface UploadResponse {
  dataset: DatasetInfo;
  prediction: UploadPrediction;
}

export interface DashboardHealth extends HealthResponse {
  checked_at: string;
  latency_ms: number;
}

export interface NetworkTelemetry extends WindowFeatures {
  flow_rate_per_sec: number;
  packet_rate_per_sec: number;
  byte_rate_per_sec: number;
  syn_rate: number;
  port_diversity: number;
  tcp_udp_ratio: number;
  avg_flow_size_bytes: number;
  avg_flow_size_packets: number;
}

export interface RiskTimelinePoint {
  timestamp: string;
  risk_score: number;
  is_forecast: boolean;
  prediction?: DashboardPrediction;
  upper_bound?: number;
  lower_bound?: number;
}

export interface RiskTimelineData {
  points: RiskTimelinePoint[];
  current_index: number;
  threshold: number;
  window_size_minutes: number;
  forecast_horizon_minutes: number;
}

export interface ActivityEvent {
  id: string;
  type: ActivityType;
  severity: 'info' | 'warning' | 'critical' | 'success';
  message: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

export type ActivityType =
  | 'prediction_update'
  | 'health_check'
  | 'model_loaded'
  | 'model_failed'
  | 'threshold_changed'
  | 'api_reconnected'
  | 'api_disconnected'
  | 'data_uploaded'
  | 'forecast_refresh'
  | 'settings_changed';

export interface ModelPerformanceData {
  validation?: TestMetrics;
  test?: TestMetrics;
  algorithm: string;
  feature_count: number;
  window_size_minutes: number;
  forecast_horizon_minutes: number;
  evaluation_notes?: string;
  threshold_sweep?: Array<{
    threshold: number;
    precision: number;
    recall: number;
    f1: number;
  }>;
  feature_importance?: Record<string, number>;
}

export interface DefenderFocus {
  state: 'elevated' | 'baseline' | 'high_syn' | 'normal';
  summary: string;
  details: string[];
  confidence: number;
  based_on: string[];
}

export interface CommandPaletteItem {
  id: string;
  label: string;
  description?: string;
  shortcut?: string;
  group: string;
  action: () => void | Promise<void>;
  icon?: React.ComponentType<{ className?: string }>;
}

export interface Toast {
  id: string;
  type: 'success' | 'warning' | 'error' | 'info';
  title: string;
  message?: string;
  duration?: number;
  persistent?: boolean;
  action?: {
    label: string;
    onClick: () => void;
  };
  progress?: number;
  created_at: number;
}

export interface DiagnosticsData {
  api_latency_ms: number;
  last_health_check: string | null;
  last_prediction_update: string | null;
  endpoint_status: Record<string, 'ok' | 'error' | 'unknown'>;
  frontend_version: string;
  backend_version?: string;
  model_mode: ModelMode;
  uptime_seconds: number;
}