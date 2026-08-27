import { useRef, useState, useCallback, DragEvent, ChangeEvent, useEffect } from 'react';
import { cn } from '@/utils/helpers';
import { useDashboardStore, useSelectedScenario, useSelectScenario } from '@/contexts/DashboardContext';
import { MAX_CSV_SIZE_BYTES } from '@/services/api';
import { SIMULATION_SCENARIOS } from '@/utils/simulationPresets';
import { useSound } from '@/contexts/SoundContext';
import {
  UploadCloud,
  AlertTriangle,
  Loader2,
  FileCheck
} from 'lucide-react';

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

export function CsvUpload() {
  const uploadStatus = useDashboardStore((s) => s.uploadStatus);
  const uploadProgress = useDashboardStore((s) => s.uploadProgress);
  const datasetError = useDashboardStore((s) => s.datasetError);
  const datasetFile = useDashboardStore((s) => s.datasetFile);
  const uploadCsv = useDashboardStore((s) => s.uploadCsv);
  const selectedScenario = useSelectedScenario();
  const selectScenario = useSelectScenario();
  const { play } = useSound();

  const [isDragging, setIsDragging] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    async (file: File) => {
      setLocalError(null);
      if (!file.name.toLowerCase().endsWith('.csv')) {
        setLocalError('Please upload a .csv telemetry file.');
        play('alert');
        return;
      }
      if (file.size > MAX_CSV_SIZE_BYTES) {
        setLocalError(
          `File exceeds ${formatBytes(MAX_CSV_SIZE_BYTES)} limit (${formatBytes(file.size)}).`
        );
        play('alert');
        return;
      }
      play('click');
      await uploadCsv(file);
    },
    [uploadCsv, play]
  );

  const onDrop = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const onSelect = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
      e.target.value = '';
    },
    [handleFile]
  );

  // Paste support
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const file = e.clipboardData?.files?.[0];
      if (file && file.name.endsWith('.csv')) {
        handleFile(file);
      }
    };
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [handleFile]);

  const busy = uploadStatus === 'uploading' || uploadStatus === 'processing';
  const error = localError || datasetError;

  return (
    <section className="space-y-4">
      {/* Clean Scenario Presets */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-caption font-semibold text-text-secondary">
            Simulation Telemetry Presets
          </span>
          <span className="text-[11px] text-text-muted">
            Select a preset or upload your custom CSV
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          {SIMULATION_SCENARIOS.map((scenario) => {
            const isSelected = selectedScenario.id === scenario.id;
            const isAttack = scenario.status === 'ATTACK_LIKELY';

            return (
              <button
                key={scenario.id}
                type="button"
                onClick={() => {
                  play('click');
                  selectScenario(scenario.id);
                }}
                className={cn(
                  'p-3 rounded-xl border text-left transition-all duration-200 flex flex-col justify-between',
                  isSelected
                    ? 'bg-surface-800 border-electric-500/80 shadow-sm'
                    : 'bg-surface-900/70 border-border-subtle hover:border-border-default hover:bg-surface-850'
                )}
              >
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="text-caption font-semibold text-text-primary truncate">
                    {scenario.name}
                  </span>
                  <span className={cn(
                    'text-[10px] font-mono font-bold px-1.5 py-0.5 rounded',
                    isAttack ? 'bg-critical-500/15 text-critical-400' : 'bg-secure-500/15 text-secure-400'
                  )}>
                    {(scenario.attackProbability * 100).toFixed(0)}%
                  </span>
                </div>
                <p className="text-[11px] text-text-muted truncate">
                  {scenario.category} • {scenario.mitreStage}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Minimal Clean Dropzone */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => !busy && inputRef.current?.click()}
        onKeyDown={(e) => {
          if ((e.key === 'Enter' || e.key === ' ') && !busy) inputRef.current?.click();
        }}
        onDragOver={(e) => {
          e.preventDefault();
          if (!busy) setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={onDrop}
        className={cn(
          'group relative rounded-xl border border-dashed transition-all duration-200 cursor-pointer overflow-hidden p-5 text-center',
          isDragging
            ? 'border-electric-400 bg-electric-500/10'
            : 'border-border-default bg-surface-900/50 hover:border-electric-500/50 hover:bg-surface-850'
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".csv"
          onChange={onSelect}
          className="hidden"
          disabled={busy}
        />

        <div className="flex flex-col items-center justify-center gap-2">
          <div className="w-9 h-9 rounded-lg bg-surface-800 flex items-center justify-center text-text-muted">
            {busy ? (
              <Loader2 className="w-5 h-5 animate-spin text-electric-400" />
            ) : datasetFile ? (
              <FileCheck className="w-5 h-5 text-secure-400" />
            ) : (
              <UploadCloud className="w-5 h-5 text-electric-400" />
            )}
          </div>

          <div>
            <p className="text-body-sm font-medium text-text-primary">
              {busy
                ? 'Processing telemetry file...'
                : datasetFile
                ? `Loaded: ${datasetFile.name} (${formatBytes(datasetFile.size)})`
                : 'Drag & Drop CSV file (or Paste / Browse)'}
            </p>
            <p className="text-[11px] text-text-muted mt-0.5">
              Supports standard network flow CSV telemetry
            </p>
          </div>

          {busy && (
            <div className="w-full max-w-xs space-y-1 pt-1">
              <div className="h-1 w-full bg-surface-950 rounded-full overflow-hidden">
                <div
                  className="h-full bg-electric-500 transition-all duration-200"
                  style={{ width: `${uploadProgress || 50}%` }}
                />
              </div>
            </div>
          )}

          {error && (
            <div className="p-2 rounded-lg bg-critical-500/10 border border-critical-500/30 text-critical-300 text-caption flex items-center gap-2 max-w-sm">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 text-critical-400" />
              <span>{error}</span>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
