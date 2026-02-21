import { useCallback, useEffect, useState } from "react";
import type { AppConfig } from "../../shared/types";
import { AnalyticsView } from "./components/AnalyticsView";
import { AudioVisualizer } from "./components/AudioVisualizer";
import { RecordingsList } from "./components/RecordingsList";
import { StatusIndicator } from "./components/StatusIndicator";
import { ThresholdConfig } from "./components/ThresholdConfig";
import { useAudioCapture } from "./hooks/useAudioCapture";

const API_BASE = "/api";

type View = "monitor" | "analytics";

export default function App() {
  const [view, setView] = useState<View>("monitor");
  const [config, setConfig] = useState<AppConfig>({
    thresholdDb: -30,
    recordDurationSeconds: 0.5,
    captureIntervalMs: 500,
    soundTypes: ["Throat clearing"],
    classificationMinScore: 0.5,
  });
  const [recordingsVersion, setRecordingsVersion] = useState(0);
  const [micEnabled, setMicEnabled] = useState(false);

  const { dB, isRecording, error, stream, lastDetection, devices } = useAudioCapture({
    thresholdDb: config.thresholdDb,
    recordDurationMs: config.recordDurationSeconds * 1000,
    enabled: micEnabled,
    onRecordingUploaded: useCallback(() => setRecordingsVersion((v) => v + 1), []),
    soundTypes: config.soundTypes ?? [],
    classificationMinScore: config.classificationMinScore ?? 0.5,
    deviceId: config.deviceId || undefined,
  });

  useEffect(() => {
    fetch(`${API_BASE}/config`)
      .then((r) => r.json())
      .then(setConfig)
      .catch(() => {});
  }, []);

  const restartMonitoring = useCallback(() => {
    setMicEnabled(false);
    setTimeout(() => setMicEnabled(true), 100);
  }, []);

  const handleSaveConfig = async (updates: Partial<AppConfig>) => {
    const res = await fetch(`${API_BASE}/config`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
    const data = await res.json();
    setConfig(data);
    if (updates.deviceId !== undefined && micEnabled) restartMonitoring();
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className={`mx-auto px-4 py-8 ${view === "analytics" ? "max-w-5xl" : "max-w-2xl"}`}>
        <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold text-zinc-100">Decibel Reader</h1>
            <nav className="flex gap-1 rounded-lg bg-zinc-900 p-1">
              <button
                type="button"
                onClick={() => setView("monitor")}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  view === "monitor"
                    ? "bg-emerald-600 text-white"
                    : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
                }`}
              >
                Monitor
              </button>
              <button
                type="button"
                onClick={() => setView("analytics")}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  view === "analytics"
                    ? "bg-emerald-600 text-white"
                    : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
                }`}
              >
                Analytics
              </button>
            </nav>
          </div>
          <StatusIndicator connected={micEnabled} isRecording={isRecording} error={error} />
        </header>

        <main className="space-y-6">
          {view === "analytics" ? (
            <AnalyticsView />
          ) : !micEnabled ? (
            <div className="rounded-lg bg-zinc-900 p-6 text-center">
              <p className="mb-4 text-zinc-400">
                Click &quot;Start monitoring&quot; to begin. You&apos;ll be asked to allow microphone access.
              </p>
              <p className="mb-4 text-xs text-zinc-500">
                On Raspberry Pi, connect a USB microphone and ensure it&apos;s recognized before starting.
              </p>
              <button
                onClick={() => setMicEnabled(true)}
                className="rounded-md bg-emerald-600 px-4 py-2 font-medium text-white hover:bg-emerald-500"
              >
                Start monitoring
              </button>
            </div>
          ) : error ? (
            <div className="rounded-lg bg-zinc-900 p-6">
              <p className="text-red-400">{error}</p>
              <p className="mt-2 text-sm text-zinc-500">
                Grant microphone access in your browser and reload.
              </p>
            </div>
          ) : (
            <>
              <AudioVisualizer
                stream={stream}
                isRecording={isRecording}
                dB={dB}
                threshold={config.thresholdDb}
              />
              {lastDetection && (
                <div className="rounded-lg bg-zinc-900/80 px-4 py-2 text-sm text-zinc-400">
                  Last detected: <span className="font-medium text-emerald-400">{lastDetection}</span>
                </div>
              )}
            </>
          )}
          {view === "monitor" && (
            <>
              <ThresholdConfig config={config} onSave={handleSaveConfig} devices={devices} />
              <RecordingsList refreshTrigger={recordingsVersion} />
            </>
          )}
        </main>

        <footer className="mt-12 text-center text-sm text-zinc-500">
          Throat clearing detection · Browser audio
        </footer>
      </div>
    </div>
  );
}
