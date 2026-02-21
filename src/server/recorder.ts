import { Database } from "bun:sqlite";
import { mkdir } from "fs/promises";
import { join } from "path";
import type { RecordingMetadata } from "../shared/types.js";

const RECORDINGS_DIR = join(import.meta.dir, "../../recordings");
const DB_PATH = join(RECORDINGS_DIR, "recordings.sqlite");
const METADATA_FILE = join(RECORDINGS_DIR, "index.json");

let db: Database | null = null;

function getDb(): Database {
  if (!db) {
    throw new Error("Recorder not initialized. Call initRecorder() at startup.");
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
      classification TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);
  try {
    db.run("ALTER TABLE recordings ADD COLUMN classification TEXT");
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
      "INSERT OR IGNORE INTO recordings (id, filename, timestamp, peak_db, duration_seconds, classification) VALUES (?, ?, ?, ?, ?, ?)"
    );

    const insertMany = database.transaction((rows: RecordingMetadata[]) => {
      for (const row of rows) {
        insert.run(row.id, row.filename, row.timestamp, row.peakDb, row.durationSeconds, row.classification ?? null);
      }
    });

    insertMany(list);
    console.log("[Recorder] Migrated", list.length, "recordings from index.json to SQLite");
    Bun.write(METADATA_FILE, "[]");
  } catch {
    // ignore
  }
}

export async function saveRecordingFromUpload(
  file: File | Blob,
  peakDb: number,
  durationSeconds: number,
  classification?: string
): Promise<RecordingMetadata> {
  const database = getDb();

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const ext = file.type.includes("webm") ? "webm" : "wav";
  const filename = `${timestamp}.${ext}`;
  const id = filename.replace(/\.[^.]+$/, "");
  const filepath = join(RECORDINGS_DIR, filename);

  await Bun.write(filepath, file);

  const insert = database.prepare(
    "INSERT INTO recordings (id, filename, timestamp, peak_db, duration_seconds, classification) VALUES (?, ?, ?, ?, ?, ?)"
  );
  insert.run(id, filename, new Date().toISOString(), peakDb, durationSeconds, classification ?? null);
  console.log("[Recorder] DB insert:", id, classification ?? "(no classification)");

  return {
    id,
    filename,
    timestamp: new Date().toISOString(),
    peakDb,
    durationSeconds,
    classification: classification ?? undefined,
  };
}

export async function getRecordings(): Promise<RecordingMetadata[]> {
  const database = getDb();

  const rows = database.query("SELECT id, filename, timestamp, peak_db, duration_seconds, classification FROM recordings ORDER BY timestamp DESC").all() as {
    id: string;
    filename: string;
    timestamp: string;
    peak_db: number;
    duration_seconds: number;
    classification: string | null;
  }[];

  return rows.map((r) => ({
    id: r.id,
    filename: r.filename,
    timestamp: r.timestamp,
    peakDb: r.peak_db,
    durationSeconds: r.duration_seconds,
    classification: r.classification ?? undefined,
  }));
}

export function getRecordingsDir(): string {
  return RECORDINGS_DIR;
}
