import type { AppConfig } from '@shared/types';
import { config, saveConfig } from '../config';

export const configApi = {
  GET: () => Response.json(config),
  POST: async (req: Request) => {
    const body = (await req.json()) as Partial<AppConfig>;
    const updates: Partial<AppConfig> = {};
    const numKeys = [
      'thresholdDb',
      'recordDurationSeconds',
      'captureIntervalMs',
      'classificationMinScore',
    ] as const satisfies readonly (keyof AppConfig)[];
    for (const key of numKeys) {
      const val = body[key];
      if (typeof val === 'number') updates[key] = val;
    }
    if (Array.isArray(body.soundTypes)) updates.soundTypes = body.soundTypes;
    if (body.deviceId !== undefined) updates.deviceId = body.deviceId || undefined;
    Object.assign(config, updates);
    await saveConfig();
    return Response.json(config);
  },
};
