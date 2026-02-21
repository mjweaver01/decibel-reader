import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { DEFAULT_CONFIG, type AppConfig } from '../../../shared/types';
import { API_BASE } from '../constants';
import { useAudioCapture, type MediaDeviceInfo } from '../hooks/useAudioCapture';

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

/** High-frequency: dB, stream, etc. Updates ~60fps when monitoring. */
interface CaptureContextValue {
  dB: number;
  isRecording: boolean;
  error: string | null;
  stream: MediaStream | null;
  lastDetection: string | null;
  devices: MediaDeviceInfo[];
}

/** Low-frequency: config, recordingsVersion, etc. */
interface ConfigContextValue {
  status: MonitoringStatus;
  setStatus: (s: MonitoringStatus) => void;
  micEnabled: boolean;
  setMicEnabled: (v: boolean) => void;
  config: AppConfig;
  setConfig: (c: AppConfig) => void;
  handleSaveConfig: (updates: Partial<AppConfig>) => Promise<void>;
  recordingsVersion: number;
}

const CaptureContext = createContext<CaptureContextValue | null>(null);
const ConfigContext = createContext<ConfigContextValue | null>(null);

export function MonitoringStatusProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<MonitoringStatus>(defaultStatus);
  const [micEnabled, setMicEnabledState] = useState(getStoredMicEnabled);
  const [config, setConfig] = useState<AppConfig>(() => ({ ...DEFAULT_CONFIG }));
  const [recordingsVersion, setRecordingsVersion] = useState(0);

  const setMicEnabled = useCallback((v: boolean) => {
    setMicEnabledState(v);
    setStoredMicEnabled(v);
  }, []);

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

  const captureValue: CaptureContextValue = useMemo(
    () => ({ dB, isRecording, error, stream, lastDetection, devices }),
    [dB, isRecording, error, stream, lastDetection, devices]
  );

  const configValue: ConfigContextValue = useMemo(
    () => ({
      status,
      setStatus,
      micEnabled,
      setMicEnabled,
      config,
      setConfig,
      handleSaveConfig,
      recordingsVersion,
    }),
    [
      status,
      micEnabled,
      config,
      recordingsVersion,
      setStatus,
      setMicEnabled,
      handleSaveConfig,
    ]
  );

  return (
    <CaptureContext.Provider value={captureValue}>
      <ConfigContext.Provider value={configValue}>
        {children}
      </ConfigContext.Provider>
    </CaptureContext.Provider>
  );
}

export function useMonitoringStatus() {
  const capture = useContext(CaptureContext);
  const config = useContext(ConfigContext);
  if (!capture || !config) {
    throw new Error(
      'useMonitoringStatus must be used within MonitoringStatusProvider'
    );
  }
  return { ...capture, ...config };
}

export function useConfig() {
  const ctx = useContext(ConfigContext);
  if (!ctx) {
    throw new Error(
      'useConfig must be used within MonitoringStatusProvider'
    );
  }
  return ctx;
}
