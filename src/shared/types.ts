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

export interface DbSample {
  dB: number;
  timestamp: number;
}

export interface RecordingMetadata {
  id: string;
  filename: string;
  timestamp: string;
  peakDb: number;
  durationSeconds: number;
}

export type WebSocketMessage =
  | { type: "db_sample"; payload: DbSample }
  | { type: "recording_started"; payload: { filename: string } }
  | { type: "recording_finished"; payload: RecordingMetadata }
  | { type: "config"; payload: AppConfig };
