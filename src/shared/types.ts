export interface AppConfig {
  thresholdDb: number;
  /** Seconds sound must stay below threshold before stopping recording */
  recordDurationSeconds: number;
  captureIntervalMs: number;
  /** If empty, record on any loud sound. If set, only record when classification matches. */
  soundTypes: string[];
  /** Min confidence (0-1) for sound classification to trigger recording */
  classificationMinScore: number;
  /** Microphone deviceId. Empty = use default or first available. */
  deviceId?: string;
  /** Show browser notification when these sounds are detected */
  notificationSounds: string[];
  /** Master toggle for push notifications */
  notificationsEnabled: boolean;
}

export interface ClassificationResult {
  label: string;
  score: number;
}

export interface RecordingMetadata {
  id: string;
  filename: string;
  timestamp: string;
  peakDb: number;
  durationSeconds: number;
  classifications: ClassificationResult[];
}
