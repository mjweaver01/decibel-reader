import { join } from 'path';
import type { AppConfig } from '@shared/types';
import { DEFAULT_CONFIG } from '@shared/constants';

const CONFIG_FILE = join(import.meta.dir, '../../config.json');

export let config: AppConfig = { ...DEFAULT_CONFIG };

export async function loadConfig(): Promise<AppConfig> {
  try {
    const data = (await Bun.file(CONFIG_FILE).json()) as Partial<AppConfig>;
    config = {
      ...DEFAULT_CONFIG,
      ...data,
      soundTypes: Array.isArray(data?.soundTypes)
        ? data.soundTypes
        : DEFAULT_CONFIG.soundTypes,
      classificationMinScore:
        typeof data?.classificationMinScore === 'number'
          ? data.classificationMinScore
          : DEFAULT_CONFIG.classificationMinScore,
    };
  } catch {
    config = { ...DEFAULT_CONFIG };
  }
  return config;
}

export async function saveConfig(): Promise<void> {
  await Bun.write(CONFIG_FILE, JSON.stringify(config, null, 2));
}
