import { useEffect, useState } from 'react';
import type { AppConfig } from '@shared/types';
import { getYamnetLabels } from '../lib/yamnetLabels';
import type { MediaDeviceInfo } from '../hooks/useAudioCapture';
import { SoundTypeMultiselect } from './SoundTypeMultiselect';

interface ConfigurationProps {
  config: AppConfig;
  onSave: (config: Partial<AppConfig>) => Promise<void>;
  devices: MediaDeviceInfo[];
}

export function Configuration({ config, onSave, devices }: ConfigurationProps) {
  const [thresholdDb, setThresholdDb] = useState(config.thresholdDb);
  const [thresholdInput, setThresholdInput] = useState(
    String(Math.max(-60, Math.min(0, config.thresholdDb)))
  );
  const [bufferBelowThresholdSeconds, setBufferBelowThresholdSeconds] =
    useState(config.bufferBelowThresholdSeconds ?? 1);
  const [preBufferSeconds, setPreBufferSeconds] = useState(
    config.preBufferSeconds
  );
  const [soundTypes, setSoundTypes] = useState<string[]>(config.soundTypes);
  const [notificationsEnabled, setNotificationsEnabled] = useState(
    config.notificationsEnabled
  );
  const [notificationSounds, setNotificationSounds] = useState<string[]>(
    config.notificationSounds
  );
  const [notificationError, setNotificationError] = useState<string | null>(
    null
  );
  const [classificationMinScore, setClassificationMinScore] = useState(
    config.classificationMinScore
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
    setBufferBelowThresholdSeconds(config.bufferBelowThresholdSeconds ?? 1);
    setPreBufferSeconds(config.preBufferSeconds);
    setSoundTypes(config.soundTypes);
    setClassificationMinScore(config.classificationMinScore);
    setDeviceId(config.deviceId ?? '');
    setNotificationsEnabled(config.notificationsEnabled);
    setNotificationSounds(config.notificationSounds);
    setNotificationError(null);
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
        bufferBelowThresholdSeconds,
        preBufferSeconds,
        soundTypes,
        classificationMinScore,
        deviceId: deviceId || undefined,
        notificationsEnabled,
        notificationSounds,
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

  const toggleNotificationSound = (name: string) => {
    setNotificationSounds(prev =>
      prev.includes(name) ? prev.filter(s => s !== name) : [...prev, name]
    );
  };

  const removeNotificationSound = (name: string) => {
    setNotificationSounds(prev => prev.filter(s => s !== name));
  };

  const handleNotificationsToggle = async (enabled: boolean) => {
    setNotificationError(null);
    if (enabled && typeof Notification !== 'undefined') {
      if (Notification.permission === 'denied') {
        setNotificationError(
          'Notifications were previously blocked. Enable them in your browser settings.'
        );
        return;
      }
      if (Notification.permission === 'default') {
        const perm = await Notification.requestPermission();
        if (perm !== 'granted') {
          setNotificationError(
            perm === 'denied'
              ? 'Notifications blocked. Enable them in browser settings to use this feature.'
              : 'Could not request notification permission.'
          );
          return;
        }
      }
    }
    if (enabled && typeof Notification === 'undefined') {
      setNotificationError('Notifications are not supported in this browser.');
      return;
    }
    setNotificationsEnabled(enabled);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-lg bg-zinc-900 p-6 ring-1 ring-zinc-700/50"
    >
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
            Buffer below threshold (seconds)
          </label>
          <select
            id="duration"
            value={bufferBelowThresholdSeconds}
            onChange={e =>
              setBufferBelowThresholdSeconds(Number(e.target.value))
            }
            className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-zinc-100 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          >
            <option value={0.1}>0.1 seconds</option>
            <option value={0.25}>0.25 seconds</option>
            <option value={0.5}>0.5 seconds</option>
            <option value={0.75}>0.75 seconds</option>
            <option value={1}>1 second</option>
            <option value={1.5}>1.5 seconds</option>
            <option value={2}>2 seconds</option>
            <option value={3}>3 seconds</option>
            <option value={5}>5 seconds</option>
            <option value={10}>10 seconds</option>
            <option value={15}>15 seconds</option>
            <option value={30}>30 seconds</option>
          </select>
          <p className="mt-1 text-xs text-zinc-500">
            Recording stops after sound stays below threshold for this long
          </p>
        </div>
        <div>
          <label
            htmlFor="preBuffer"
            className="mb-1 block text-sm text-zinc-400"
          >
            Pre-buffer before trigger (seconds)
          </label>
          <select
            id="preBuffer"
            value={preBufferSeconds}
            onChange={e => setPreBufferSeconds(Number(e.target.value))}
            className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-zinc-100 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          >
            <option value={0}>None</option>
            <option value={0.5}>0.5 seconds</option>
            <option value={1}>1 second</option>
            <option value={2}>2 seconds</option>
            <option value={3}>3 seconds</option>
            <option value={5}>5 seconds</option>
          </select>
          <p className="mt-1 text-xs text-zinc-500">
            Capture audio from before the decibel trigger so you can hear what
            led up to the sound
          </p>
        </div>
        <div className="space-y-3 rounded-lg border border-zinc-700 bg-zinc-800/50 p-2">
          <button
            type="button"
            onClick={() => handleNotificationsToggle(!notificationsEnabled)}
            className="flex w-full cursor-pointer items-center justify-between rounded-md py-1 px-2 text-left transition-colors hover:bg-zinc-700/50"
          >
            <span className="text-sm font-medium text-zinc-100">
              Push notifications
            </span>
            <span
              className={`flex h-5 w-9 shrink-0 items-center rounded-full px-0.5 transition-colors ${
                notificationsEnabled ? 'bg-emerald-600' : 'bg-zinc-600'
              }`}
            >
              <span
                className={`h-4 w-4 rounded-full bg-white transition-transform ${
                  notificationsEnabled ? 'translate-x-4' : 'translate-x-0'
                }`}
              />
            </span>
          </button>
          {notificationError && (
            <p className="text-xs text-amber-400">{notificationError}</p>
          )}
          {notificationsEnabled && (
            <>
              <p className="text-xs text-zinc-500">
                Get a browser notification when these sounds are detected
              </p>
              <SoundTypeMultiselect
                options={soundTypeOptions}
                selected={notificationSounds}
                onToggle={toggleNotificationSound}
                onRemove={removeNotificationSound}
                placeholder="Search sounds to notify on..."
              />
            </>
          )}
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
