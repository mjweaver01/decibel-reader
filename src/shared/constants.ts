import type { AppConfig } from './types';

// Set to true to enable verbose [DecibelReader] debug logs
export const DEBUG = false;

// API base URL
export const API_BASE = '/api';

// min and max decibel values
export const MIN_DB = -60;
export const MAX_DB = 0;

// buffer size
export const BUFFER_SIZE = 72000;

// Default config
export const DEFAULT_CONFIG: AppConfig = {
  thresholdDb: -30,
  recordDurationSeconds: 1,
  captureIntervalMs: 250,
  soundTypes: ['Throat clearing', 'Cough', 'Burping, eructation'],
  classificationMinScore: 0.2,
  notificationSounds: [],
  notificationsEnabled: false,
};

// YAMNet
export const YAMNET_MODEL =
  'https://storage.googleapis.com/mediapipe-models/audio_classifier/yamnet/float32/1/yamnet.tflite';
export const WASM_PATH =
  'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-audio/wasm';
export const YAMNET_CLASS_MAP_URL =
  'https://raw.githubusercontent.com/tensorflow/models/master/research/audioset/yamnet/yamnet_class_map.csv';

export const FALLBACK_LABELS = [
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
