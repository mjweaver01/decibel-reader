const YAMNET_CLASS_MAP_URL =
  'https://raw.githubusercontent.com/tensorflow/models/master/research/audioset/yamnet/yamnet_class_map.csv';

let labelsPromise: Promise<string[]> | null = null;

const FALLBACK_LABELS = [
  'Throat clearing',
  'Cough',
  'Burping, eructation',
  'Sneeze',
  'Hiccup',
  'Speech',
  'Dog',
  'Bark',
  'Cat',
  'Meow',
  'Door',
  'Knock',
  'Glass',
  'Breaking',
  'Baby cry, infant cry',
  'Gargling',
  'Siren',
  'Alarm',
  'Vehicle horn, car horn, honking',
  'Car',
  'Conversation',
  'Walk, footsteps',
  'Rain',
  'Thunderstorm',
  'Fire',
  'Explosion',
  'Gunshot, gunfire',
  'Screaming',
  'Laughter',
  'Clapping',
  'Cheering',
  'Crowd',
];

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
