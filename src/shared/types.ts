export interface AppConfig {
  thresholdDb: number;
  recordDurationSeconds: number;
  captureIntervalMs: number;
}

export const DEFAULT_CONFIG: AppConfig = {
  thresholdDb: 60,
  recordDurationSeconds: 10,
  captureIntervalMs: 500,
};

export interface RecordingMetadata {
  id: string;
  filename: string;
  timestamp: string;
  peakDb: number;
  durationSeconds: number;
}
