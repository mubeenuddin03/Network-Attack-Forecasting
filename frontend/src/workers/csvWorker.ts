import { processCsvText } from '@/utils/csvProcessor';

const ctx = self as unknown as {
  onmessage: ((e: MessageEvent) => void) | null;
  postMessage: (msg: unknown) => void;
};

ctx.onmessage = async (e: MessageEvent) => {
  const file = e.data as File;
  try {
    const text = await file.text();
    const result = processCsvText(text, file.name, file.size);
    ctx.postMessage({ success: true, result });
  } catch (err) {
    ctx.postMessage({
      success: false,
      error: err instanceof Error ? err.message : 'Failed to parse CSV',
    });
  }
};
