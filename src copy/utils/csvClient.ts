import type { DatasetInfo, UploadPrediction } from '@/types/dashboard';
import { processCsvText } from './csvProcessor';

type CsvResult = { dataset: DatasetInfo; prediction: UploadPrediction };

async function runOnMainThread(file: File): Promise<CsvResult> {
  const text = await file.text();
  return processCsvText(text, file.name, file.size);
}

/**
 * Analyze a CIC-IDS2017 / CICFlowMeter CSV entirely in the browser so the
 * dashboard works even when the FastAPI backend is unreachable.
 *
 * Parsing is offloaded to a Web Worker to keep the main UI thread responsive
 * during upload and avoid initial-load jank. If Workers are unavailable, the
 * work falls back to the main thread.
 */
export async function processCsvClientSide(file: File): Promise<CsvResult> {
  if (typeof Worker === 'undefined') {
    return runOnMainThread(file);
  }

  return new Promise<CsvResult>((resolve, reject) => {
    let settled = false;
    let worker: Worker;

    try {
      worker = new Worker(new URL('../workers/csvWorker.ts', import.meta.url), {
        type: 'module',
      });
    } catch {
      runOnMainThread(file).then(resolve, reject);
      return;
    }

    worker.onmessage = (e: MessageEvent) => {
      if (settled) return;
      settled = true;
      worker.terminate();
      const data = e.data as
        | { success: true; result: CsvResult }
        | { success: false; error?: string };
      if (data.success) resolve(data.result);
      else reject(new Error(data.error || 'CSV processing failed'));
    };

    worker.onerror = () => {
      if (settled) return;
      settled = true;
      worker.terminate();
      runOnMainThread(file).then(resolve, reject);
    };

    worker.postMessage(file);
  });
}
