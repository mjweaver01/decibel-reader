import { useCallback, useEffect, useRef, useState } from 'react';
import type { RecordingMetadata } from '@shared/types';
import { API_BASE } from '@shared/constants';

const PAGE_SIZE = 15;

interface RecordingsListProps {
  refreshTrigger?: number;
  /** When provided, use these recordings instead of fetching (e.g. filtered list from Analytics) */
  recordings?: RecordingMetadata[];
  /** When true, show the total count next to the title (e.g. "Recordings (42)") */
  showCount?: boolean;
  /** Compact layout for mobile sidebar */
  compact?: boolean;
}

export function RecordingsList({
  refreshTrigger = 0,
  recordings: recordingsProp,
  showCount = false,
  compact = false,
}: RecordingsListProps) {

  const [localRecordings, setLocalRecordings] = useState<RecordingMetadata[]>(
    []
  );
  const [loading, setLoading] = useState(true);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const recordings =
    recordingsProp !== undefined ? recordingsProp : localRecordings;

  const fetchRecordings = useCallback(async () => {
    fetch(`${API_BASE}/recordings`)
      .then(r => r.json())
      .then((data: RecordingMetadata[]) => {
        const withClassifications = data.filter(
          r => r.classifications.length > 0
        );
        setLocalRecordings(withClassifications);
        setVisibleCount(prev =>
          prev === 0 ? PAGE_SIZE : Math.min(prev, withClassifications.length)
        );
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (recordingsProp !== undefined) {
      setLoading(false);
      return;
    }
    fetchRecordings();
  }, [refreshTrigger, fetchRecordings, recordingsProp]);

  useEffect(() => {
    if (recordingsProp !== undefined) return;
    const interval = setInterval(fetchRecordings, 5000);
    return () => clearInterval(interval);
  }, [fetchRecordings, recordingsProp]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      entries => {
        if (!entries[0]?.isIntersecting) return;
        setVisibleCount(prev => Math.min(prev + PAGE_SIZE, recordings.length));
      },
      { rootMargin: '100px', threshold: 0 }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [recordings.length]);

  const formatDate = (ts: string) => {
    try {
      return new Date(ts).toLocaleString();
    } catch {
      return ts;
    }
  };

  const title =
    showCount && !loading ? `Recordings (${recordings.length})` : 'Recordings';

  if (loading) {
    return (
      <div className={compact ? 'px-2' : 'rounded-lg bg-zinc-900 p-6'}>
        <h2 className={`font-semibold text-zinc-100 ${compact ? 'mb-3 text-sm' : 'mb-4 text-lg'}`}>{title}</h2>
        <p className="text-zinc-500 text-sm">Loading...</p>
      </div>
    );
  }

  const recordingUrl = (r: RecordingMetadata) =>
    `${API_BASE}/recordings/${encodeURIComponent(r.id)}`;

  const handlePlay = (r: RecordingMetadata) => {
    const url = recordingUrl(r);
    if (playingId === r.id) {
      audioRef.current?.pause();
      setPlayingId(null);
      return;
    }
    if (audioRef.current) {
      audioRef.current.pause();
    }
    const audio = new Audio(url);
    audioRef.current = audio;
    audio.onended = () => setPlayingId(null);
    audio.onerror = () => setPlayingId(null);
    audio.play();
    setPlayingId(r.id);
  };

  const visibleRecordings = recordings.slice(0, visibleCount);
  const hasMore = visibleCount < recordings.length;

  return (
    <div className={compact ? 'px-2' : 'rounded-lg bg-zinc-900 p-6 ring-1 ring-zinc-700/50'}>
      <h2 className={`font-semibold text-zinc-100 ${compact ? 'mb-3 text-sm' : 'mb-4 text-lg'}`}>{title}</h2>
      {recordings.length === 0 ? (
        <p className="text-zinc-500 text-sm">
          No recordings yet. When a detected sound exceeds the threshold,
          recordings will appear here.
        </p>
      ) : (
        <div className={`space-y-2 overflow-y-auto ${compact ? 'max-h-none' : 'max-h-[200px]'}`}>
          {visibleRecordings.map(r => (
            <div
              key={r.id}
              className={`flex items-center justify-between rounded-lg border border-zinc-700 bg-zinc-800 px-3 ${
                compact ? 'py-2.5' : 'py-2'
              }`}
              data-title={
                r.classifications.length > 0
                  ? r.classifications
                      .map(c => `${c.label} (${(c.score * 100).toFixed(0)}%)`)
                      .join('\n')
                  : undefined
              }
              data-tooltip-position="bottom-left"
            >
              <div className="min-w-0">
                <p className="truncate text-sm text-zinc-100">
                  {formatDate(r.timestamp)}
                </p>
                <p className="text-xs text-zinc-500">
                  Peak: {r.peakDb.toFixed(1)} dB · {r.durationSeconds}s
                  {r.classifications.length > 0 && (
                    <>
                      {' · '}
                      <span className="text-emerald-400/90">
                        {r.classifications[0].label}
                        {r.classifications.length > 1 &&
                          ` +${r.classifications.length - 1}`}
                      </span>
                    </>
                  )}
                </p>
              </div>
              <div className={`ml-2 flex shrink-0 items-center gap-1.5 ${compact ? 'gap-2' : 'sm:gap-2'}`}>
                <button
                  type="button"
                  onClick={() => handlePlay(r)}
                  className={`rounded-lg px-3 py-2 text-sm font-medium touch-manipulation flex items-center justify-center ${
                    compact ? 'min-h-[44px] min-w-[44px]' : 'sm:min-h-0 sm:min-w-0 sm:px-2 sm:py-1'
                  } ${
                    playingId === r.id
                      ? 'bg-emerald-600 text-white'
                      : 'text-emerald-400 hover:bg-emerald-500/20 active:bg-emerald-500/30'
                  }`}
                >
                  {playingId === r.id ? 'Stop' : 'Play'}
                </button>
                <a
                  href={recordingUrl(r)}
                  download={r.filename}
                  className={`rounded-lg px-3 py-2 text-sm text-zinc-400 hover:bg-zinc-700 active:bg-zinc-600 touch-manipulation flex items-center justify-center ${
                    compact ? 'min-h-[44px]' : 'sm:min-h-0 sm:px-2 sm:py-1'
                  }`}
                >
                  Download
                </a>
              </div>
            </div>
          ))}
          {hasMore && (
            <div
              ref={sentinelRef}
              className="py-2 text-center text-xs text-zinc-500"
            >
              Scroll for more...
            </div>
          )}
        </div>
      )}
    </div>
  );
}
