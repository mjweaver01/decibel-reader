import { useCallback, useEffect, useRef, useState } from 'react';
import { getClassifier, classifyAudio } from '../lib/soundClassifier';

const MIN_DB = -60;
const MAX_DB = 0;

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
  recordDurationMs: number;
  enabled: boolean;
  onRecordingUploaded?: () => void;
  /** If empty, record on any loud sound. If set, only record when classification matches. */
  soundTypes?: string[];
  classificationMinScore?: number;
  /** Specific microphone deviceId. If not set, uses default or first available. */
  deviceId?: string;
}

export function useAudioCapture({
  thresholdDb,
  recordDurationMs,
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
  const cooldownMs = recordDurationMs + 1000;

  // Rolling buffer: ~1.5 sec at 48kHz = 72000 samples
  const BUFFER_SIZE = 72000;
  const bufferRef = useRef<Float32Array>(new Float32Array(BUFFER_SIZE));
  const bufferIndexRef = useRef(0);
  const sampleRateRef = useRef(48000);

  const uploadRecording = useCallback(
    async (blob: Blob, peakDb: number, classification?: string) => {
      const formData = new FormData();
      formData.append('audio', blob, 'recording.webm');
      formData.append('peakDb', String(peakDb));
      formData.append('durationSeconds', String(recordDurationMs / 1000));
      if (classification) formData.append('classification', classification);

      const res = await fetch('/api/recordings', {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) throw new Error('Upload failed');
      return res.json();
    },
    [recordDurationMs]
  );

  const startRecordingRef = useRef<
    (dB: number, classification?: string) => void
  >(() => {});
  const startRecording = useCallback(
    (peakDb: number, classification?: string) => {
      const stream = streamRef.current;
      if (!stream || isRecording) {
        console.log(
          '[DecibelReader] startRecording skipped:',
          !stream ? 'no stream' : 'already recording'
        );
        return;
      }

      console.log(
        '[DecibelReader] Recording started, duration:',
        recordDurationMs,
        'ms',
        'classification:',
        classification ?? '(none)'
      );
      setIsRecording(true);
      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      recorderRef.current = recorder;
      const chunks: Blob[] = [];

      recorder.ondataavailable = e => {
        if (e.data.size) chunks.push(e.data);
      };

      recorder.onstop = async () => {
        recorderRef.current = null;
        setIsRecording(false);
        const blob = new Blob(chunks, { type: 'audio/webm' });
        console.log('[DecibelReader] Recording stopped, blob size:', blob.size);
        if (blob.size > 0) {
          try {
            await uploadRecording(blob, peakDb, classification);
            console.log('[DecibelReader] Upload successful');
            onRecordingUploaded?.();
          } catch (err) {
            console.error('[DecibelReader] Upload failed:', err);
            setError('Failed to save recording');
          }
        }
      };

      recorder.start(100);
      setTimeout(() => recorder.stop(), recordDurationMs);
    },
    [isRecording, recordDurationMs, uploadRecording, onRecordingUploaded]
  );
  startRecordingRef.current = startRecording;

  const runClassificationAndMaybeRecord = useCallback(
    async (peakDb: number) => {
      const soundTypesToCheck = soundTypes.filter(s => s.trim());
      console.log(
        '[DecibelReader] runClassificationAndMaybeRecord peakDb:',
        peakDb.toFixed(1),
        'soundTypesToCheck:',
        soundTypesToCheck
      );

      const recordAnyLoudSound = soundTypesToCheck.length === 0;
      if (recordAnyLoudSound) {
        console.log(
          '[DecibelReader] No sound types -> recording any loud sound, will classify'
        );
      }

      try {
        const buffer = bufferRef.current;
        const idx = bufferIndexRef.current;
        const sr = sampleRateRef.current;

        // Get last ~1.5 sec of audio (YAMNet uses 0.96s frames; more context helps)
        const samplesNeeded = Math.min(BUFFER_SIZE, Math.floor(sr * 1.5));
        const audioChunk = new Float32Array(samplesNeeded);
        for (let i = 0; i < samplesNeeded; i++) {
          const pos = (idx - samplesNeeded + i + BUFFER_SIZE) % BUFFER_SIZE;
          audioChunk[i] = buffer[pos];
        }

        const resampled = resampleTo16k(audioChunk, sr);
        if (resampled.length < 15000) {
          console.log(
            '[DecibelReader] Buffer too small for classification:',
            resampled.length
          );
          if (recordAnyLoudSound) {
            startRecordingRef.current(peakDb);
          }
          return;
        }

        // Use low threshold so we get results; filter by classificationMinScore ourselves
        const classifier = await getClassifier({
          scoreThreshold: 0.05,
          maxResults: 5,
        });
        console.log(
          '[DecibelReader] Running classification, samples:',
          resampled.length
        );
        const results = classifyAudio(classifier, resampled, 16000);
        const categories = results[0]?.classifications?.[0]?.categories ?? [];
        const topCategory = categories[0];

        if (categories.length === 0) {
          console.log(
            '[DecibelReader] Classification: no categories (all filtered by model)'
          );
        } else {
          console.log(
            '[DecibelReader] Classification:',
            topCategory.categoryName || topCategory.displayName,
            (topCategory.score * 100).toFixed(1) + '%',
            'min:',
            classificationMinScore * 100 + '%'
          );
        }

        if (topCategory) {
          const label = topCategory.displayName || topCategory.categoryName;
          setLastDetection(
            `${label} (${(topCategory.score * 100).toFixed(0)}%)`
          );

          const categoryLabel =
            topCategory.categoryName || topCategory.displayName || '';
          const matchedSelected = soundTypesToCheck.find(selected => {
            if (categoryLabel === selected) return true;
          });
          const match = !!matchedSelected;
          const scoreOk = topCategory.score >= classificationMinScore;
          const willRecord = recordAnyLoudSound
            ? scoreOk
            : match && scoreOk;
          // When no types: use top classification. When types selected: use matched one
          const classificationToSave = recordAnyLoudSound
            ? label
            : matchedSelected ?? label;
          console.log(
            '[DecibelReader] Match:',
            match,
            '| score OK:',
            scoreOk,
            '| will record:',
            willRecord
          );
          if (willRecord) {
            console.log(
              '[DecibelReader] -> Starting recording, classification:',
              classificationToSave
            );
            startRecordingRef.current(peakDb, classificationToSave);
          }
        } else if (recordAnyLoudSound) {
          // No classification result but we record any loud sound - save without classification
          startRecordingRef.current(peakDb);
        } else {
          setLastDetection(null);
        }
      } catch (err) {
        console.error('[DecibelReader] Classification failed:', err);
        setLastDetection(null);
        if (recordAnyLoudSound) {
          startRecordingRef.current(peakDb);
        }
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

        console.log('[DecibelReader] Mic acquired. Config:', {
          thresholdDb,
          cooldownMs,
          recordDurationMs,
          soundTypes,
          classificationMinScore,
        });

        const ctx = new AudioContext();
        sampleRateRef.current = ctx.sampleRate;
        const source = ctx.createMediaStreamSource(stream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 2048;
        analyser.smoothingTimeConstant = 0.3;
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
          setDb(currentDb);

          if (++logThrottle % 60 === 0) {
            console.log(
              '[DecibelReader] dB:',
              currentDb.toFixed(1),
              '| threshold:',
              thresholdDb,
              '| above?',
              currentDb >= thresholdDb
            );
          }

          const now = Date.now();
          if (
            currentDb >= thresholdDb &&
            now - lastTriggerRef.current > cooldownMs
          ) {
            console.log(
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
