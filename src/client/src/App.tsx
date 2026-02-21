import { useCallback, useEffect, useState } from "react";
import type { AppConfig, WebSocketMessage } from "../../shared/types";
import { LiveMeter } from "./components/LiveMeter";
import { RecordingsList } from "./components/RecordingsList";
import { StatusIndicator } from "./components/StatusIndicator";
import { ThresholdConfig } from "./components/ThresholdConfig";
import { useWebSocket } from "./hooks/useWebSocket";

const API_BASE = "/api";

export default function App() {
  const [dB, setDb] = useState(0);
  const [config, setConfig] = useState<AppConfig>({
    thresholdDb: 60,
    recordDurationSeconds: 10,
    captureIntervalMs: 500,
  });
  const [isRecording, setIsRecording] = useState(false);
  const [recordingsVersion, setRecordingsVersion] = useState(0);

  const handleMessage = useCallback((msg: WebSocketMessage) => {
    switch (msg.type) {
      case "db_sample":
        setDb(msg.payload.dB);
        break;
      case "config":
        setConfig(msg.payload);
        break;
      case "recording_started":
        setIsRecording(true);
        break;
      case "recording_finished":
        setIsRecording(false);
        setRecordingsVersion((v) => v + 1);
        break;
    }
  }, []);

  const connected = useWebSocket(handleMessage);

  useEffect(() => {
    fetch(`${API_BASE}/config`)
      .then((r) => r.json())
      .then(setConfig)
      .catch(() => {});
  }, []);

  const handleSaveConfig = async (updates: Partial<AppConfig>) => {
    const res = await fetch(`${API_BASE}/config`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
    const data = await res.json();
    setConfig(data);
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="mx-auto max-w-2xl px-4 py-8">
        <header className="mb-8 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-zinc-100">Decibel Reader</h1>
          <StatusIndicator connected={connected} isRecording={isRecording} />
        </header>

        <main className="space-y-6">
          <LiveMeter dB={dB} threshold={config.thresholdDb} />
          <ThresholdConfig config={config} onSave={handleSaveConfig} />
          <RecordingsList refreshTrigger={recordingsVersion} />
        </main>

        <footer className="mt-12 text-center text-sm text-zinc-500">
          Raspberry Pi Audio Monitor · dBFS (device-dependent)
        </footer>
      </div>
    </div>
  );
}
