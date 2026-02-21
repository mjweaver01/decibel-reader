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
  recordDurationSeconds: 0.5,
  captureIntervalMs: 500,
  soundTypes: ["Throat clearing"],
  classificationMinScore: 0.5,
};

/** YAMNet sound classes for the UI (display_name from yamnet_class_map) */
export const SOUND_TYPE_OPTIONS = [
  "Throat clearing", // Default use case
  "Speech",
  "Dog",
  "Bark",
  "Cat",
  "Meow",
  "Door",
  "Knock",
  "Glass",
  "Breaking",
  "Baby cry, infant cry",
  "Cough",
  "Sneeze",
  "Gargling",
  "Siren",
  "Alarm",
  "Vehicle horn, car horn, honking",
  "Car",
  "Conversation",
  "Walk, footsteps",
  "Rain",
  "Thunderstorm",
  "Fire",
  "Explosion",
  "Gunshot, gunfire",
  "Screaming",
  "Laughter",
  "Clapping",
  "Cheering",
  "Crowd",
];

export interface RecordingMetadata {
  id: string;
  filename: string;
  timestamp: string;
  peakDb: number;
  durationSeconds: number;
}
