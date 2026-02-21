export interface AppConfig {
  thresholdDb: number;
  recordDurationSeconds: number;
  captureIntervalMs: number;
  /** If empty, record on any loud sound. If set, only record when classification matches. */
  soundTypes: string[];
  /** Min confidence (0-1) for sound classification to trigger recording */
  classificationMinScore: number;
  /** Microphone deviceId. Empty = use default or first available. */
  deviceId?: string;
}

export const DEFAULT_CONFIG: AppConfig = {
  thresholdDb: -30,
  recordDurationSeconds: 0.1,
  captureIntervalMs: 500,
  soundTypes: ["Throat clearing"],
  classificationMinScore: 0.3,
};

/** YAMNet often returns "Speech" for throat clearing/cough. Map classifier output -> accepted when user selects these. */
export const SOUND_LABEL_ALIASES: Record<string, string[]> = {
  "Throat clearing": ["Speech"],
  Cough: ["Speech"],
};


export interface RecordingMetadata {
  id: string;
  filename: string;
  timestamp: string;
  peakDb: number;
  durationSeconds: number;
  /** Detected sound classification (e.g. "Speech", "Throat clearing") */
  classification?: string;
}
