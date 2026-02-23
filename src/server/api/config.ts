import type { AppConfig } from '@shared/types';
import { getConfig, saveConfig } from '../config';

function getBrowserId(req: Request): string | null {
  return req.headers.get('X-Browser-Id') ?? new URL(req.url).searchParams.get('browserId');
}

export const configApi = {
  GET: (req: Request) => Response.json(getConfig(getBrowserId(req))),
  POST: async (req: Request) => {
    const browserId = getBrowserId(req);
    const body = (await req.json()) as Partial<AppConfig>;
    const updates: Partial<AppConfig> = {};
    const numKeys = [
      'thresholdDb',
      'bufferBelowThresholdSeconds',
      'preBufferSeconds',
      'captureIntervalMs',
      'classificationMinScore',
    ] as const satisfies readonly (keyof AppConfig)[];
    for (const key of numKeys) {
      const val = body[key];
      if (typeof val === 'number') updates[key] = val;
    }
    if (Array.isArray(body.soundTypes)) updates.soundTypes = body.soundTypes;
    if (body.deviceId !== undefined) updates.deviceId = body.deviceId || undefined;
    if (Array.isArray(body.notificationSounds))
      updates.notificationSounds = body.notificationSounds;
    if (typeof body.notificationsEnabled === 'boolean')
      updates.notificationsEnabled = body.notificationsEnabled;
    const config = await saveConfig(browserId, updates);
    return Response.json(config);
  },
};
