import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useMonitoringStatus } from '../context/MonitoringStatusContext';
import { ANALYTICS_FILTERS_SESSION_KEY } from '../hooks/useAnalyticsFilters';
import { MiniAudioVisualizer } from './MiniAudioVisualizer';
import { StatusIndicator } from './StatusIndicator';
import { MobileSlideOut } from './MobileSlideOut';
import { ConfigModal } from './ConfigModal';
import { useIsMobile } from '../hooks/useIsMobile';

export function Header() {
  const { status, stream, dB, isRecording, config, handleSaveConfig, devices } =
    useMonitoringStatus();
  const location = useLocation();
  const isAnalyticsPage = location.pathname === '/analytics';
  const isMobile = useIsMobile();

  const [menuOpen, setMenuOpen] = useState(false);
  const [configOpen, setConfigOpen] = useState(false);

  return (
    <>
      <header className="mb-6 flex items-center justify-between gap-3 md:mb-8">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          {isMobile ? (
            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              className="-m-2 flex shrink-0 items-center justify-center rounded-lg p-2 text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-100 active:bg-zinc-700 touch-manipulation"
              aria-label="Open menu"
            >
              <svg
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            </button>
          ) : null}
          <h1 className="truncate text-xl font-bold text-zinc-100 md:text-2xl">
            Decibel Reader
          </h1>
        </div>

        <div className="flex shrink-0 items-center gap-2 md:gap-4">
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
          {!isMobile && (
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
                to={
                  isAnalyticsPage
                    ? `/analytics${location.search}`
                    : `/analytics${(() => {
                        try {
                          const s = sessionStorage.getItem(
                            ANALYTICS_FILTERS_SESSION_KEY
                          );
                          return s ? `?${s}` : '';
                        } catch {
                          return '';
                        }
                      })()}`
                }
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
              <NavLink
                to="/mix"
                className={({ isActive }) =>
                  `rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-emerald-600 text-white'
                      : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
                  }`
                }
              >
                Mix
              </NavLink>
            </nav>
          )}
          <button
            type="button"
            onClick={() => setConfigOpen(true)}
            className="-m-2 flex shrink-0 items-center justify-center rounded-lg p-2 text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-100 active:bg-zinc-700 touch-manipulation"
            aria-label="Open settings"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
          </button>
        </div>
      </header>

      <MobileSlideOut isOpen={menuOpen} onClose={() => setMenuOpen(false)} />
      <ConfigModal
        isOpen={configOpen}
        onClose={() => setConfigOpen(false)}
        config={config}
        onSave={handleSaveConfig}
        devices={devices}
      />
    </>
  );
}
