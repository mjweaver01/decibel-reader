import { useEffect, useState } from "react";
import type { RecordingMetadata } from "../../../shared/types";

const API_BASE = "/api";

interface RecordingsListProps {
  refreshTrigger?: number;
}

export function RecordingsList({ refreshTrigger = 0 }: RecordingsListProps) {
  const [recordings, setRecordings] = useState<RecordingMetadata[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRecordings = async () => {
    fetch(`${API_BASE}/recordings`)
      .then((r) => r.json())
      .then(setRecordings)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchRecordings();
  }, [refreshTrigger]);

  useEffect(() => {
    const interval = setInterval(fetchRecordings, 5000);
    return () => clearInterval(interval);
  }, []);

  const formatDate = (ts: string) => {
    try {
      return new Date(ts).toLocaleString();
    } catch {
      return ts;
    }
  };

  if (loading) {
    return (
      <div className="rounded-lg bg-zinc-900 p-6">
        <h2 className="mb-4 text-lg font-semibold text-zinc-100">Recordings</h2>
        <p className="text-zinc-500">Loading...</p>
      </div>
    );
  }

  const downloadUrl = (id: string) => `${API_BASE}/recordings/${encodeURIComponent(id)}`;
  const playUrl = downloadUrl;

  return (
    <div className="rounded-lg bg-zinc-900 p-6">
      <h2 className="mb-4 text-lg font-semibold text-zinc-100">Recordings</h2>
      {recordings.length === 0 ? (
        <p className="text-zinc-500">No recordings yet. Threshold exceeded recordings will appear here.</p>
      ) : (
        <div className="space-y-2">
          {recordings.map((r) => (
            <div
              key={r.id}
              className="flex items-center justify-between rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2"
            >
              <div className="min-w-0">
                <p className="truncate text-sm text-zinc-100">{formatDate(r.timestamp)}</p>
                <p className="text-xs text-zinc-500">
                  Peak: {r.peakDb.toFixed(1)} dB · {r.durationSeconds}s
                </p>
              </div>
              <div className="ml-2 flex shrink-0 gap-2">
                <a
                  href={playUrl(r.id)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded px-2 py-1 text-sm text-emerald-400 hover:bg-emerald-500/20"
                >
                  Play
                </a>
                <a
                  href={downloadUrl(r.id)}
                  download={`${r.id}.wav`}
                  className="rounded px-2 py-1 text-sm text-zinc-400 hover:bg-zinc-700"
                >
                  Download
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
