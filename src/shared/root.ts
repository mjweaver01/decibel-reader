import { join } from 'path';

/**
 * Project root directory. Resolves correctly for both:
 * - Dev: src/server/ (two levels up)
 * - Prod: dist/ (one level up)
 */
export const PROJECT_ROOT =
  import.meta.dir.endsWith('dist') || import.meta.dir.endsWith('dist/')
    ? join(import.meta.dir, '..')
    : join(import.meta.dir, '../..');
