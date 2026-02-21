import { YAMNET_CLASS_MAP_URL, FALLBACK_LABELS } from '@shared/constants';

let labelsPromise: Promise<string[]> | null = null;

/** Fetches and parses YAMNet class labels from the official class map. Returns display_name values. */
export async function getYamnetLabels(): Promise<string[]> {
  if (labelsPromise) return labelsPromise;

  labelsPromise = (async () => {
    try {
      const res = await fetch(YAMNET_CLASS_MAP_URL);
      const text = await res.text();
      const lines = text.trim().split('\n');
      const labels: string[] = [];
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        const quoted = line.match(/,"([^"]*)"/);
        const displayName = quoted
          ? quoted[1].trim()
          : (line.split(',')[2]?.trim() ?? '');
        if (displayName) labels.push(displayName);
      }
      return labels;
    } catch {
      return FALLBACK_LABELS;
    }
  })();

  return labelsPromise;
}
