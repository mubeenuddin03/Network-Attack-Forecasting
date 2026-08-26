import type {
  PredictRequest,
  PredictResponse,
  HealthResponse,
  RootResponse,
  WindowFeatures,
  ModelMode,
} from '@/types/api';
import type { DashboardPrediction, DashboardHealth } from '@/types/dashboard';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';
const REQUEST_TIMEOUT = 10000;
const HEALTH_CHECK_INTERVAL = 30000;
const PREDICTION_POLL_INTERVAL = 15000;

export interface CSVUploadResult {
  filename: string;
  size_bytes: number;
  rows: number;
  windows: number;
  latest_window: WindowFeatures;
  message: string;
}

class ApiClient {
  private baseUrl: string;
  private abortControllers: Map<string, AbortController> = new Map();
  private healthCheckTimer: ReturnType<typeof setInterval> | null = null;
  private predictionPollTimer: ReturnType<typeof setInterval> | null = null;
  private healthCallbacks: Set<(health: DashboardHealth) => void> = new Set();
  private predictionCallbacks: Set<(prediction: DashboardPrediction) => void> = new Set();
  private statusCallbacks: Set<(status: 'connected' | 'degraded' | 'offline') => void> = new Set();
  private currentStatus: 'connected' | 'degraded' | 'offline' = 'offline';
  private isPolling = false;

  constructor(baseUrl: string = API_BASE_URL) { this.baseUrl = baseUrl.replace(/\/+$/, ''); }

  private async request<T>(endpoint: string, options: RequestInit = {}, timeout: number = REQUEST_TIMEOUT): Promise<T> {
    const controller = new AbortController();
    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    this.abortControllers.set(id, controller);
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, { ...options, headers: { 'Content-Type': 'application/json', ...options.headers }, signal: controller.signal });
      clearTimeout(timeoutId); this.abortControllers.delete(id);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new ApiError(response.status, errorData.detail || `HTTP ${response.status}: ${response.statusText}`, errorData);
      }
      return await response.json();
    } catch (error) {
      clearTimeout(timeoutId); this.abortControllers.delete(id);
      if (error instanceof ApiError) throw error;
      if (error instanceof DOMException && error.name === 'AbortError') throw new ApiError(408, 'Request timeout', { endpoint });
      throw new ApiError(0, error instanceof Error ? error.message : 'Network error', { endpoint });
    }
  }

  async getRoot(): Promise<RootResponse> { return this.request<RootResponse>('/'); }

  async getHealth(): Promise<DashboardHealth> {
    const start = performance.now();
    const health = await this.request<HealthResponse>('/health');
    const dashboardHealth: DashboardHealth = { ...health, checked_at: new Date().toISOString(), latency_ms: Math.round(performance.now() - start) };
    this.notifyHealthCallbacks(dashboardHealth);
    return dashboardHealth;
  }

  async predict(features: WindowFeatures, threshold: number = 0.5): Promise<DashboardPrediction> {
    const start = performance.now();
    const response = await this.request<PredictResponse>('/predict', { method: 'POST', body: JSON.stringify({ features, threshold } as PredictRequest) });
    const prediction: DashboardPrediction = { ...response, timestamp: new Date().toISOString(), received_at: new Date().toISOString(), latency_ms: Math.round(performance.now() - start) };
    this.notifyPredictionCallbacks(prediction);
    return prediction;
  }

  uploadCSV(file: File, onProgress?: (percent: number) => void): Promise<CSVUploadResult> {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', `${this.baseUrl}/upload-csv`);
      xhr.responseType = 'json';
      xhr.upload.onprogress = event => { if (event.lengthComputable) onProgress?.(Math.round((event.loaded / event.total) * 100)); };
      xhr.onload = () => {
        const data = xhr.response || {};
        if (xhr.status >= 200 && xhr.status < 300) resolve(data as CSVUploadResult);
        else reject(new ApiError(xhr.status, data.detail || `Upload failed (HTTP ${xhr.status})`, data));
      };
      xhr.onerror = () => reject(new ApiError(0, 'Upload failed. Check that the backend is running.'));
      xhr.ontimeout = () => reject(new ApiError(408, 'Upload timed out.'));
      const body = new FormData();
      body.append('file', file);
      xhr.send(body);
    });
  }

  onHealthChange(callback: (health: DashboardHealth) => void): () => void { this.healthCallbacks.add(callback); return () => this.healthCallbacks.delete(callback); }
  onPredictionChange(callback: (prediction: DashboardPrediction) => void): () => void { this.predictionCallbacks.add(callback); return () => this.predictionCallbacks.delete(callback); }
  onStatusChange(callback: (status: 'connected' | 'degraded' | 'offline') => void): () => void { this.statusCallbacks.add(callback); return () => this.statusCallbacks.delete(callback); }
  getStatus(): 'connected' | 'degraded' | 'offline' { return this.currentStatus; }

  private notifyHealthCallbacks(health: DashboardHealth) {
    const newStatus = health.status === 'healthy' ? 'connected' : 'degraded';
    if (newStatus !== this.currentStatus) { this.currentStatus = newStatus; this.statusCallbacks.forEach(cb => cb(newStatus)); }
    this.healthCallbacks.forEach(cb => cb(health));
  }
  private notifyPredictionCallbacks(prediction: DashboardPrediction) { this.predictionCallbacks.forEach(cb => cb(prediction)); }

  startHealthPolling(interval: number = HEALTH_CHECK_INTERVAL) { if (this.healthCheckTimer) return; this.isPolling = true; this.getHealth().catch(() => {}); this.healthCheckTimer = setInterval(() => { if (this.isPolling) this.getHealth().catch(() => {}); }, interval); }
  stopHealthPolling() { if (this.healthCheckTimer) { clearInterval(this.healthCheckTimer); this.healthCheckTimer = null; } this.isPolling = false; }
  startPredictionPolling(features: WindowFeatures, threshold: number, interval: number = PREDICTION_POLL_INTERVAL) { if (this.predictionPollTimer) return; this.isPolling = true; const poll = () => this.predict(features, threshold).catch(() => {}); poll(); this.predictionPollTimer = setInterval(poll, interval); }
  stopPredictionPolling() { if (this.predictionPollTimer) { clearInterval(this.predictionPollTimer); this.predictionPollTimer = null; } }
  stopAllPolling() { this.stopHealthPolling(); this.stopPredictionPolling(); this.isPolling = false; }
  cancelAllRequests() { this.abortControllers.forEach(controller => controller.abort()); this.abortControllers.clear(); }
  destroy() { this.stopAllPolling(); this.cancelAllRequests(); this.healthCallbacks.clear(); this.predictionCallbacks.clear(); this.statusCallbacks.clear(); }
}

export class ApiError extends Error { constructor(public readonly status: number, message: string, public readonly details?: unknown) { super(message); this.name = 'ApiError'; } }
export const apiClient = new ApiClient();

export function createWindowFeatures(partial: Partial<WindowFeatures>): WindowFeatures {
  const defaults: WindowFeatures = { total_flows:0,total_packets:0,total_bytes:0,unique_source_ips:0,unique_dest_ips:0,unique_source_ports:0,unique_dest_ports:0,tcp_flow_count:0,udp_flow_count:0,syn_count:0,ack_count:0,rst_count:0,fin_count:0,psh_count:0,urg_count:0,avg_flow_duration:0,max_flow_duration:0,std_flow_duration:0,avg_packet_size:0,max_packet_size:0,min_packet_size:0,std_packet_size:0,avg_flow_bytes_per_sec:0,avg_flow_packets_per_sec:0,avg_fwd_packets:0,avg_bwd_packets:0,avg_fwd_bytes:0,avg_bwd_bytes:0,avg_flow_iat_mean:0,avg_fwd_iat_mean:0,avg_bwd_iat_mean:0,avg_active_mean:0,avg_idle_mean:0,avg_subflow_fwd_pkts:0,avg_subflow_bwd_pkts:0 };
  return { ...defaults, ...partial };
}
export function isRealModel(mode: ModelMode): boolean { return mode === 'REAL_MODEL'; }
export function getModelModeLabel(mode: ModelMode): string { return mode === 'REAL_MODEL' ? 'Real Model' : 'Demo Mode'; }
export function getModelModeDescription(mode: ModelMode): string { return mode === 'REAL_MODEL' ? 'Using trained Logistic Regression model' : 'Using heuristic fallback (not a trained model)'; }
