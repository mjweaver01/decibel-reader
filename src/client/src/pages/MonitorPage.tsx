import { useCallback, useEffect, useState } from 'react';
import { DEFAULT_CONFIG, type AppConfig } from '../../../shared/types';
import { useMonitoringStatus } from '../context/MonitoringStatusContext';
import { AudioVisualizer } from '../components/AudioVisualizer';
import { RecordingsList } from '../components/RecordingsList';
import { ThresholdConfig } from '../components/ThresholdConfig';
import { useAudioCapture } from '../hooks/useAudioCapture';

const API_BASE = '/api';

export function MonitorPage() {
  const { setStatus } = useMonitoringStatus();

  const [config, setConfig] = useState<AppConfig>({
    thresholdDb: DEFAULT_CONFIG.thresholdDb,
    recordDurationSeconds: DEFAULT_CONFIG.recordDurationSeconds,
    captureIntervalMs: DEFAULT_CONFIG.captureIntervalMs,
    soundTypes: DEFAULT_CONFIG.soundTypes,
    classificationMinScore: DEFAULT_CONFIG.classificationMinScore,
  });

  const [recordingsVersion, setRecordingsVersion] = useState(0);
  const [micEnabled, setMicEnabled] = useState(false);

  const { dB, isRecording, error, stream, lastDetection, devices } =
    useAudioCapture({
      thresholdDb: config.thresholdDb,
      recordDurationMs: config.recordDurationSeconds * 1000,
      enabled: micEnabled,
      onRecordingUploaded: useCallback(
        () => setRecordingsVersion(v => v + 1),
        []
      ),
      soundTypes: config.soundTypes ?? [],
      classificationMinScore: config.classificationMinScore ?? 0.5,
      deviceId: config.deviceId || undefined,
    });

  useEffect(() => {
    setStatus({
      connected: micEnabled && !error,
      isRecording,
      error: error ?? null,
    });
    return () =>
      setStatus({ connected: false, isRecording: false, error: null });
  }, [micEnabled, isRecording, error, setStatus]);

  useEffect(() => {
    fetch(`${API_BASE}/config`)
      .then(r => r.json())
      .then(setConfig)
      .catch(() => {});
  }, []);

  const restartMonitoring = useCallback(() => {
    setMicEnabled(false);
    setTimeout(() => setMicEnabled(true), 100);
  }, []);

  const handleSaveConfig = async (updates: Partial<AppConfig>) => {
    const res = await fetch(`${API_BASE}/config`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    const data = await res.json();
    setConfig(data);
    if (updates.deviceId !== undefined && micEnabled) restartMonitoring();
  };

  if (!micEnabled) {
    return (
      <div className="rounded-lg bg-zinc-900 p-6 text-center">
        <p className="mb-4 text-zinc-400">
          Click &quot;Start monitoring&quot; to begin. You&apos;ll be asked to
          allow microphone access.
        </p>
        <p className="mb-4 text-xs text-zinc-500">
          On Raspberry Pi, connect a USB microphone and ensure it&apos;s
          recognized before starting.
        </p>
        <button
          onClick={() => setMicEnabled(true)}
          className="rounded-md bg-emerald-600 px-4 py-2 font-medium text-white hover:bg-emerald-500"
        >
          Start monitoring
        </button>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg bg-zinc-900 p-6">
        <p className="text-red-400">{error}</p>
        <p className="mt-2 text-sm text-zinc-500">
          Grant microphone access in your browser and reload.
        </p>
      </div>
    );
  }

  return (
    <>
      <AudioVisualizer
        stream={stream}
        isRecording={isRecording}
        dB={dB}
        threshold={config.thresholdDb}
      />
      {lastDetection && (
        <div className="rounded-lg bg-zinc-900/80 px-4 py-2 text-sm text-zinc-400">
          Last detected:{' '}
          <span className="font-medium text-emerald-400">{lastDetection}</span>
        </div>
      )}
      <ThresholdConfig
        config={config}
        onSave={handleSaveConfig}
        devices={devices}
      />
      <RecordingsList refreshTrigger={recordingsVersion} />
    </>
  );
}
