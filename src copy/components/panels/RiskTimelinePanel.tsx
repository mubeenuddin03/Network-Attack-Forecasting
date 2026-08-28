import { useState } from 'react';
import { useRiskTimeline } from '@/contexts/DashboardContext';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Modal } from '@/components/ui';
import { AreaForecastChart } from '@/components/visualizations/AreaForecastChart';
import { Activity, Maximize2 } from 'lucide-react';

export function RiskTimelinePanel() {
  const riskTimeline = useRiskTimeline();
  const [expanded, setExpanded] = useState(false);

  return (
    <Card variant="elevated" className="overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Risk Timeline</CardTitle>
          <p className="text-body-sm text-text-muted mt-1">
            Observed risk score against the 5-minute forecast horizon
          </p>
        </div>
        <div className="flex items-center gap-2">
          {riskTimeline && (
            <button
              type="button"
              onClick={() => setExpanded(true)}
              className="btn-icon"
              aria-label="Expand risk timeline chart"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
          )}
          <div className="w-10 h-10 rounded-xl bg-electric-500/15 flex items-center justify-center text-electric-400">
            <Activity className="w-5 h-5" />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {riskTimeline ? (
          <AreaForecastChart data={riskTimeline} height={280} />
        ) : (
          <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
            <Activity className="w-10 h-10 text-text-muted opacity-30" />
            <p className="text-body-sm text-text-muted">
              Upload a dataset to generate the risk timeline.
            </p>
          </div>
        )}
      </CardContent>

      <Modal
        isOpen={expanded}
        onClose={() => setExpanded(false)}
        title="Risk Timeline"
        description="Observed risk score against the 5-minute forecast horizon"
        size="full"
        showCloseButton
      >
        <div className="h-[60vh] min-h-[360px]">
          {riskTimeline && (
            <AreaForecastChart data={riskTimeline} height={520} />
          )}
        </div>
      </Modal>
    </Card>
  );
}
