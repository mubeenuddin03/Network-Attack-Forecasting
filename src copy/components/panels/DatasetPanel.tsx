import { formatDateTime } from '@/utils/helpers';
import { useDashboardStore } from '@/contexts/DashboardContext';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { FileText, Layers, Activity, CalendarRange } from 'lucide-react';

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const units = ['KB', 'MB', 'GB'];
  let value = bytes / 1024;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value.toFixed(value >= 100 ? 0 : 1)} ${units[unit]}`;
}

export function DatasetPanel() {
  const dataset = useDashboardStore((s) => s.dataset);
  const datasetFile = useDashboardStore((s) => s.datasetFile);

  // Do not render any dummy dataset stats until a user actually uploads a CSV file
  if (!datasetFile || !dataset) {
    return null;
  }

  return (
    <Card variant="elevated">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <div>
          <CardTitle>Uploaded Dataset Summary</CardTitle>
          <p className="text-caption text-text-muted mt-0.5">
            Parsed into 5-minute sliding analysis windows
          </p>
        </div>
        <Badge variant="success" size="sm">
          READY
        </Badge>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-caption">
          <div className="p-3 rounded-lg bg-surface-900/60 border border-border-subtle">
            <div className="flex items-center gap-1.5 text-text-muted mb-1">
              <FileText className="w-3.5 h-3.5" />
              <span>File</span>
            </div>
            <p className="font-medium text-text-primary truncate">{dataset.filename}</p>
            <p className="text-[11px] text-text-muted mt-0.5">{formatBytes(dataset.file_size_bytes)}</p>
          </div>

          <div className="p-3 rounded-lg bg-surface-900/60 border border-border-subtle">
            <div className="flex items-center gap-1.5 text-text-muted mb-1">
              <Activity className="w-3.5 h-3.5" />
              <span>Total Flows</span>
            </div>
            <p className="font-bold text-text-primary font-mono">{dataset.row_count.toLocaleString()}</p>
          </div>

          <div className="p-3 rounded-lg bg-surface-900/60 border border-border-subtle">
            <div className="flex items-center gap-1.5 text-text-muted mb-1">
              <Layers className="w-3.5 h-3.5" />
              <span>Windows</span>
            </div>
            <p className="font-bold text-text-primary font-mono">{dataset.window_count.toLocaleString()}</p>
          </div>

          <div className="p-3 rounded-lg bg-surface-900/60 border border-border-subtle">
            <div className="flex items-center gap-1.5 text-text-muted mb-1">
              <CalendarRange className="w-3.5 h-3.5" />
              <span>Time Range</span>
            </div>
            <p className="font-medium text-text-secondary text-[11px] truncate">
              {formatDateTime(dataset.time_range_start)} → {formatDateTime(dataset.time_range_end)}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
