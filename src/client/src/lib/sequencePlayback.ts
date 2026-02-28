import { API_BASE } from '@shared/constants';

let audioContext: AudioContext | null = null;
let activeSources: AudioBufferSourceNode[] = [];

function getAudioContext(): AudioContext {
  if (!audioContext) {
    audioContext = new AudioContext();
  }
  return audioContext;
}

export async function fetchAndDecodeAudio(recordingId: string): Promise<AudioBuffer> {
  const response = await fetch(`${API_BASE}/recordings/${recordingId}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch recording ${recordingId}`);
  }
  const arrayBuffer = await response.arrayBuffer();
  const ctx = getAudioContext();
  return ctx.decodeAudioData(arrayBuffer);
}

export interface PlaybackOptions {
  recordingIds: string[];
  gapSeconds?: number;
  onEnded?: () => void;
  onError?: (error: Error) => void;
}

export async function playSequence(options: PlaybackOptions): Promise<void> {
  const { recordingIds, gapSeconds = 0, onEnded, onError } = options;

  try {
    stop();

    const ctx = getAudioContext();
    if (ctx.state === 'suspended') {
      await ctx.resume();
    }

    const buffers: AudioBuffer[] = [];
    for (const id of recordingIds) {
      const buffer = await fetchAndDecodeAudio(id);
      buffers.push(buffer);
    }

    let startTime = ctx.currentTime;
    const sources: AudioBufferSourceNode[] = [];

    for (const buffer of buffers) {
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);
      source.start(startTime);
      sources.push(source);
      startTime += buffer.duration + gapSeconds;
    }

    activeSources = sources;

    if (sources.length > 0) {
      const lastSource = sources[sources.length - 1];
      lastSource.onended = () => {
        activeSources = [];
        onEnded?.();
      };
    }
  } catch (error) {
    activeSources = [];
    onError?.(error instanceof Error ? error : new Error(String(error)));
  }
}

export function stop(): void {
  for (const source of activeSources) {
    try {
      source.stop();
      source.disconnect();
    } catch {
      // ignore - source may have already ended
    }
  }
  activeSources = [];
}

export function isPlaying(): boolean {
  return activeSources.length > 0;
}
