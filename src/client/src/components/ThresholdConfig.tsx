import { useEffect, useState } from 'react';
import type { AppConfig } from '../../../shared/types';
import { getYamnetLabels } from '../lib/yamnetLabels';
import type { MediaDeviceInfo } from '../hooks/useAudioCapture';
import { SoundTypeMultiselect } from './SoundTypeMultiselect';

interface ThresholdConfigProps {
  config: AppConfig;
  onSave: (config: Partial<AppConfig>) => Promise<void>;
  devices: MediaDeviceInfo[];
}

export function ThresholdConfig({
  config,
  onSave,
  devices,
}: ThresholdConfigProps) {
  const [thresholdDb, setThresholdDb] = useState(config.thresholdDb);
  const [thresholdInput, setThresholdInput] = useState(
    String(Math.max(-60, Math.min(0, config.thresholdDb)))
  );
  const [recordDurationSeconds, setRecordDurationSeconds] = useState(
    config.recordDurationSeconds
  );
  const [soundTypes, setSoundTypes] = useState<string[]>(
    config.soundTypes ?? []
  );
  const [classificationMinScore, setClassificationMinScore] = useState(
    config.classificationMinScore ?? 0.5
  );
  const [deviceId, setDeviceId] = useState(config.deviceId ?? '');
  const [saving, setSaving] = useState(false);
  const [soundTypeOptions, setSoundTypeOptions] = useState<string[]>([]);

  useEffect(() => {
    getYamnetLabels().then(setSoundTypeOptions);
  }, []);

  useEffect(() => {
    const clamped = Math.max(-60, Math.min(0, config.thresholdDb));
    setThresholdDb(clamped);
    setThresholdInput(String(clamped));
    setRecordDurationSeconds(config.recordDurationSeconds);
    setSoundTypes(config.soundTypes ?? []);
    setClassificationMinScore(config.classificationMinScore ?? 0.5);
    setDeviceId(config.deviceId ?? '');
  }, [config]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedThreshold = (() => {
      const n = parseFloat(thresholdInput);
      return isNaN(n) ? thresholdDb : Math.max(-60, Math.min(0, n));
    })();
    setSaving(true);
    try {
      await onSave({
        thresholdDb: parsedThreshold,
        recordDurationSeconds,
        soundTypes,
        classificationMinScore,
        deviceId: deviceId || undefined,
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDeviceChange = async (newDeviceId: string) => {
    setDeviceId(newDeviceId);
    await onSave({ deviceId: newDeviceId || undefined });
  };

  const toggleSoundType = (name: string) => {
    setSoundTypes(prev =>
      prev.includes(name) ? prev.filter(s => s !== name) : [...prev, name]
    );
  };

  const removeSoundType = (name: string) => {
    setSoundTypes(prev => prev.filter(s => s !== name));
  };

  return (
    <form onSubmit={handleSubmit} className="rounded-lg bg-zinc-900 p-6">
      <h2 className="mb-4 text-lg font-semibold text-zinc-100">
        Configuration
      </h2>
      <div className="space-y-4">
        {devices.length > 0 && (
          <div>
            <label
              htmlFor="microphone"
              className="mb-1 block text-sm text-zinc-400"
            >
              Microphone
            </label>
            <select
              id="microphone"
              value={deviceId}
              onChange={e => handleDeviceChange(e.target.value)}
              className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-zinc-100 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              <option value="">Default</option>
              {devices.map(d => (
                <option key={d.deviceId} value={d.deviceId}>
                  {d.label}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-zinc-500">
              Select a different microphone if the default fails or is wrong
            </p>
          </div>
        )}
        <div>
          <label
            htmlFor="threshold"
            className="mb-1 block text-sm text-zinc-400"
          >
            Threshold (dB)
          </label>
          <input
            id="threshold"
            type="number"
            min={-60}
            max={0}
            step={1}
            value={thresholdInput}
            onChange={e => {
              const v = e.target.value;
              setThresholdInput(v);
              const n = v === '' || v === '-' ? null : parseFloat(v);
              if (n !== null && !isNaN(n))
                setThresholdDb(Math.max(-60, Math.min(0, n)));
            }}
            onBlur={() => {
              const n = parseFloat(thresholdInput);
              if (isNaN(n) || n < -60 || n > 0) {
                setThresholdInput(String(thresholdDb));
              }
            }}
            className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-zinc-100 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
          <p className="mt-1 text-xs text-zinc-500">
            Gate: only consider classification when sound exceeds this level
          </p>
        </div>
        <SoundTypeMultiselect
          options={soundTypeOptions}
          selected={soundTypes}
          onToggle={toggleSoundType}
          onRemove={removeSoundType}
          placeholder="Search sound types..."
        />
        {soundTypes.length > 0 && (
          <div>
            <label
              htmlFor="minScore"
              className="mb-1 block text-sm text-zinc-400"
            >
              Min confidence ({Math.round(classificationMinScore * 100)}%)
            </label>
            <input
              id="minScore"
              type="range"
              min={0.01}
              max={0.99}
              step={0.01}
              value={classificationMinScore}
              onChange={e => setClassificationMinScore(Number(e.target.value))}
              className="w-full"
            />
          </div>
        )}
        <div>
          <label
            htmlFor="duration"
            className="mb-1 block text-sm text-zinc-400"
          >
            Record Duration (seconds)
          </label>
          <select
            id="duration"
            value={recordDurationSeconds}
            onChange={e => setRecordDurationSeconds(Number(e.target.value))}
            className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-zinc-100 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          >
            <option value={0.1}>0.1 seconds</option>
            <option value={0.25}>0.25 seconds</option>
            <option value={0.5}>0.5 seconds</option>
            <option value={0.75}>0.75 seconds</option>
            <option value={1}>1 second</option>
            <option value={2}>2 seconds</option>
            <option value={3}>3 seconds</option>
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
          {saving ? 'Saving...' : 'Save'}
        </button>
      </div>
    </form>
  );
}
