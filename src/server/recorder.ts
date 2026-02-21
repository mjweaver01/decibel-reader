import { mkdir } from "fs/promises";
import { join } from "path";
import type { AppConfig, RecordingMetadata } from "../shared/types.js";

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

let isRecording = false;

export function getIsRecording(): boolean {
  return isRecording;
}

export async function startRecording(config: AppConfig, peakDb: number): Promise<RecordingMetadata | null> {
  if (isRecording) return null;

  await ensureRecordingsDir();
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const filename = `${timestamp}.wav`;
  const filepath = join(RECORDINGS_DIR, filename);

  isRecording = true;

  try {
    const proc = Bun.spawn(
      [
        "arecord",
        "-q",
        "-f",
        "S16_LE",
        "-r",
        "16000",
        "-c",
        "1",
        "-d",
        String(config.recordDurationSeconds),
        filepath,
      ],
      { stdout: "pipe", stderr: "pipe" }
    );
    await proc.exited;

    const meta: RecordingMetadata = {
      id: filename.replace(".wav", ""),
      filename,
      timestamp: new Date().toISOString(),
      peakDb,
      durationSeconds: config.recordDurationSeconds,
    };

    const list = await loadMetadata();
    list.unshift(meta);
    await saveMetadata(list);

    return meta;
  } catch {
    return null;
  } finally {
    isRecording = false;
  }
}

export async function getRecordings(): Promise<RecordingMetadata[]> {
  return loadMetadata();
}

export function getRecordingsDir(): string {
  return RECORDINGS_DIR;
}
