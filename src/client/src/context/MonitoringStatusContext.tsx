import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import type { AppConfig } from '@shared/types';
import { API_BASE, DEFAULT_CONFIG } from '@shared/constants';
import {
  useAudioCapture,
  type MediaDeviceInfo,
} from '../hooks/useAudioCapture';
import { incrementRecordingsVersion } from '../store/recordingsVersion';

const MIC_ENABLED_KEY = 'decibel-reader:micEnabled';

function getStoredMicEnabled(): boolean {
  if (typeof sessionStorage === 'undefined') return false;
  try {
    return sessionStorage.getItem(MIC_ENABLED_KEY) === '1';
  } catch {
    return false;
  }
}

function setStoredMicEnabled(v: boolean) {
  try {
    if (v) sessionStorage.setItem(MIC_ENABLED_KEY, '1');
    else sessionStorage.removeItem(MIC_ENABLED_KEY);
  } catch {
    // ignore
  }
}

interface MonitoringStatus {
  connected: boolean;
  isRecording: boolean;
  error: string | null;
}

const defaultStatus: MonitoringStatus = {
  connected: false,
  isRecording: false,
  error: null,
};

interface MonitoringContextValue {
  status: MonitoringStatus;
  setStatus: (s: MonitoringStatus) => void;
  micEnabled: boolean;
  setMicEnabled: (v: boolean) => void;
  dB: number;
  isRecording: boolean;
  error: string | null;
  stream: MediaStream | null;
  lastDetection: string | null;
  devices: MediaDeviceInfo[];
  config: AppConfig;
  setConfig: (c: AppConfig) => void;
  handleSaveConfig: (updates: Partial<AppConfig>) => Promise<void>;
}

const MonitoringStatusContext = createContext<MonitoringContextValue | null>(
  null
);

export function MonitoringStatusProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [status, setStatus] = useState<MonitoringStatus>(defaultStatus);
  const [micEnabled, setMicEnabledState] = useState(getStoredMicEnabled);
  const [config, setConfig] = useState<AppConfig>(() => ({
    ...DEFAULT_CONFIG,
  }));

  const setMicEnabled = useCallback((v: boolean) => {
    setMicEnabledState(v);
    setStoredMicEnabled(v);
  }, []);

  const { dB, isRecording, error, stream, lastDetection, devices } =
    useAudioCapture({
      thresholdDb: config.thresholdDb,
      bufferMs: config.recordDurationSeconds * 1000,
      enabled: micEnabled,
      onRecordingUploaded: incrementRecordingsVersion,
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
  }, [micEnabled, isRecording, error, setStatus]);

  useEffect(() => {
    fetch(`${API_BASE}/config`)
      .then(r => r.json())
      .then(setConfig)
      .catch(() => {});
  }, []);

  const restartMonitoring = useCallback(() => {
    setMicEnabledState(false);
    setTimeout(() => setMicEnabledState(true), 100);
  }, []);

  const handleSaveConfig = useCallback(
    async (updates: Partial<AppConfig>) => {
      const res = await fetch(`${API_BASE}/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      const data = await res.json();
      setConfig(data);
      if (updates.deviceId !== undefined && micEnabled) restartMonitoring();
    },
    [micEnabled, restartMonitoring]
  );

  const value: MonitoringContextValue = {
    status,
    setStatus,
    micEnabled,
    setMicEnabled,
    dB,
    isRecording,
    error,
    stream,
    lastDetection,
    devices,
    config,
    setConfig,
    handleSaveConfig,
  };

  return (
    <MonitoringStatusContext.Provider value={value}>
      {children}
    </MonitoringStatusContext.Provider>
  );
}

export function useMonitoringStatus() {
  const ctx = useContext(MonitoringStatusContext);
  if (!ctx) {
    throw new Error(
      'useMonitoringStatus must be used within MonitoringStatusProvider'
    );
  }
  return ctx;
}
