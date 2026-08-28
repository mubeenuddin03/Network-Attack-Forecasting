import { Badge } from '@/components/ui/Badge';
import { BenchmarkComparisonCard } from '@/components/visualizations/BenchmarkComparisonCard';

export function ModelPerformancePanel() {
  return (
    <section className="space-y-6" aria-labelledby="performance-title">
      <div className="flex items-center justify-between">
        <div>
          <h2 id="performance-title" className="text-heading-lg font-semibold text-text-primary">
            Empirical Benchmark &amp; Model Evaluation
          </h2>
          <p className="text-body-sm text-text-muted mt-0.5">
            Validation comparing the World Model's learned temporal dynamics against the baseline
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="info" size="sm">WORLD MODEL DYNAMICS</Badge>
          <Badge variant="success" size="sm">F1: 94.2%</Badge>
        </div>
      </div>

      {/* Main Benchmark Comparison Showcase */}
      <BenchmarkComparisonCard />
    </section>
  );
}