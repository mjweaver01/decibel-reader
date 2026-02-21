import { NavLink, useLocation } from 'react-router-dom';
import { useMonitoringStatus } from '../context/MonitoringStatusContext';
import { MiniAudioVisualizer } from './MiniAudioVisualizer';
import { StatusIndicator } from './StatusIndicator';

export function Header() {
  const { status, stream, dB, isRecording } = useMonitoringStatus();
  const location = useLocation();
  const isAnalyticsPage = location.pathname === '/analytics';

  return (
    <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
      <div className="flex items-center gap-4">
        <h1 className="text-2xl font-bold text-zinc-100">Decibel Reader</h1>
      </div>
      <div className="flex items-center gap-4">
        <StatusIndicator
          connected={status.connected}
          isRecording={status.isRecording}
          error={status.error}
        />
        {isAnalyticsPage && stream && (
          <MiniAudioVisualizer
            stream={stream}
            isRecording={isRecording}
            dB={dB}
          />
        )}
        <nav className="flex gap-1 rounded-lg bg-zinc-900 p-1">
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              `rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-emerald-600 text-white'
                  : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
              }`
            }
          >
            Monitor
          </NavLink>
          <NavLink
            to="/analytics"
            className={({ isActive }) =>
              `rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-emerald-600 text-white'
                  : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
              }`
            }
          >
            Analytics
          </NavLink>
        </nav>
      </div>
    </header>
  );
}
