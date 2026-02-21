import { createContext, useContext, useState, type ReactNode } from 'react';

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
}>({
  status: defaultStatus,
  setStatus: () => {},
});

export function MonitoringStatusProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<MonitoringStatus>(defaultStatus);
  return (
    <MonitoringStatusContext.Provider value={{ status, setStatus }}>
      {children}
    </MonitoringStatusContext.Provider>
  );
}

export function useMonitoringStatus() {
  return useContext(MonitoringStatusContext);
}
