import { ReactNode, useEffect, useCallback, useRef, useSyncExternalStore } from 'react';
import { create } from 'zustand';
import { apiClient, createWindowFeatures } from '@/services/api';
import type { WindowFeatures } from '@/types/api';
import type { DashboardHealth, DashboardPrediction, NetworkTelemetry, RiskTimelineData, RiskTimelinePoint, ModelPerformanceData, DefenderFocus, DiagnosticsData, ActivityEvent } from '@/types/dashboard';
import { getDevicePerformanceTier, prefersReducedMotion } from '@/utils/helpers';

interface DashboardState {
  prediction: DashboardPrediction | null;
  health: DashboardHealth | null;
  telemetry: NetworkTelemetry | null;
  riskTimeline: RiskTimelineData | null;
  activities: ActivityEvent[];
  modelPerformance: ModelPerformanceData | null;
  defenderFocus: DefenderFocus | null;
  toasts: Toast[];
  apiStatus: 'connected' | 'degraded' | 'offline' | 'checking';
  isLoading: boolean;
  error: string | null;
  currentFeatures: WindowFeatures;
  threshold: number;
  modelMode: 'REAL_MODEL' | 'DEMO';
  sidebarCollapsed: boolean;
  reducedMotion: boolean;
  soundEnabled: boolean;
  highContrast: boolean;
  diagnostics: DiagnosticsData | null;

  setPrediction: (prediction: DashboardPrediction) => void;
  setHealth: (health: DashboardHealth) => void;
  setTelemetry: (telemetry: NetworkTelemetry) => void;
  setRiskTimeline: (timeline: RiskTimelineData) => void;
  addActivity: (activity: Omit<ActivityEvent, 'id' | 'timestamp'>) => void;
  setModelPerformance: (performance: ModelPerformanceData | null) => void;
  setDefenderFocus: (focus: DefenderFocus) => void;
  addToast: (toast: Omit<Toast, 'id' | 'created_at'>) => void;
  removeToast: (id: string) => void;
  setApiStatus: (status: 'connected' | 'degraded' | 'offline' | 'checking') => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setCurrentFeatures: (features: WindowFeatures) => void;
  setThreshold: (threshold: number) => void;
  setModelMode: (mode: 'REAL_MODEL' | 'DEMO') => void;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setReducedMotion: (enabled: boolean) => void;
  setSoundEnabled: (enabled: boolean) => void;
  setHighContrast: (enabled: boolean) => void;
  setDiagnostics: (diagnostics: DiagnosticsData) => void;
}

interface Toast {
  id: string;
  type: 'success' | 'warning' | 'error' | 'info';
  title: string;
  message?: string;
  duration?: number;
  persistent?: boolean;
  action?: { label: string; onClick: () => void };
  progress?: number;
  created_at: number;
}

const DEFAULT_FEATURES = createWindowFeatures({});

export const useDashboardStore = create<DashboardState>()((set) => ({
  prediction: null,
  health: null,
  telemetry: null,
  riskTimeline: null,
  activities: [],
  modelPerformance: null,
  defenderFocus: null,
  toasts: [],
  apiStatus: 'checking',
  isLoading: true,
  error: null,
  currentFeatures: DEFAULT_FEATURES,
  threshold: 0.5,
  modelMode: 'DEMO',
  sidebarCollapsed: false,
  reducedMotion: false,
  soundEnabled: false,
  highContrast: false,
  diagnostics: null,

  setPrediction: (prediction) => set({ prediction }),
  setHealth: (health) => set({ health }),
  setTelemetry: (telemetry) => set({ telemetry }),
  setRiskTimeline: (riskTimeline) => set({ riskTimeline }),
  addActivity: (activity) => set((state) => ({
    activities: [{ ...activity, id: crypto.randomUUID(), timestamp: new Date().toISOString() }, ...state.activities].slice(0, 100),
  })),
  setModelPerformance: (modelPerformance) => set({ modelPerformance }),
  setDefenderFocus: (defenderFocus) => set({ defenderFocus }),
  addToast: (toast) => set((state) => {
    const duplicate = state.toasts.find(
      (t) => t.type === toast.type && t.title === toast.title && t.message === toast.message
    );
    if (duplicate) return state;
    return { toasts: [...state.toasts, { ...toast, id: crypto.randomUUID(), created_at: Date.now() }] };
  }),
  removeToast: (id) => set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
  setApiStatus: (apiStatus) => set({ apiStatus }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
  setCurrentFeatures: (currentFeatures) => set({ currentFeatures }),
  setThreshold: (threshold) => set({ threshold }),
  setModelMode: (modelMode) => set({ modelMode }),
  toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
  setSidebarCollapsed: (sidebarCollapsed) => set({ sidebarCollapsed }),
  setReducedMotion: (reducedMotion) => set({ reducedMotion }),
  setSoundEnabled: (soundEnabled) => set({ soundEnabled }),
  setHighContrast: (highContrast) => set({ highContrast }),
  setDiagnostics: (diagnostics) => set({ diagnostics }),
}));

export function useDashboardStoreSelector<T>(selector: (state: DashboardState) => T): T {
  return useSyncExternalStore(useDashboardStore.subscribe, () => selector(useDashboardStore.getState()), () => selector(useDashboardStore.getState()));
}

export function usePrediction() {
  return useDashboardStoreSelector((state) => state.prediction);
}
export function useHealth() {
  return useDashboardStoreSelector((state) => state.health);
}
export function useTelemetry() {
  return useDashboardStoreSelector((state) => state.telemetry);
}
export function useRiskTimeline() {
  return useDashboardStoreSelector((state) => state.riskTimeline);
}
export function useActivities() {
  return useDashboardStoreSelector((state) => state.activities);
}
export function useModelPerformance() {
  return useDashboardStoreSelector((state) => state.modelPerformance);
}
export function useDefenderFocus() {
  return useDashboardStoreSelector((state) => state.defenderFocus);
}
export function useToasts() {
  return useDashboardStoreSelector((state) => state.toasts);
}
export function useApiStatus() {
  return useDashboardStoreSelector((state) => state.apiStatus);
}
export function useIsLoading() {
  return useDashboardStoreSelector((state) => state.isLoading);
}
export function useError() {
  return useDashboardStoreSelector((state) => state.error);
}
export function useCurrentFeatures() {
  return useDashboardStoreSelector((state) => state.currentFeatures);
}
export function useThreshold() {
  return useDashboardStoreSelector((state) => state.threshold);
}
export function useModelMode() {
  return useDashboardStoreSelector((state) => state.modelMode);
}
export function useSidebarCollapsed() {
  return useDashboardStoreSelector((state) => state.sidebarCollapsed);
}
export function useReducedMotion() {
  return useDashboardStoreSelector((state) => state.reducedMotion);
}
export function useSoundEnabled() {
  return useDashboardStoreSelector((state) => state.soundEnabled);
}
export function useHighContrast() {
  return useDashboardStoreSelector((state) => state.highContrast);
}

const TEST_DATA: WindowFeatures = {
  total_flows: 1247,
  total_packets: 15892,
  total_bytes: 24567890,
  unique_source_ips: 89,
  unique_dest_ips: 156,
  unique_source_ports: 234,
  unique_dest_ports: 187,
  tcp_flow_count: 1123,
  udp_flow_count: 124,
  syn_count: 3421,
  ack_count: 8765,
  rst_count: 123,
  fin_count: 987,
  psh_count: 2456,
  urg_count: 12,
  avg_flow_duration: 1.234,
  max_flow_duration: 45.67,
  std_flow_duration: 3.45,
  avg_packet_size: 1545,
  max_packet_size: 1514,
  min_packet_size: 64,
  std_packet_size: 312,
  avg_flow_bytes_per_sec: 19678,
  avg_flow_packets_per_sec: 12.7,
  avg_fwd_packets: 7.2,
  avg_bwd_packets: 5.5,
  avg_fwd_bytes: 9876,
  avg_bwd_bytes: 5432,
  avg_flow_iat_mean: 0.089,
  avg_fwd_iat_mean: 0.112,
  avg_bwd_iat_mean: 0.156,
  avg_active_mean: 0.45,
  avg_idle_mean: 2.34,
  avg_subflow_fwd_pkts: 2.1,
  avg_subflow_bwd_pkts: 1.8,
};

function computeDerivedTelemetry(features: WindowFeatures): NetworkTelemetry {
  return {
    ...features,
    flow_rate_per_sec: features.total_flows / 300,
    packet_rate_per_sec: features.total_packets / 300,
    byte_rate_per_sec: features.total_bytes / 300,
    syn_rate: features.total_flows > 0 ? features.syn_count / features.total_flows : 0,
    port_diversity: features.total_flows > 0 ? (features.unique_source_ports + features.unique_dest_ports) / features.total_flows : 0,
    tcp_udp_ratio: features.udp_flow_count > 0 ? features.tcp_flow_count / features.udp_flow_count : features.tcp_flow_count,
    avg_flow_size_bytes: features.total_flows > 0 ? features.total_bytes / features.total_flows : 0,
    avg_flow_size_packets: features.total_flows > 0 ? features.total_packets / features.total_flows : 0,
  };
}

function generateRiskTimeline(prediction: DashboardPrediction, history: DashboardPrediction[] = []): RiskTimelineData {
  const now = new Date();
  const points: RiskTimelinePoint[] = [];

  history.slice(-20).forEach((p, i) => {
    points.push({
      timestamp: new Date(now.getTime() - (20 - i) * 5 * 60 * 1000).toISOString(),
      risk_score: p.attack_probability,
      is_forecast: false,
      prediction: p,
    });
  });

  points.push({
    timestamp: now.toISOString(),
    risk_score: prediction.attack_probability,
    is_forecast: true,
    prediction,
    upper_bound: Math.min(1, prediction.attack_probability + 0.15),
    lower_bound: Math.max(0, prediction.attack_probability - 0.15),
  });

  return {
    points,
    current_index: points.length - 1,
    threshold: prediction.threshold_used,
    window_size_minutes: 5,
    forecast_horizon_minutes: 5,
  };
}

function computeDefenderFocus(prediction: DashboardPrediction, telemetry: NetworkTelemetry | null): DefenderFocus {
  const prob = prediction.attack_probability;
  const threshold = prediction.threshold_used;
  const details: string[] = [];
  const based_on: string[] = [];

  if (prob >= threshold) {
    if (telemetry) {
      if (telemetry.syn_rate > 2.0) {
        details.push('SYN rate significantly elevated');
        based_on.push('syn_count');
      }
      if (telemetry.port_diversity > 0.3) {
        details.push('Unusual port diversity detected');
        based_on.push('unique_source_ports, unique_dest_ports');
      }
      if (telemetry.flow_rate_per_sec > 10) {
        details.push('High flow intensity');
        based_on.push('total_flows');
      }
      if (telemetry.urg_count > 5) {
        details.push('URG flag activity detected');
        based_on.push('urg_count');
      }
    }
    return {
      state: 'elevated',
      summary: `Attack risk elevated (${(prob * 100).toFixed(1)}% > ${(threshold * 100).toFixed(0)}% threshold)`,
      details: details.length ? details : ['Multiple attack indicators present'],
      confidence: prob,
      based_on: based_on.length ? based_on : ['aggregate_features'],
    };
  }

  if (prob > threshold * 0.7) {
    return {
      state: 'high_syn',
      summary: `Risk approaching threshold (${(prob * 100).toFixed(1)}%)`,
      details: ['Monitor for trend changes'],
      confidence: 1 - prob,
      based_on: ['attack_probability'],
    };
  }

  return {
    state: 'baseline',
    summary: 'Network behavior remains within baseline',
    details: ['No significant attack indicators detected'],
    confidence: 1 - prob,
    based_on: ['attack_probability'],
  };
}

function buildModelPerformance(health: DashboardHealth): ModelPerformanceData | null {
  if (!health.model_info?.test_metrics) return null;
  const test = health.model_info.test_metrics;
  return {
    validation: health.model_info.test_metrics,
    test,
    algorithm: health.model_info.algorithm || 'Logistic Regression',
    feature_count: health.model_info.features || 35,
    window_size_minutes: health.model_info.window_size_minutes || 5,
    forecast_horizon_minutes: health.model_info.forecast_horizon_minutes || 5,
    evaluation_notes: test.tp === 0 && test.fn > 0
      ? 'WARNING: Zero true positives on test set. Model may not generalize. Treat predictions with caution.'
      : undefined,
    threshold_sweep: health.model_info.test_metrics ? undefined : undefined,
    feature_importance: undefined,
  };
}

export function DashboardProvider({ children }: { children: ReactNode }) {
  const {
    setPrediction,
    setHealth,
    setTelemetry,
    setRiskTimeline,
    setModelPerformance,
    setDefenderFocus,
    addToast,
    setDiagnostics,
    setApiStatus,
    setLoading,
    setError,
    setModelMode,
    threshold,
    currentFeatures,
    modelMode,
  } = useDashboardStore();

  const predictionHistoryRef = useRef<DashboardPrediction[]>([]);
  const diagnosticsRef = useRef<DiagnosticsData>({
    api_latency_ms: 0,
    last_health_check: null,
    last_prediction_update: null,
    endpoint_status: {},
    frontend_version: import.meta.env.VITE_APP_VERSION || '1.0.0',
    model_mode: modelMode,
    uptime_seconds: 0,
  });
  const startTimeRef = useRef(Date.now());

  const updateDiagnostics = useCallback(() => {
    diagnosticsRef.current = {
      ...diagnosticsRef.current,
      uptime_seconds: Math.floor((Date.now() - startTimeRef.current) / 1000),
      model_mode: useDashboardStore.getState().modelMode,
    };
    setDiagnostics(diagnosticsRef.current);
  }, [setDiagnostics]);

  const fetchHealth = useCallback(async () => {
    try {
      const health = await apiClient.getHealth();
      setHealth(health);
      setModelMode(health.model_mode);
      setModelPerformance(buildModelPerformance(health));

      diagnosticsRef.current.last_health_check = health.checked_at;
      diagnosticsRef.current.api_latency_ms = health.latency_ms;
      diagnosticsRef.current.endpoint_status = { '/health': 'ok' };
      updateDiagnostics();
    } catch (error) {
      diagnosticsRef.current.endpoint_status = { '/health': 'error' };
      updateDiagnostics();
      console.error('Health check failed:', error);
    }
  }, [setHealth, setModelMode, setModelPerformance, updateDiagnostics]);

  const fetchPrediction = useCallback(async (features?: WindowFeatures) => {
    const useFeatures = features || currentFeatures;
    try {
      const prediction = await apiClient.predict(useFeatures, threshold);
      setPrediction(prediction);
      setTelemetry(computeDerivedTelemetry(useFeatures));
      setRiskTimeline(generateRiskTimeline(prediction, predictionHistoryRef.current));
      setDefenderFocus(computeDefenderFocus(prediction, computeDerivedTelemetry(useFeatures)));

      predictionHistoryRef.current.push(prediction);
      if (predictionHistoryRef.current.length > 50) predictionHistoryRef.current.shift();

      diagnosticsRef.current.last_prediction_update = prediction.received_at;
      diagnosticsRef.current.endpoint_status = { '/predict': 'ok' };
      updateDiagnostics();
    } catch (error) {
      diagnosticsRef.current.endpoint_status = { '/predict': 'error' };
      updateDiagnostics();
      const message = error instanceof Error ? error.message : 'Prediction failed';
      setError(message);
      addToast({ type: 'error', title: 'Prediction Failed', message, persistent: true });
      console.error('Prediction failed:', error);
    }
  }, [currentFeatures, threshold, setPrediction, setTelemetry, setRiskTimeline, setDefenderFocus, addToast, setError, updateDiagnostics]);

  useEffect(() => {
    const reducedMotion = prefersReducedMotion();
    useDashboardStore.getState().setReducedMotion(reducedMotion);

    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handler = (e: MediaQueryListEvent) => useDashboardStore.getState().setReducedMotion(e.matches);
    mediaQuery.addEventListener('change', handler);

    const tier = getDevicePerformanceTier();
    if (tier === 'low') {
      useDashboardStore.getState().setReducedMotion(true);
    }

    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const settle = () => { if (!cancelled) setLoading(false); };

    fetchHealth().finally(settle);

    const healthInterval = setInterval(fetchHealth, 30000);
    const predictionInterval = setInterval(() => fetchPrediction(), 15000);
    const diagnosticsInterval = setInterval(updateDiagnostics, 5000);

    if (import.meta.env.VITE_ENABLE_MOCK === 'true') {
      const mockPrediction = apiClient.predict(TEST_DATA, threshold);
      mockPrediction.then(setPrediction).catch(console.error).finally(settle);
    } else {
      fetchPrediction().finally(settle);
    }

    return () => {
      cancelled = true;
      clearInterval(healthInterval);
      clearInterval(predictionInterval);
      clearInterval(diagnosticsInterval);
      apiClient.stopAllPolling();
      setLoading(false);
    };
  }, [fetchHealth, fetchPrediction, threshold, updateDiagnostics, setLoading]);

  useEffect(() => {
    const unsubHealth = apiClient.onHealthChange((health) => {
      setHealth(health);
      setModelMode(health.model_mode);
    });

    const unsubStatus = apiClient.onStatusChange((status) => {
      setApiStatus(status);
      if (status === 'connected') {
        addToast({ type: 'success', title: 'API Connected', message: 'Backend connection restored' });
      } else if (status === 'offline') {
        addToast({ type: 'error', title: 'API Offline', message: 'Lost connection to backend', persistent: true });
      } else if (status === 'degraded') {
        addToast({ type: 'warning', title: 'API Degraded', message: 'Backend responding with errors' });
      }
    });

    return () => {
      unsubHealth();
      unsubStatus();
    };
  }, [setHealth, setModelMode, setApiStatus, addToast]);

  return <>{children}</>;
}