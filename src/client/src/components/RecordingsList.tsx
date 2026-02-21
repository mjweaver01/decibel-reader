import { useCallback, useEffect, useRef, useState } from 'react';
import type { RecordingMetadata } from '@shared/types';
import { API_BASE } from '@shared/constants';
import { useIsMobile } from '../hooks/useIsMobile';

const PAGE_SIZE = 15;
const MAX_HEIGHT_MOBILE = '800px';
const MAX_HEIGHT_DESKTOP = '60vh';

interface RecordingsListProps {
  refreshTrigger?: number;
}

export function RecordingsList({ refreshTrigger = 0 }: RecordingsListProps) {
  const isMobile = useIsMobile();

  const [recordings, setRecordings] = useState<RecordingMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const fetchRecordings = useCallback(async () => {
    fetch(`${API_BASE}/recordings`)
      .then(r => r.json())
      .then(data => {
        setRecordings(data);
        setVisibleCount(prev =>
          prev === 0 ? PAGE_SIZE : Math.min(prev, data.length)
        );
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchRecordings();
  }, [refreshTrigger, fetchRecordings]);

  useEffect(() => {
    const interval = setInterval(fetchRecordings, 5000);
    return () => clearInterval(interval);
  }, [fetchRecordings]);

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

  if (loading) {
    return (
      <div className="rounded-lg bg-zinc-900 p-6">
        <h2 className="mb-4 text-lg font-semibold text-zinc-100">Recordings</h2>
        <p className="text-zinc-500">Loading...</p>
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
    <div className="rounded-lg bg-zinc-900 p-6">
      <h2 className="mb-4 text-lg font-semibold text-zinc-100">Recordings</h2>
      {recordings.length === 0 ? (
        <p className="text-zinc-500">
          No recordings yet. When a detected sound exceeds the threshold,
          recordings will appear here.
        </p>
      ) : (
        <div
          className="space-y-2 overflow-y-auto"
          style={{
            maxHeight: isMobile ? MAX_HEIGHT_MOBILE : MAX_HEIGHT_DESKTOP,
          }}
        >
          {visibleRecordings.map(r => (
            <div
              key={r.id}
              className="flex items-center justify-between rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2"
              title={
                r.classifications.length > 0
                  ? r.classifications
                      .map(c => `${c.label} (${(c.score * 100).toFixed(0)}%)`)
                      .join('\n')
                  : undefined
              }
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
              <div className="ml-2 flex shrink-0 items-center gap-2">
                <button
                  type="button"
                  onClick={() => handlePlay(r)}
                  className={`rounded px-2 py-1 text-sm ${
                    playingId === r.id
                      ? 'bg-emerald-600 text-white'
                      : 'text-emerald-400 hover:bg-emerald-500/20'
                  }`}
                >
                  {playingId === r.id ? 'Stop' : 'Play'}
                </button>
                <a
                  href={recordingUrl(r)}
                  download={r.filename}
                  className="rounded px-2 py-1 text-sm text-zinc-400 hover:bg-zinc-700"
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
