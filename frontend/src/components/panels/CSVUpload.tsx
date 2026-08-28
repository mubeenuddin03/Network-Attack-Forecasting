import { useRef, useState, useEffect } from 'react';
import { UploadCloud, FileText, CheckCircle2, AlertCircle, X } from 'lucide-react';
import { cn } from '@/utils/helpers';
import { useDashboardStore } from '@/contexts/DashboardContext';

const MAX_BYTES = 300 * 1024 * 1024;

function formatSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export function CsvUpload() {
  const inputRef = useRef<HTMLInputElement>(null);
  const uploadCsvAction = useDashboardStore(state => state.uploadCsv);
  const uploadProgress = useDashboardStore(state => state.uploadProgress);
  const uploadStatus = useDashboardStore(state => state.uploadStatus);
  const dataset = useDashboardStore(state => state.dataset);
  const datasetError = useDashboardStore(state => state.datasetError);
  const modelMode = useDashboardStore(state => state.modelMode);
  const prediction = useDashboardStore(state => state.prediction);
  const [dragging, setDragging] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  // Reset local error when a new upload starts
  useEffect(() => {
    if (uploadStatus === 'uploading' || uploadStatus === 'processing') {
      setLocalError(null);
    }
  }, [uploadStatus]);

  const upload = async (file?: File) => {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.csv')) {
      setLocalError('Only CSV files are supported.');
      return;
    }
    if (file.size > MAX_BYTES) {
      setLocalError(`File is larger than the ${(MAX_BYTES / (1024 * 1024)).toFixed(0)} MB limit.`);
      return;
    }
    await uploadCsvAction(file);
  };

  const processing = uploadStatus === 'uploading' || uploadStatus === 'processing';
  const progress = uploadProgress;
  const error = localError || datasetError;
  const result = uploadStatus === 'success' && dataset ? { dataset, prediction, modelMode } : null;

  return (
    <section className="space-y-6">
      <div>
        <p className="text-caption text-electric-400 font-medium uppercase tracking-wider">Dataset Input</p>
        <h1 className="text-display-sm font-display font-bold text-text-primary mt-1">Upload network traffic CSV</h1>
        <p className="text-body text-text-secondary mt-2 max-w-3xl">Drop a CIC-IDS2017 flow CSV here. The backend validates it, builds 5-minute network-state windows, and sends the latest window to the trained model.</p>
      </div>

      <div
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={e => { e.preventDefault(); setDragging(false); void upload(e.dataTransfer.files?.[0]); }}
        onClick={() => !processing && inputRef.current?.click()}
        className={cn('glass-panel-strong rounded-2xl p-8 md:p-12 border-2 border-dashed transition-all cursor-pointer', dragging ? 'border-electric-400 bg-electric-500/10' : 'border-border-default hover:border-electric-500/50 hover:bg-surface-800/40', processing && 'cursor-wait opacity-90')}
      >
        <input ref={inputRef} type="file" accept=".csv,text/csv" className="hidden" onChange={e => void upload(e.target.files?.[0])} disabled={processing} />
        <div className="flex flex-col items-center text-center">
          <div className="w-16 h-16 rounded-2xl bg-electric-500/10 border border-electric-500/20 flex items-center justify-center text-electric-400 mb-5">
            <UploadCloud className="w-8 h-8" />
          </div>
          <h2 className="text-heading-lg font-semibold text-text-primary">{processing ? 'Processing dataset…' : 'Drop your CSV here'}</h2>
          <p className="text-body text-text-muted mt-2">or click to browse from your computer</p>
          <div className="flex flex-wrap justify-center gap-2 mt-5 text-caption">
            <span className="px-3 py-1.5 rounded-full bg-surface-800 border border-border-subtle text-text-secondary">CSV only</span>
            <span className="px-3 py-1.5 rounded-full bg-surface-800 border border-border-subtle text-text-secondary">Maximum {(MAX_BYTES / (1024 * 1024)).toFixed(0)} MB</span>
            <span className="px-3 py-1.5 rounded-full bg-surface-800 border border-border-subtle text-text-secondary">5-minute windows</span>
          </div>
        </div>
      </div>

      {processing && (
        <div className="glass-panel rounded-xl p-4">
          <div className="flex items-center justify-between text-caption mb-2"><span className="text-text-secondary">Uploading CSV</span><span className="font-mono text-text-primary">{progress}%</span></div>
          <div className="h-2 rounded-full bg-surface-800 overflow-hidden"><div className="h-full bg-electric-500 transition-all duration-200" style={{ width: `${progress}%` }} /></div>
          {progress >= 100 && <p className="text-caption text-text-muted mt-2">Upload complete. Building 5-minute windows…</p>}
        </div>
      )}

      {error && (
        <div className="flex items-start gap-3 p-4 rounded-xl border border-critical-500/30 bg-critical-500/10 text-critical-300">
          <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" /><p className="flex-1 text-body-sm">{error}</p><button onClick={() => setLocalError(null)}><X className="w-4 h-4" /></button>
        </div>
      )}

      {result && (
        <div className="glass-panel rounded-xl p-5 border border-secure-500/20">
          <div className="flex items-start gap-3"><CheckCircle2 className="w-5 h-5 text-secure-400 mt-0.5" /><div className="min-w-0 flex-1"><p className="font-semibold text-text-primary">Dataset loaded</p><p className="text-caption text-text-muted mt-1">{result.dataset.filename}</p></div><FileText className="w-5 h-5 text-text-muted" /></div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-5">
            <Stat label="File size" value={formatSize(result.dataset.file_size_bytes)} />
            <Stat label="Rows" value={result.dataset.row_count.toLocaleString()} />
            <Stat label="5-min windows" value={result.dataset.window_count.toLocaleString()} />
            <Stat label="Prediction" value={result.prediction?.status ?? 'Unknown'} />
          </div>
          <p className="text-caption text-secure-400 mt-4">Latest window is now being used by the dashboard prediction.</p>
        </div>
      )}
    </section>
  );
}

export const CSVUpload = CsvUpload;

function Stat({ label, value }: { label: string; value: string }) {
  return <div className="rounded-lg bg-surface-800/60 border border-border-subtle p-3"><p className="text-caption text-text-muted">{label}</p><p className="text-body font-semibold text-text-primary mt-1">{value}</p></div>;
}
