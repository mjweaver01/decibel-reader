import { join } from 'path';
import clientHtml from '@client/index.html';
import { loadConfig } from './config';
import { initRecorder } from './recorder';
import { configApi } from './api/config';
import { recordingsApi } from './api/recordings';
import { recordingsIdApi } from './api/recordings-id';

const server = Bun.serve({
  port: 3000,
  development: process.env.NODE_ENV !== 'production',
  routes: {
    '/': clientHtml,
    '/analytics': clientHtml,
    '/api/config': configApi,
    '/api/recordings': recordingsApi,
    '/api/recordings/:id': recordingsIdApi,
  },
  async fetch(req) {
    const pathname = new URL(req.url).pathname;
    const filename = pathname.split('/').filter(Boolean).pop() ?? '';
    if (
      filename.startsWith('index-') &&
      (filename.endsWith('.js') || filename.endsWith('.css')) &&
      !filename.includes('..')
    ) {
      const file = Bun.file(join(import.meta.dir, filename));
      if (await file.exists()) {
        return new Response(file, {
          headers: {
            'Content-Type': filename.endsWith('.js')
              ? 'application/javascript'
              : 'text/css',
          },
        });
      }
    }
    if (pathname === '/favicon.ico') return new Response(null, { status: 204 });
    return new Response('Not Found', { status: 404 });
  },
});

await loadConfig();
await initRecorder();

console.log(`
  --------------------------------
         📢 Decibel Reader 
  --------------------------------
  server: http://localhost:${server.port}
  environment: ${process.env.NODE_ENV ?? 'development'}
  --------------------------------
`);
