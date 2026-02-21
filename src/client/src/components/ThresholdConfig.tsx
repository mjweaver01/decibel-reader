import { useState } from "react";
import type { AppConfig } from "../../../shared/types";

interface ThresholdConfigProps {
  config: AppConfig;
  onSave: (config: Partial<AppConfig>) => Promise<void>;
}

export function ThresholdConfig({ config, onSave }: ThresholdConfigProps) {
  const [thresholdDb, setThresholdDb] = useState(config.thresholdDb);
  const [recordDurationSeconds, setRecordDurationSeconds] = useState(config.recordDurationSeconds);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave({
        thresholdDb,
        recordDurationSeconds,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="rounded-lg bg-zinc-900 p-6">
      <h2 className="mb-4 text-lg font-semibold text-zinc-100">Configuration</h2>
      <div className="space-y-4">
        <div>
          <label htmlFor="threshold" className="mb-1 block text-sm text-zinc-400">
            Threshold (dB)
          </label>
          <input
            id="threshold"
            type="number"
            min={-60}
            max={0}
            step={1}
            value={thresholdDb}
            onChange={(e) => setThresholdDb(Number(e.target.value))}
            className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-zinc-100 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
          <p className="mt-1 text-xs text-zinc-500">
            Record when sound exceeds this level (dBFS, device-dependent)
          </p>
        </div>
        <div>
          <label htmlFor="duration" className="mb-1 block text-sm text-zinc-400">
            Record Duration (seconds)
          </label>
          <select
            id="duration"
            value={recordDurationSeconds}
            onChange={(e) => setRecordDurationSeconds(Number(e.target.value))}
            className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-zinc-100 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          >
            <option value={5}>5 seconds</option>
            <option value={10}>10 seconds</option>
            <option value={15}>15 seconds</option>
            <option value={30}>30 seconds</option>
          </select>
        </div>
        <button
          type="submit"
          disabled={saving}
          className="rounded-md bg-emerald-600 px-4 py-2 font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save"}
        </button>
      </div>
    </form>
  );
}
