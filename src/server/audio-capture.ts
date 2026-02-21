import type { AppConfig } from "../shared/types.js";

const TEMP_FILE = "/tmp/decibel-reader-sample.wav";
const isMac = process.platform === "darwin";

export type DbSampleCallback = (dB: number, timestamp: number) => void;
export type ThresholdExceededCallback = (dB: number) => void;

/**
 * Capture a short audio sample and compute dB level.
 * Linux: arecord + sox | macOS: sox rec + sox stat
 * Returns dB (dBFS) or null if capture/analysis fails.
 */
async function captureAndMeasureDb(): Promise<number | null> {
  try {
    if (isMac) {
      // macOS: sox rec (requires: brew install sox)
      const rec = Bun.spawn(
        ["rec", "-q", "-r", "16000", "-c", "1", "-b", "16", "-e", "signed-integer", TEMP_FILE, "trim", "0", "1"],
        { stdout: "pipe", stderr: "pipe" }
      );
      await rec.exited;
      if (rec.exitCode !== 0) return null;
    } else {
      // Linux (Raspberry Pi): arecord
      const arecord = Bun.spawn(
        ["arecord", "-q", "-f", "S16_LE", "-r", "16000", "-c", "1", "-d", "1", TEMP_FILE],
        { stdout: "pipe", stderr: "pipe" }
      );
      await arecord.exited;
      if (arecord.exitCode !== 0) return null;
    }

    // Analyze with sox to get max amplitude
    const sox = Bun.spawn(["sox", TEMP_FILE, "-n", "stat", "2>&1"], {
      stdout: "pipe",
      stderr: "pipe",
    });
    const output = await new Response(sox.stdout).text();
    await sox.exited;

    const match = output.match(/Maximum amplitude:\s*([\d.]+)/);
    if (!match) return null;

    const maxAmplitude = parseFloat(match[1]);
    if (maxAmplitude <= 0) return null;

    const dB = 20 * Math.log10(maxAmplitude);
    return Math.max(-60, Math.min(0, dB));
  } catch {
    return null;
  }
}

export interface AudioCaptureOptions {
  config: () => AppConfig;
  onDbSample: DbSampleCallback;
  onThresholdExceeded: ThresholdExceededCallback;
}

let captureInterval: ReturnType<typeof setInterval> | null = null;

export function startAudioCapture(options: AudioCaptureOptions): void {
  if (captureInterval) return;

  const { config, onDbSample, onThresholdExceeded } = options;

  async function tick() {
    const cfg = config();
    const dB = await captureAndMeasureDb();
    if (dB === null) return;

    const timestamp = Date.now();
    onDbSample(dB, timestamp);

    if (dB >= cfg.thresholdDb) {
      onThresholdExceeded(dB);
    }
  }

  const cfg = config();
  captureInterval = setInterval(tick, cfg.captureIntervalMs);
}

export function stopAudioCapture(): void {
  if (captureInterval) {
    clearInterval(captureInterval);
    captureInterval = null;
  }
}
