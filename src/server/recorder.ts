import { Database } from 'bun:sqlite';
import { mkdir } from 'fs/promises';
import { join } from 'path';
import type { RecordingMetadata } from '@shared/types';
import { logger } from '@shared/logger';

const RECORDINGS_DIR = join(import.meta.dir, '../../recordings');
const DB_PATH = join(RECORDINGS_DIR, 'recordings.sqlite');
const METADATA_FILE = join(RECORDINGS_DIR, 'index.json');

let db: Database | null = null;

function getDb(): Database {
  if (!db) {
    throw new Error(
      'Recorder not initialized. Call initRecorder() at startup.'
    );
  }
  return db;
}

export async function initRecorder(): Promise<void> {
  if (db) return;
  await mkdir(RECORDINGS_DIR, { recursive: true });
  db = new Database(DB_PATH, { create: true });
  db.run(`
    CREATE TABLE IF NOT EXISTS recordings (
      id TEXT PRIMARY KEY,
      filename TEXT NOT NULL,
      timestamp TEXT NOT NULL,
      peak_db REAL NOT NULL,
      duration_seconds REAL NOT NULL,
      classifications TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);
  try {
    db.run('ALTER TABLE recordings ADD COLUMN classifications TEXT');
  } catch {
    // column already exists
  }
  await migrateFromJson();
}

async function migrateFromJson(): Promise<void> {
  try {
    const data = Bun.file(METADATA_FILE);
    if (!(await data.exists())) return;

    const list = (await data.json()) as RecordingMetadata[];
    if (!Array.isArray(list) || list.length === 0) return;

    const database = getDb();
    const insert = database.prepare(
      'INSERT OR IGNORE INTO recordings (id, filename, timestamp, peak_db, duration_seconds, classifications) VALUES (?, ?, ?, ?, ?, ?)'
    );

    const insertMany = database.transaction((rows: RecordingMetadata[]) => {
      for (const row of rows) {
        const classifications =
          (row.classifications?.length ?? 0) > 0
            ? row.classifications!
            : (row as { classification?: string }).classification
              ? [
                  {
                    label: (row as { classification?: string }).classification!,
                    score: 1,
                  },
                ]
              : [];
        insert.run(
          row.id,
          row.filename,
          row.timestamp,
          row.peakDb,
          row.durationSeconds,
          JSON.stringify(classifications)
        );
      }
    });

    insertMany(list);
    logger(
      '[Recorder] Migrated',
      list.length,
      'recordings from index.json to SQLite'
    );
    Bun.write(METADATA_FILE, '[]');
  } catch {
    // ignore
  }
}

export async function saveRecordingFromUpload(
  file: File | Blob,
  peakDb: number,
  durationSeconds: number,
  classifications: { label: string; score: number }[]
): Promise<RecordingMetadata> {
  const database = getDb();

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const ext = file.type.includes('webm') ? 'webm' : 'wav';
  const filename = `${timestamp}.${ext}`;
  const id = filename.replace(/\.[^.]+$/, '');
  const filepath = join(RECORDINGS_DIR, filename);

  await Bun.write(filepath, file);

  const classificationsJson = JSON.stringify(classifications);

  const insert = database.prepare(
    'INSERT INTO recordings (id, filename, timestamp, peak_db, duration_seconds, classifications) VALUES (?, ?, ?, ?, ?, ?)'
  );
  insert.run(
    id,
    filename,
    new Date().toISOString(),
    peakDb,
    durationSeconds,
    classificationsJson
  );
  logger('[Recorder] DB insert:', id, classifications.length, 'classifications');

  return {
    id,
    filename,
    timestamp: new Date().toISOString(),
    peakDb,
    durationSeconds,
    classifications,
  };
}

export async function getRecordings(): Promise<RecordingMetadata[]> {
  const database = getDb();

  const rows = database
    .query(
      'SELECT id, filename, timestamp, peak_db, duration_seconds, classifications FROM recordings ORDER BY timestamp DESC'
    )
    .all() as {
    id: string;
    filename: string;
    timestamp: string;
    peak_db: number;
    duration_seconds: number;
    classifications: string | null;
  }[];

  return rows.map(r => {
    let classifications: { label: string; score: number }[] = [];
    if (r.classifications) {
      try {
        classifications = JSON.parse(r.classifications) as {
          label: string;
          score: number;
        }[];
      } catch {
        // ignore invalid JSON
      }
    }
    return {
      id: r.id,
      filename: r.filename,
      timestamp: r.timestamp,
      peakDb: r.peak_db,
      durationSeconds: r.duration_seconds,
      classifications,
    };
  });
}

export function getRecordingsDir(): string {
  return RECORDINGS_DIR;
}
