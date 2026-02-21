import { join } from 'path';
import { getRecordingsDir } from '../recorder';

export const recordingsIdApi = {
  GET: async (req: Request) => {
    const params = (req as Request & { params: { id: string } }).params;
    const id = decodeURIComponent(params.id).replace(
      /\.(webm|wav)$/,
      ''
    );
    const dir = getRecordingsDir();
    for (const ext of ['webm', 'wav']) {
      const filepath = join(dir, `${id}.${ext}`);
      try {
        const file = Bun.file(filepath);
        const exists = await file.exists();
        if (exists) {
          return new Response(file, {
            headers: {
              'Content-Type': ext === 'webm' ? 'audio/webm' : 'audio/wav',
              'Content-Disposition': `attachment; filename="${id}.${ext}"`,
            },
          });
        }
      } catch {
        // try next
      }
    }
    return new Response('Not found', { status: 404 });
  },
};
