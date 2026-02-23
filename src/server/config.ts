import { join } from 'path';
import type { AppConfig } from '@shared/types';
import { DEFAULT_CONFIG } from '@shared/constants';
import { PROJECT_ROOT } from '@shared/root';

const CONFIG_FILE = join(PROJECT_ROOT, 'config.json');

/** Config keyed by browserId. Fallback key for clients without browserId. */
type ConfigStore = Record<string, Partial<AppConfig>>;

function parseConfig(data: unknown): AppConfig {
  const d = data as Partial<AppConfig>;
  return {
    ...DEFAULT_CONFIG,
    ...d,
    bufferBelowThresholdSeconds:
      typeof d?.bufferBelowThresholdSeconds === 'number'
        ? d.bufferBelowThresholdSeconds
        : DEFAULT_CONFIG.bufferBelowThresholdSeconds,
    preBufferSeconds:
      typeof d?.preBufferSeconds === 'number'
        ? d.preBufferSeconds
        : DEFAULT_CONFIG.preBufferSeconds,
    soundTypes: Array.isArray(d?.soundTypes)
      ? d.soundTypes
      : DEFAULT_CONFIG.soundTypes,
    classificationMinScore:
      typeof d?.classificationMinScore === 'number'
        ? d.classificationMinScore
        : DEFAULT_CONFIG.classificationMinScore,
    notificationSounds: Array.isArray(d?.notificationSounds)
      ? d.notificationSounds
      : DEFAULT_CONFIG.notificationSounds,
    notificationsEnabled:
      typeof d?.notificationsEnabled === 'boolean'
        ? d.notificationsEnabled
        : DEFAULT_CONFIG.notificationsEnabled,
  };
}

const APP_CONFIG_KEYS = [
  'thresholdDb',
  'bufferBelowThresholdSeconds',
  'preBufferSeconds',
  'soundTypes',
  'deviceId',
] as const;

function isLegacyConfig(data: unknown): data is Partial<AppConfig> {
  if (!data || typeof data !== 'object') return false;
  return APP_CONFIG_KEYS.some(k => k in (data as object));
}

let store: ConfigStore = {};

export async function loadConfig(): Promise<void> {
  try {
    const data = (await Bun.file(CONFIG_FILE).json()) as unknown;
    if (data && typeof data === 'object') {
      if (isLegacyConfig(data)) {
        store = { default: data };
      } else {
        store = data as ConfigStore;
      }
    }
  } catch {
    store = {};
  }
}

export function getConfig(browserId: string | null): AppConfig {
  const key = browserId || 'default';
  const data = store[key];
  if (!data) return { ...DEFAULT_CONFIG };
  return parseConfig(data);
}

export async function saveConfig(
  browserId: string | null,
  updates: Partial<AppConfig>
): Promise<AppConfig> {
  const key = browserId || 'default';
  const current = getConfig(browserId);
  const merged = parseConfig({ ...current, ...updates });
  store[key] = merged;
  await Bun.write(CONFIG_FILE, JSON.stringify(store, null, 2));
  return merged;
}
