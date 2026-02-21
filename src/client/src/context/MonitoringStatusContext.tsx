import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from 'react';

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

const MonitoringStatusContext = createContext<{
  status: MonitoringStatus;
  setStatus: (s: MonitoringStatus) => void;
  micEnabled: boolean;
  setMicEnabled: (v: boolean) => void;
}>({
  status: defaultStatus,
  setStatus: () => {},
  micEnabled: false,
  setMicEnabled: () => {},
});

export function MonitoringStatusProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<MonitoringStatus>(defaultStatus);
  const [micEnabled, setMicEnabledState] = useState(getStoredMicEnabled);

  const setMicEnabled = useCallback((v: boolean) => {
    setMicEnabledState(v);
    setStoredMicEnabled(v);
  }, []);

  return (
    <MonitoringStatusContext.Provider
      value={{ status, setStatus, micEnabled, setMicEnabled }}
    >
      {children}
    </MonitoringStatusContext.Provider>
  );
}

export function useMonitoringStatus() {
  return useContext(MonitoringStatusContext);
}
