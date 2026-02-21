import { useMonitoringStatus } from '../context/MonitoringStatusContext';
import { useRecordingsVersion } from '../store/recordingsVersion';
import { AudioVisualizer } from '../components/AudioVisualizer';
import { RecordingsList } from '../components/RecordingsList';
import { Configuration } from '../components/Configuration';

export function MonitorPage() {
  const {
    setMicEnabled,
    micEnabled,
    dB,
    isRecording,
    error,
    stream,
    lastDetection,
    config,
    handleSaveConfig,
    devices,
  } = useMonitoringStatus();
  const recordingsVersion = useRecordingsVersion();

  if (!micEnabled) {
    return (
      <div className="rounded-lg bg-zinc-900 p-6 ring-1 ring-zinc-700/50 text-center">
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
      <div className="rounded-lg bg-zinc-900 p-6 ring-1 ring-zinc-700/50">
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
        <div className="rounded-lg bg-zinc-900/80 px-4 py-2 ring-1 ring-zinc-700/50 text-sm text-zinc-400">
          Last detected:{' '}
          <span className="font-medium text-emerald-400">{lastDetection}</span>
        </div>
      )}
      <div className="grid grid-cols-1 gap-4 md:gap-6 md:grid-cols-2">
        <Configuration
          config={config}
          onSave={handleSaveConfig}
          devices={devices}
        />
        <RecordingsList refreshTrigger={recordingsVersion} />
      </div>
    </>
  );
}
