import { NavLink, useLocation } from 'react-router-dom';
import { useRecordingsVersion } from '../lib/recordingsVersion';
import { RecordingsList } from './RecordingsList';
import { ANALYTICS_FILTERS_SESSION_KEY } from '../hooks/useAnalyticsFilters';

interface MobileSlideOutProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MobileSlideOut({ isOpen, onClose }: MobileSlideOutProps) {
  const location = useLocation();
  const recordingsVersion = useRecordingsVersion();
  const isAnalyticsPage = location.pathname === '/analytics';

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-40 bg-zinc-950/60 backdrop-blur-sm transition-opacity duration-200 md:hidden ${
          isOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Slide-out panel */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-[min(320px,85vw)] flex flex-col bg-zinc-900 shadow-2xl ring-1 ring-zinc-700/50 transition-transform duration-300 ease-out md:hidden pt-[env(safe-area-inset-top)] ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        aria-label="Menu"
      >
        <div className="flex shrink-0 items-center justify-between border-b border-zinc-700/50 px-4 py-3">
          <h2 className="text-lg font-semibold text-zinc-100">Menu</h2>
          <button
            type="button"
            onClick={onClose}
            className="-m-2 rounded-full p-2 text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-100 active:bg-zinc-700 touch-manipulation"
            aria-label="Close menu"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <nav className="shrink-0 border-b border-zinc-700/50 px-2 py-3">
          <div className="flex flex-col gap-0.5">
            <NavLink
              to="/"
              end
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-4 py-3 text-base font-medium transition-colors touch-manipulation ${
                  isActive
                    ? 'bg-emerald-600/20 text-emerald-400'
                    : 'text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100 active:bg-zinc-700'
                }`
              }
            >
              <svg className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              Monitor
            </NavLink>
            <NavLink
              to={
                isAnalyticsPage
                  ? `/analytics${location.search}`
                  : `/analytics${(() => {
                      try {
                        const s = sessionStorage.getItem(ANALYTICS_FILTERS_SESSION_KEY);
                        return s ? `?${s}` : '';
                      } catch {
                        return '';
                      }
                    })()}`
              }
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-4 py-3 text-base font-medium transition-colors touch-manipulation ${
                  isActive
                    ? 'bg-emerald-600/20 text-emerald-400'
                    : 'text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100 active:bg-zinc-700'
                }`
              }
            >
              <svg className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              Analytics
            </NavLink>
          </div>
        </nav>

        <div className="min-h-0 flex-1 overflow-hidden">
          <div className="h-full overflow-y-auto overscroll-contain px-2 py-4 pb-[env(safe-area-inset-bottom)]">
            <RecordingsList
              refreshTrigger={recordingsVersion}
              compact
            />
          </div>
        </div>
      </aside>
    </>
  );
}
