import clientHtml from '@client/index.html';
import { loadConfig } from './config';
import { initRecorder } from './recorder';
import { configApi } from './api/config';
import { recordingsApi } from './api/recordings';
import { recordingsIdApi } from './api/recordings-id';

const server = Bun.serve({
  port: 3000,
  development: true,
  routes: {
    '/': clientHtml,
    '/analytics': clientHtml,
    '/api/config': configApi,
    '/api/recordings': recordingsApi,
    '/api/recordings/:id': recordingsIdApi,
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
