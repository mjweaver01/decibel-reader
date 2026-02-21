import {
  getRecordings,
  saveRecordingFromUpload,
} from '../recorder';
import { logger } from '@shared/logger';

export const recordingsApi = {
  GET: async () => Response.json(await getRecordings()),
  POST: async (req: Request) => {
    const formData = await req.formData();
    const audio = formData.get('audio');
    const peakDb = parseFloat(String(formData.get('peakDb') || '0'));
    const durationSeconds = parseFloat(
      String(formData.get('durationSeconds') || '0.5')
    );

    if (!audio || !(audio instanceof Blob)) {
      return new Response('Missing audio file', { status: 400 });
    }

    const classification =
      String(formData.get('classification') || '').trim() || undefined;
    const meta = await saveRecordingFromUpload(
      audio,
      peakDb,
      durationSeconds,
      classification
    );
    logger('[Recorder] Saved:', meta.filename, 'peakDb:', peakDb);
    return Response.json(meta);
  },
};
