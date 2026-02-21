import { useCallback, useEffect, useRef, useState } from 'react';
import { API_BASE, MIN_DB, MAX_DB } from '@shared/constants';
import { logger } from '@shared/logger';
import { getClassifier, classifyAudio } from '../lib/soundClassifier';

function computeDbFromAnalyser(
  analyser: AnalyserNode,
  dataArray: Uint8Array
): number {
  // @ts-expect-error - Web Audio API Uint8Array type mismatch in strict mode
  analyser.getByteTimeDomainData(dataArray);
  let sum = 0;
  for (let i = 0; i < dataArray.length; i++) {
    const n = (dataArray[i] - 128) / 128;
    sum += n * n;
  }
  const rms = Math.sqrt(sum / dataArray.length) || 0.0001;
  const dbfs = 20 * Math.log10(rms);
  return Math.max(MIN_DB, Math.min(MAX_DB, dbfs));
}

/** Resample 48kHz -> 16kHz by taking every 3rd sample */
function resampleTo16k(input: Float32Array, sampleRate: number): Float32Array {
  if (sampleRate === 16000) return input;
  const ratio = sampleRate / 16000;
  const outputLength = Math.floor(input.length / ratio);
  const output = new Float32Array(outputLength);
  for (let i = 0; i < outputLength; i++) {
    output[i] = input[Math.floor(i * ratio)];
  }
  return output;
}

export interface MediaDeviceInfo {
  deviceId: string;
  label: string;
}

export interface UseAudioCaptureOptions {
  thresholdDb: number;
  /** How long (ms) sound must stay below threshold before stopping the recording */
  bufferMs: number;
  enabled: boolean;
  onRecordingUploaded?: () => void;
  /** If empty, record on any loud sound. If set, only record when classification matches. */
  soundTypes?: string[];
  classificationMinScore?: number;
  /** Specific microphone deviceId. If not set, uses default or first available. */
  deviceId?: string;
}

const MAX_RECORDING_MS = 60_000; // Safety cap: stop after 60s regardless

export function useAudioCapture({
  thresholdDb,
  bufferMs,
  enabled,
  onRecordingUploaded,
  soundTypes = [],
  classificationMinScore = 0.5,
  deviceId,
}: UseAudioCaptureOptions) {
  const [dB, setDb] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [lastDetection, setLastDetection] = useState<string | null>(null);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const lastTriggerRef = useRef(0);
  const currentDbRef = useRef(0);
  const belowThresholdSinceRef = useRef<number | null>(null);
  const recordingStartTimeRef = useRef<number>(0);
  const cooldownMs = bufferMs + 2000;
  const classificationResolveRef = useRef<
    ((result: { label: string | null; shouldUpload: boolean }) => void) | null
  >(null);

  // Rolling buffer: ~1.5 sec at 48kHz = 72000 samples
  const BUFFER_SIZE = 72000;
  const bufferRef = useRef<Float32Array>(new Float32Array(BUFFER_SIZE));
  const bufferIndexRef = useRef(0);
  const sampleRateRef = useRef(48000);

  const uploadRecording = useCallback(
    async (
      blob: Blob,
      peakDb: number,
      durationSeconds: number,
      classification?: string
    ) => {
      const formData = new FormData();
      formData.append('audio', blob, 'recording.webm');
      formData.append('peakDb', String(peakDb));
      formData.append('durationSeconds', String(durationSeconds));
      if (classification) formData.append('classification', classification);

      const res = await fetch(`${API_BASE}/recordings`, {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) throw new Error('Upload failed');
      return res.json();
    },
    []
  );

  const startRecordingRef = useRef<(peakDb: number) => void>(() => {});
  const startRecording = useCallback(
    (peakDb: number) => {
      const stream = streamRef.current;
      if (!stream || isRecording) {
        logger(
          `[DecibelReader] startRecording skipped: ${!stream ? 'no stream' : 'already recording'}`
        );
        return;
      }

      const classificationPromise = new Promise<{
        label: string | null;
        shouldUpload: boolean;
      }>(resolve => {
        classificationResolveRef.current = resolve;
      });

      setIsRecording(true);
      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      recorderRef.current = recorder;
      const chunks: Blob[] = [];

      recorder.ondataavailable = e => {
        if (e.data.size) chunks.push(e.data);
      };

      recorder.onstop = async () => {
        recorderRef.current = null;
        belowThresholdSinceRef.current = null;
        setIsRecording(false);
        const blob = new Blob(chunks, { type: 'audio/webm' });
        classificationResolveRef.current = null;

        if (blob.size === 0) return;

        const durationSeconds =
          (Date.now() - recordingStartTimeRef.current) / 1000;

        const result = await Promise.race([
          classificationPromise,
          new Promise<{ label: string | null; shouldUpload: boolean }>(
            resolve =>
              setTimeout(
                () => resolve({ label: null, shouldUpload: true }),
                500
              )
          ),
        ]);

        if (!result.shouldUpload) return;

        try {
          await uploadRecording(
            blob,
            peakDb,
            durationSeconds,
            result.label ?? undefined
          );
          onRecordingUploaded?.();
        } catch (err) {
          logger.error('[DecibelReader] Upload failed:', err);
          setError('Failed to save recording');
        }
      };

      recorder.start(100);
      recordingStartTimeRef.current = Date.now();
      belowThresholdSinceRef.current = null;
      // Stop is handled dynamically in the tick loop when sound stays below threshold for bufferMs
    },
    [isRecording, uploadRecording, onRecordingUploaded]
  );
  startRecordingRef.current = startRecording;

  const runClassificationAndMaybeRecord = useCallback(
    async (peakDb: number) => {
      const soundTypesToCheck = soundTypes.filter(s => s.trim());
      const recordAnyLoudSound = soundTypesToCheck.length === 0;

      // Record immediately to capture the full sound; classification runs in parallel for labeling
      startRecordingRef.current(peakDb);

      const resolveClassification = (
        label: string | null,
        shouldUpload: boolean
      ) => {
        classificationResolveRef.current?.({ label, shouldUpload });
      };

      try {
        const buffer = bufferRef.current;
        const idx = bufferIndexRef.current;
        const sr = sampleRateRef.current;

        const samplesNeeded = Math.min(BUFFER_SIZE, Math.floor(sr * 1.5));
        const audioChunk = new Float32Array(samplesNeeded);
        for (let i = 0; i < samplesNeeded; i++) {
          const pos = (idx - samplesNeeded + i + BUFFER_SIZE) % BUFFER_SIZE;
          audioChunk[i] = buffer[pos];
        }

        const resampled = resampleTo16k(audioChunk, sr);
        if (resampled.length < 15000) {
          resolveClassification(null, recordAnyLoudSound);
          return;
        }

        const classifier = await getClassifier({
          scoreThreshold: 0.05,
          maxResults: 5,
        });
        const results = classifyAudio(classifier, resampled, 16000);
        const categories = results[0]?.classifications?.[0]?.categories ?? [];
        const topCategory = categories[0];

        if (topCategory) {
          const label = topCategory.displayName || topCategory.categoryName;
          setLastDetection(
            `${label} (${(topCategory.score * 100).toFixed(0)}%)`
          );

          const categoryLabel =
            topCategory.categoryName || topCategory.displayName || '';
          const matchedSelected = soundTypesToCheck.find(
            selected => categoryLabel === selected
          );
          const match = !!matchedSelected;
          const scoreOk = topCategory.score >= classificationMinScore;
          const shouldUpload = recordAnyLoudSound ? scoreOk : match && scoreOk;
          const classificationToSave = recordAnyLoudSound
            ? label
            : (matchedSelected ?? label);

          resolveClassification(classificationToSave, shouldUpload);
        } else {
          setLastDetection(null);
          resolveClassification(null, recordAnyLoudSound);
        }
      } catch (err) {
        logger.error('[DecibelReader] Classification failed:', err);
        setLastDetection(null);
        resolveClassification(null, recordAnyLoudSound);
      }
    },
    [soundTypes, classificationMinScore]
  );

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;
    let animationId: number;
    let scriptProcessor: ScriptProcessorNode | null = null;

    const run = async () => {
      try {
        const getStream = async (
          constraints: MediaStreamConstraints
        ): Promise<MediaStream> => {
          const s = await navigator.mediaDevices.getUserMedia(constraints);
          // Refresh device list (labels become available after permission)
          const devs = await navigator.mediaDevices.enumerateDevices();
          const inputs = devs
            .filter(d => d.kind === 'audioinput')
            .map(d => ({
              deviceId: d.deviceId,
              label: d.label || `Microphone ${d.deviceId.slice(0, 8)}`,
            }));
          setDevices(inputs);
          return s;
        };

        let stream: MediaStream;
        const audioConstraints: boolean | MediaTrackConstraints = deviceId
          ? { deviceId: { exact: deviceId } }
          : true;

        try {
          stream = await getStream({ audio: audioConstraints });
        } catch (firstErr) {
          const msg =
            firstErr instanceof Error ? firstErr.message : String(firstErr);
          if (
            msg.includes('device') ||
            msg.includes('NotFound') ||
            msg.includes('not found')
          ) {
            const devs = await navigator.mediaDevices.enumerateDevices();
            const inputs = devs.filter(d => d.kind === 'audioinput');
            let fallbackStream: MediaStream | null = null;
            for (const dev of inputs) {
              try {
                fallbackStream = await getStream({
                  audio: { deviceId: { exact: dev.deviceId } },
                });
                break;
              } catch {
                continue;
              }
            }
            if (!fallbackStream) {
              setError(
                'No microphone found. Connect a USB microphone (on Raspberry Pi) or ensure your mic is connected and set as default.'
              );
              return;
            }
            stream = fallbackStream;
          } else {
            throw firstErr;
          }
        }

        if (cancelled) {
          stream.getTracks().forEach(t => t.stop());
          return;
        }
        streamRef.current = stream;
        setStream(stream);
        setError(null);

        logger.log('[DecibelReader] Mic acquired. Config:', {
          thresholdDb,
          cooldownMs,
          bufferMs,
          soundTypes,
          classificationMinScore,
        });

        const ctx = new AudioContext();
        sampleRateRef.current = ctx.sampleRate;
        const source = ctx.createMediaStreamSource(stream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 2048;
        analyser.smoothingTimeConstant = 0.15;
        source.connect(analyser);

        // Buffer audio for classification (ScriptProcessorNode is deprecated but widely supported)
        scriptProcessor = ctx.createScriptProcessor(2048, 1, 1);
        scriptProcessor.onaudioprocess = e => {
          const input = e.inputBuffer.getChannelData(0);
          const buffer = bufferRef.current;
          let idx = bufferIndexRef.current;
          for (let i = 0; i < input.length; i++) {
            buffer[idx] = input[i];
            idx = (idx + 1) % BUFFER_SIZE;
          }
          bufferIndexRef.current = idx;
        };
        const silentGain = ctx.createGain();
        silentGain.gain.value = 0;
        source.connect(scriptProcessor);
        scriptProcessor.connect(silentGain);
        silentGain.connect(ctx.destination);

        const dataArray = new Uint8Array(analyser.frequencyBinCount);

        let logThrottle = 0;
        const tick = () => {
          if (cancelled) return;
          const currentDb = computeDbFromAnalyser(analyser, dataArray);
          currentDbRef.current = currentDb;
          setDb(currentDb);

          if (++logThrottle % 60 === 0) {
            logger.log(
              '[DecibelReader] dB:',
              currentDb.toFixed(1),
              '| threshold:',
              thresholdDb,
              '| above?',
              currentDb >= thresholdDb
            );
          }

          const now = Date.now();
          const recorder = recorderRef.current;

          // Dynamic stop: when recording, check if we should stop
          if (recorder && recorder.state === 'recording') {
            const recordingElapsed = now - recordingStartTimeRef.current;
            if (recordingElapsed >= MAX_RECORDING_MS) {
              logger.log(
                '[DecibelReader] Max recording time reached, stopping'
              );
              recorder.stop();
            } else if (currentDb < thresholdDb) {
              if (belowThresholdSinceRef.current === null) {
                belowThresholdSinceRef.current = now;
              }
              const belowElapsed = now - belowThresholdSinceRef.current;
              if (belowElapsed >= bufferMs && recordingElapsed >= 300) {
                logger.log(
                  '[DecibelReader] Sound below threshold for',
                  bufferMs,
                  'ms, stopping recording'
                );
                recorder.stop();
              }
            } else {
              belowThresholdSinceRef.current = null;
            }
          }

          if (
            currentDb >= thresholdDb &&
            now - lastTriggerRef.current > cooldownMs
          ) {
            logger.log(
              '[DecibelReader] Threshold exceeded! dB:',
              currentDb.toFixed(1),
              '-> running classification'
            );
            lastTriggerRef.current = now;
            void runClassificationAndMaybeRecord(currentDb);
          }
          animationId = requestAnimationFrame(tick);
        };
        tick();
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (
          msg.includes('device') ||
          msg.includes('NotFound') ||
          msg.includes('not found')
        ) {
          setError(
            'No microphone found. Connect a USB microphone (on Raspberry Pi) or ensure your mic is connected and set as default.'
          );
        } else if (msg.includes('Permission') || msg.includes('denied')) {
          setError(
            'Microphone access denied. Allow microphone access in your browser and reload.'
          );
        } else {
          setError(msg);
        }
      }
    };

    run();
    return () => {
      cancelled = true;
      cancelAnimationFrame(animationId!);
      scriptProcessor?.disconnect();
      streamRef.current?.getTracks().forEach(t => t.stop());
      streamRef.current = null;
      setStream(null);
    };
  }, [
    enabled,
    thresholdDb,
    bufferMs,
    cooldownMs,
    runClassificationAndMaybeRecord,
    deviceId,
  ]);

  return {
    dB,
    isRecording,
    error,
    stream,
    lastDetection,
    devices,
    startRecording,
  };
}
