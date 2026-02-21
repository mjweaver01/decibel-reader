import { useCallback, useEffect, useRef, useState } from "react";

const MIN_DB = -60;
const MAX_DB = 0;

function computeDbFromAnalyser(analyser: AnalyserNode, dataArray: Uint8Array): number {
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

export interface UseAudioCaptureOptions {
  thresholdDb: number;
  recordDurationMs: number;
  enabled: boolean;
  onRecordingUploaded?: () => void;
}

export function useAudioCapture({
  thresholdDb,
  recordDurationMs,
  enabled,
  onRecordingUploaded,
}: UseAudioCaptureOptions) {
  const [dB, setDb] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const lastTriggerRef = useRef(0);
  const cooldownMs = recordDurationMs + 1000; // Don't re-trigger during/right after recording

  const uploadRecording = useCallback(
    async (blob: Blob, peakDb: number) => {
      const formData = new FormData();
      formData.append("audio", blob, "recording.webm");
      formData.append("peakDb", String(peakDb));
      formData.append("durationSeconds", String(Math.round(recordDurationMs / 1000)));

      const res = await fetch("/api/recordings", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) throw new Error("Upload failed");
      return res.json();
    },
    [recordDurationMs]
  );

  const startRecordingRef = useRef<(dB: number) => void>(() => {});
  const startRecording = useCallback(
    (peakDb: number) => {
      const stream = streamRef.current;
      if (!stream || isRecording) return;

      setIsRecording(true);
      const recorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      recorderRef.current = recorder;
      const chunks: Blob[] = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size) chunks.push(e.data);
      };

      recorder.onstop = async () => {
        recorderRef.current = null;
        setIsRecording(false);
        const blob = new Blob(chunks, { type: "audio/webm" });
        if (blob.size > 0) {
          try {
            await uploadRecording(blob, peakDb);
            onRecordingUploaded?.();
          } catch {
            setError("Failed to save recording");
          }
        }
      };

      recorder.start(100);
      setTimeout(() => recorder.stop(), recordDurationMs);
    },
    [isRecording, recordDurationMs, uploadRecording, onRecordingUploaded]
  );
  startRecordingRef.current = startRecording;

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;
    let animationId: number;

    const run = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        setStream(stream);
        setError(null);

        const ctx = new AudioContext();
        const source = ctx.createMediaStreamSource(stream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 2048;
        analyser.smoothingTimeConstant = 0.8;
        source.connect(analyser);

        const dataArray = new Uint8Array(analyser.frequencyBinCount);

        const tick = () => {
          if (cancelled) return;
          const currentDb = computeDbFromAnalyser(analyser, dataArray);
          setDb(currentDb);

          const now = Date.now();
          if (currentDb >= thresholdDb && now - lastTriggerRef.current > cooldownMs) {
            lastTriggerRef.current = now;
            startRecordingRef.current(currentDb);
          }
          animationId = requestAnimationFrame(tick);
        };
        tick();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Microphone access denied");
      }
    };

    run();
    return () => {
      cancelled = true;
      cancelAnimationFrame(animationId!);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      setStream(null);
    };
  }, [enabled, thresholdDb, cooldownMs]);

  return { dB, isRecording, error, stream, startRecording };
}
