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
  captureIntervalMs: 100,
  soundTypes: ['Throat clearing'],
  classificationMinScore: 0.3,
};

export interface RecordingMetadata {
  id: string;
  filename: string;
  timestamp: string;
  peakDb: number;
  durationSeconds: number;
  classification?: string;
}
