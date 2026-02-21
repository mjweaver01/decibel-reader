import { mkdir } from "fs/promises";
import { join } from "path";
import type { RecordingMetadata } from "../shared/types.js";

const RECORDINGS_DIR = join(import.meta.dir, "../../recordings");
const METADATA_FILE = join(RECORDINGS_DIR, "index.json");

let metadataCache: RecordingMetadata[] | null = null;

async function ensureRecordingsDir(): Promise<void> {
  await mkdir(RECORDINGS_DIR, { recursive: true });
}

async function loadMetadata(): Promise<RecordingMetadata[]> {
  if (metadataCache) return metadataCache;
  try {
    const data = await Bun.file(METADATA_FILE).json();
    metadataCache = Array.isArray(data) ? data : [];
  } catch {
    metadataCache = [];
  }
  return metadataCache;
}

async function saveMetadata(metadata: RecordingMetadata[]): Promise<void> {
  metadataCache = metadata;
  await Bun.write(METADATA_FILE, JSON.stringify(metadata, null, 2));
}

export async function saveRecordingFromUpload(
  file: File | Blob,
  peakDb: number,
  durationSeconds: number
): Promise<RecordingMetadata> {
  await ensureRecordingsDir();
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const ext = file.type.includes("webm") ? "webm" : "wav";
  const filename = `${timestamp}.${ext}`;
  const filepath = join(RECORDINGS_DIR, filename);

  await Bun.write(filepath, file);

  const meta: RecordingMetadata = {
    id: filename.replace(/\.[^.]+$/, ""),
    filename,
    timestamp: new Date().toISOString(),
    peakDb,
    durationSeconds,
  };

  const list = await loadMetadata();
  list.unshift(meta);
  await saveMetadata(list);

  return meta;
}

export async function getRecordings(): Promise<RecordingMetadata[]> {
  return loadMetadata();
}

export function getRecordingsDir(): string {
  return RECORDINGS_DIR;
}
