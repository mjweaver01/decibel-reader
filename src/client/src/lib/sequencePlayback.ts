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

export interface ClipInfo {
  recordingId: string;
  startTime: number;
  endTime: number;
}

export interface PlaybackOptions {
  clips: ClipInfo[];
  gapSeconds?: number;
  onEnded?: () => void;
  onError?: (error: Error) => void;
}

export async function playSequence(options: PlaybackOptions): Promise<void> {
  const { clips, gapSeconds = 0, onEnded, onError } = options;

  try {
    stop();

    const ctx = getAudioContext();
    if (ctx.state === 'suspended') {
      await ctx.resume();
    }

    const buffers: { buffer: AudioBuffer; clip: ClipInfo }[] = [];
    for (const clip of clips) {
      const buffer = await fetchAndDecodeAudio(clip.recordingId);
      buffers.push({ buffer, clip });
    }

    let startTime = ctx.currentTime;
    const sources: AudioBufferSourceNode[] = [];

    for (const { buffer, clip } of buffers) {
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);
      
      const clipDuration = clip.endTime - clip.startTime;
      source.start(startTime, clip.startTime, clipDuration);
      sources.push(source);
      startTime += clipDuration + gapSeconds;
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
