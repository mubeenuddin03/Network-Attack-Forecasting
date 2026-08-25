import { motion } from 'framer-motion';
import { cn, formatPercent } from '@/utils/helpers';
import { useModelPerformance, useHealth } from '@/contexts/DashboardContext';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import {
  Target,
  CheckCircle,
  AlertTriangle,
  XCircle,
  BarChart2,
  TrendingUp,
  Database,
  Cpu,
  Settings,
  AlertCircle,
} from 'lucide-react';

interface MetricTileProps {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: number;
  status?: 'good' | 'warning' | 'poor' | 'unknown';
  description?: string;
}

function MetricTile({ label, value, icon, trend, status = 'unknown', description }: MetricTileProps) {
  const statusColors = {
    good: { bg: 'bg-secure-500/15', border: 'border-secure-500/30', text: 'text-secure-400', iconBg: 'bg-secure-500/20' },
    warning: { bg: 'bg-amber-500/15', border: 'border-amber-500/30', text: 'text-amber-400', iconBg: 'bg-amber-500/20' },
    poor: { bg: 'bg-critical-500/15', border: 'border-critical-500/30', text: 'text-critical-400', iconBg: 'bg-critical-500/20' },
    unknown: { bg: 'bg-surface-800/50', border: 'border-border-subtle', text: 'text-text-muted', iconBg: 'bg-surface-700/50' },
  };
  const colors = statusColors[status];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 300 }}
      className={cn('glass-panel rounded-xl p-4', colors.border, colors.bg)}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0', colors.iconBg)}>
              {icon}
            </div>
            <p className="text-caption text-text-muted font-medium truncate">{label}</p>
          </div>
          <div className="flex items-baseline gap-2">
            <span className={cn('text-metric-sm font-display font-bold', colors.text)}>
              {typeof value === 'number' ? formatPercent(value) : value}
            </span>
            {trend !== undefined && (
              <span className={cn('text-caption font-medium flex items-center gap-1', trend >= 0 ? 'text-secure-400' : 'text-critical-400')}>
                {trend >= 0 ? '▲' : '▼'} {Math.abs(trend).toFixed(1)}%
              </span>
            )}
          </div>
          {description && <p className="text-caption text-text-muted mt-1">{description}</p>}
        </div>
      </div>
    </motion.div>
  );
}

export function ModelPerformancePanel() {
  const modelPerformance = useModelPerformance();
  const health = useHealth();

  if (!modelPerformance && !health?.model_info) {
    return (
      <section className="space-y-6" aria-labelledby="performance-title">
        <div className="flex items-center justify-between">
          <h2 id="performance-title" className="text-heading-lg font-semibold text-text-primary">Model Performance</h2>
          <Badge variant="info" size="sm">No evaluation data available</Badge>
        </div>
        <Card variant="elevated">
          <CardContent className="p-8 text-center text-text-muted">
            <Cpu className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>Model performance metrics unavailable</p>
            <p className="text-caption mt-1">Run model evaluation to populate this section</p>
          </CardContent>
        </Card>
      </section>
    );
  }

  const perf = modelPerformance;
  const test = perf?.test;

  const testSetSize = test ? (test.tp + test.tn + test.fp + test.fn) : 0;
  const isSmallTestSet = testSetSize > 0 && testSetSize < 30;

  return (
    <section className="space-y-6" aria-labelledby="performance-title">
      <div className="flex items-center justify-between">
        <h2 id="performance-title" className="text-heading-lg font-semibold text-text-primary">Model Performance</h2>
        <div className="flex items-center gap-2">
          <Badge variant="info" size="sm">{perf?.algorithm || 'Logistic Regression'}</Badge>
          <Badge variant="info" size="sm">{perf?.feature_count || 35} features</Badge>
        </div>
      </div>

      {isSmallTestSet && (
        <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-start gap-3" role="alert">
          <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-amber-400">Small Test Set Warning</p>
            <p className="text-body-sm text-text-muted mt-1">
              Test set contains only {testSetSize} samples. Performance metrics may not be statistically reliable.
              Treat predictions with caution and validate independently.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricTile
          label="Precision"
          value={test?.precision ?? 0}
          icon={<Target className="w-4 h-4" />}
          status={test && test.precision >= 0.8 ? 'good' : test && test.precision >= 0.5 ? 'warning' : test ? 'poor' : 'unknown'}
          description="TP / (TP + FP)"
        />
        <MetricTile
          label="Recall"
          value={test?.recall ?? 0}
          icon={<CheckCircle className="w-4 h-4" />}
          status={test && test.recall >= 0.8 ? 'good' : test && test.recall >= 0.5 ? 'warning' : test ? 'poor' : 'unknown'}
          description="TP / (TP + FN)"
        />
        <MetricTile
          label="F1 Score"
          value={test?.f1 ?? 0}
          icon={<BarChart2 className="w-4 h-4" />}
          status={test && test.f1 >= 0.8 ? 'good' : test && test.f1 >= 0.5 ? 'warning' : test ? 'poor' : 'unknown'}
          description="2 × (P × R) / (P + R)"
        />
        <MetricTile
          label="PR-AUC"
          value={test?.pr_auc ?? 0}
          icon={<TrendingUp className="w-4 h-4" />}
          status={test && test.pr_auc >= 0.8 ? 'good' : test && test.pr_auc >= 0.5 ? 'warning' : test ? 'poor' : 'unknown'}
          description="Area under PR curve"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricTile
          label="ROC-AUC"
          value={test?.roc_auc ?? 0}
          icon={<Target className="w-4 h-4" />}
          status={test && test.roc_auc >= 0.8 ? 'good' : test && test.roc_auc >= 0.5 ? 'warning' : test ? 'poor' : 'unknown'}
          description="Area under ROC curve"
        />
        <MetricTile
          label="False Positive Rate"
          value={test?.fpr ?? 0}
          icon={<XCircle className="w-4 h-4" />}
          status={test && test.fpr <= 0.1 ? 'good' : test && test.fpr <= 0.3 ? 'warning' : test ? 'poor' : 'unknown'}
          description="FP / (FP + TN)"
        />
        <MetricTile
          label="Test Samples"
          value={testSetSize}
          icon={<Database className="w-4 h-4" />}
          status={testSetSize >= 100 ? 'good' : testSetSize >= 30 ? 'warning' : 'poor'}
          description={isSmallTestSet ? 'Statistically unreliable' : 'Adequate sample size'}
        />
        <MetricTile
          label="Forecast Horizon"
          value={`${perf?.forecast_horizon_minutes || 5} min`}
          icon={<Settings className="w-4 h-4" />}
          status="unknown"
          description="Prediction window"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card variant="elevated">
          <CardHeader>
            <CardTitle>Confusion Matrix (Test Set)</CardTitle>
          </CardHeader>
          <CardContent>
            {test && (
              <div className="grid grid-cols-3 gap-4 items-center">
                <div className="text-center col-span-1" />
                <div className="text-center">
                  <p className="text-caption text-text-muted">Predicted Normal</p>
                  <p className="text-caption text-text-muted">Predicted Attack</p>
                </div>
                <div className="text-center">
                  <p className="text-caption text-text-muted writing-mode-vertical-rl rotate-180">Actual Normal</p>
                </div>
                <div className="w-20 h-20 rounded-lg bg-secure-500/15 border border-secure-500/30 flex items-center justify-center">
                  <span className="text-2xl font-display font-bold text-secure-400">{test.tn}</span>
                </div>
                <div className="w-20 h-20 rounded-lg bg-critical-500/15 border border-critical-500/30 flex items-center justify-center">
                  <span className="text-2xl font-display font-bold text-critical-400">{test.fp}</span>
                </div>
                <div className="text-center">
                  <p className="text-caption text-text-muted writing-mode-vertical-rl rotate-180">Actual Attack</p>
                </div>
                <div className="w-20 h-20 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center">
                  <span className="text-2xl font-display font-bold text-amber-400">{test.fn}</span>
                </div>
                <div className="w-20 h-20 rounded-lg bg-electric-500/15 border border-electric-500/30 flex items-center justify-center">
                  <span className="text-2xl font-display font-bold text-electric-400">{test.tp}</span>
                </div>
              </div>
            )}
            {!test && (
              <div className="text-center py-8 text-text-muted">
                <Database className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>No test confusion matrix available</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card variant="elevated">
          <CardHeader>
            <CardTitle>Model Configuration</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-text-muted">Algorithm</p>
                  <p className="font-mono text-text-primary">{perf?.algorithm || 'Logistic Regression'}</p>
                </div>
                <div>
                  <p className="text-text-muted">Features</p>
                  <p className="font-mono text-text-primary">{perf?.feature_count || 35}</p>
                </div>
                <div>
                  <p className="text-text-muted">Window Size</p>
                  <p className="font-mono text-text-primary">{perf?.window_size_minutes || 5} min</p>
                </div>
                <div>
                  <p className="text-text-muted">Forecast Horizon</p>
                  <p className="font-mono text-text-primary">{perf?.forecast_horizon_minutes || 5} min</p>
                </div>
                <div>
                  <p className="text-text-muted">Threshold (Optimized)</p>
                  <p className="font-mono text-text-primary">{health?.model_info?.test_metrics ? '0.65' : '0.50'}</p>
                </div>
                <div>
                  <p className="text-text-muted">Scaling Required</p>
                  <p className="font-mono text-text-primary">Yes (StandardScaler)</p>
                </div>
              </div>
              {perf?.evaluation_notes && (
                <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                    <p className="text-body-sm text-amber-400">{perf.evaluation_notes}</p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {perf?.threshold_sweep && perf.threshold_sweep.length > 0 && (
        <Card variant="elevated">
          <CardHeader>
            <CardTitle>Threshold Sweep Analysis</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border-subtle">
                    <th className="text-left p-3 text-caption text-text-muted font-medium">Threshold</th>
                    <th className="text-left p-3 text-caption text-text-muted font-medium">Precision</th>
                    <th className="text-left p-3 text-caption text-text-muted font-medium">Recall</th>
                    <th className="text-left p-3 text-caption text-text-muted font-medium">F1 Score</th>
                  </tr>
                </thead>
                <tbody>
                  {perf.threshold_sweep.slice(0, 15).map((row, i) => (
                    <tr key={i} className="border-b border-border-subtle/50 hover:bg-surface-800/50">
                      <td className="p-3 font-mono text-text-primary">{(row.threshold * 100).toFixed(0)}%</td>
                      <td className="p-3 text-text-secondary">{row.precision.toFixed(2)}</td>
                      <td className="p-3 text-text-secondary">{row.recall.toFixed(2)}</td>
                      <td className="p-3 font-medium text-electric-400">{row.f1.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </section>
  );
}