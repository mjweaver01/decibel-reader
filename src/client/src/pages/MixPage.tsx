import { useCallback, useEffect, useState } from 'react';
import type { RecordingMetadata } from '@shared/types';
import { API_BASE } from '@shared/constants';
import { playSequence, stop } from '../lib/sequencePlayback';
import { DualRangeSlider } from '../components/DualRangeSlider';
import { useInfiniteScroll } from '../hooks/useInfiniteScroll';

interface SequenceItem {
  id: string;
  metadata: RecordingMetadata;
  startTime: number;
  endTime: number;
}

export function MixPage() {
  const [recordings, setRecordings] = useState<RecordingMetadata[]>([]);
  const [sequence, setSequence] = useState<SequenceItem[]>([]);
  const [gapSeconds, setGapSeconds] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [previewingId, setPreviewingId] = useState<string | null>(null);
  const previewAudioRef = useState(() => new Audio())[0];

  const { visibleCount, sentinelRef, hasMore } = useInfiniteScroll({
    totalCount: recordings.length,
  });

  const fetchRecordings = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}/recordings`);
      const data: RecordingMetadata[] = await response.json();
      const withClassifications = data.filter(
        r => r.classifications.length > 0
      );
      setRecordings(withClassifications);
    } catch (err) {
      setError('Failed to load recordings');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRecordings();
  }, [fetchRecordings]);

  useEffect(() => {
    return () => {
      previewAudioRef.pause();
      previewAudioRef.src = '';
    };
  }, [previewAudioRef]);

  const handleAddToSequence = (recording: RecordingMetadata) => {
    const newItem: SequenceItem = {
      id: `${recording.id}-${Date.now()}`,
      metadata: recording,
      startTime: 0,
      endTime: recording.durationSeconds,
    };
    setSequence(prev => [...prev, newItem]);
  };

  const handleRemoveFromSequence = (id: string) => {
    setSequence(prev => prev.filter(item => item.id !== id));
  };

  const handleUpdateClipTime = (
    id: string,
    field: 'startTime' | 'endTime',
    value: number
  ) => {
    setSequence(prev =>
      prev.map(item => {
        if (item.id !== id) return item;
        const newValue = Math.max(
          0,
          Math.min(value, item.metadata.durationSeconds)
        );
        if (field === 'startTime') {
          return { ...item, startTime: Math.min(newValue, item.endTime - 0.1) };
        } else {
          return { ...item, endTime: Math.max(newValue, item.startTime + 0.1) };
        }
      })
    );
  };

  const handleResetClip = (id: string) => {
    setSequence(prev =>
      prev.map(item => {
        if (item.id !== id) return item;
        return {
          ...item,
          startTime: 0,
          endTime: item.metadata.durationSeconds,
        };
      })
    );
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    setSequence(prev => {
      const newSequence = [...prev];
      [newSequence[index - 1], newSequence[index]] = [
        newSequence[index],
        newSequence[index - 1],
      ];
      return newSequence;
    });
  };

  const handleMoveDown = (index: number) => {
    if (index === sequence.length - 1) return;
    setSequence(prev => {
      const newSequence = [...prev];
      [newSequence[index], newSequence[index + 1]] = [
        newSequence[index + 1],
        newSequence[index],
      ];
      return newSequence;
    });
  };

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    setSequence(prev => {
      const newSequence = [...prev];
      const draggedItem = newSequence[draggedIndex];
      newSequence.splice(draggedIndex, 1);
      newSequence.splice(index, 0, draggedItem);
      setDraggedIndex(index);
      return newSequence;
    });
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  const handlePlay = async () => {
    if (sequence.length === 0) return;

    previewAudioRef.pause();
    setPreviewingId(null);
    setIsPlaying(true);
    setError(null);

    await playSequence({
      clips: sequence.map(item => ({
        recordingId: item.metadata.id,
        startTime: item.startTime,
        endTime: item.endTime,
      })),
      gapSeconds,
      onEnded: () => setIsPlaying(false),
      onError: err => {
        setIsPlaying(false);
        setError(`Playback error: ${err.message}`);
      },
    });
  };

  const handleStop = () => {
    stop();
    setIsPlaying(false);
  };

  const handlePreview = (recording: RecordingMetadata) => {
    if (previewingId === recording.id) {
      previewAudioRef.pause();
      previewAudioRef.currentTime = 0;
      setPreviewingId(null);
      return;
    }

    previewAudioRef.pause();
    previewAudioRef.src = `${API_BASE}/recordings/${recording.id}`;
    previewAudioRef.onended = () => setPreviewingId(null);
    previewAudioRef.onerror = () => {
      setPreviewingId(null);
      setError('Failed to preview recording');
    };
    previewAudioRef.play();
    setPreviewingId(recording.id);
  };

  const formatDate = (ts: string) => {
    const d = new Date(ts);
    return d.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds.toFixed(1)}s`;
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const totalDuration =
    sequence.reduce((sum, item) => sum + (item.endTime - item.startTime), 0) +
    (sequence.length > 1 ? gapSeconds * (sequence.length - 1) : 0);

  const visibleRecordings = recordings.slice(0, visibleCount);

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-zinc-400">Loading recordings...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-zinc-100">Mix</h2>
        <p className="mt-1 text-sm text-zinc-400">
          Select recordings and arrange them to create a sequence
        </p>
      </div>

      {error && (
        <div className="rounded-lg bg-red-900/20 border border-red-500/30 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Picker Section */}
        <div className="space-y-3">
          <h3 className="text-lg font-semibold text-zinc-200">
            Available Recordings ({recordings.length})
          </h3>
          <div className="rounded-lg bg-zinc-900 border border-zinc-800 min-h-[350px] max-h-[calc(100vh-350px)] overflow-y-auto">
            {recordings.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-zinc-500">
                No recordings available
              </div>
            ) : (
              <div className="divide-y divide-zinc-800">
                {visibleRecordings.map(recording => (
                  <div
                    key={recording.id}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-zinc-800/50 transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-zinc-200 truncate">
                          {recording.classifications[0]?.label || 'Unknown'}
                        </span>
                        <span className="text-xs text-zinc-500">
                          {formatDuration(recording.durationSeconds)}
                        </span>
                      </div>
                      <div className="text-xs text-zinc-500">
                        {formatDate(recording.timestamp)}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handlePreview(recording)}
                      className={`shrink-0 rounded-md px-2 py-1.5 text-xs font-medium transition-colors ${
                        previewingId === recording.id
                          ? 'bg-zinc-700 text-emerald-400'
                          : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700 hover:text-zinc-100'
                      }`}
                      aria-label={
                        previewingId === recording.id
                          ? 'Stop preview'
                          : 'Preview'
                      }
                    >
                      {previewingId === recording.id ? (
                        <svg
                          className="h-4 w-4"
                          fill="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path d="M6 6h12v12H6z" />
                        </svg>
                      ) : (
                        <svg
                          className="h-4 w-4"
                          fill="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path d="M8 5v14l11-7z" />
                        </svg>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAddToSequence(recording)}
                      className="shrink-0 rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-500 active:bg-emerald-700 transition-colors"
                    >
                      Add
                    </button>
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
        </div>

        {/* Sequence Section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-zinc-200">
              Sequence ({sequence.length})
            </h3>
            {sequence.length > 0 && (
              <div className="text-sm text-zinc-400">
                Total: {formatDuration(totalDuration)}
              </div>
            )}
          </div>

          <div className="space-y-3">
            {/* Gap Control */}
            <div className="rounded-lg bg-zinc-900 border border-zinc-800 px-4 py-3">
              <label className="flex items-center gap-3">
                <span className="text-sm text-zinc-300">
                  Gap between clips:
                </span>
                <input
                  type="number"
                  min="0"
                  max="10"
                  step="0.1"
                  value={gapSeconds}
                  onChange={e => setGapSeconds(parseFloat(e.target.value) || 0)}
                  className="w-20 rounded-md bg-zinc-800 border border-zinc-700 px-2 py-1 text-sm text-zinc-100 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
                <span className="text-sm text-zinc-500">seconds</span>
              </label>
            </div>

            {/* Sequence List */}
            <div className="rounded-lg bg-zinc-900 border border-zinc-800">
              {sequence.length === 0 ? (
                <div className="px-4 py-8 text-center text-sm text-zinc-500">
                  Add recordings to create a sequence
                </div>
              ) : (
                <div className="divide-y divide-zinc-800">
                  {sequence.map((item, index) => (
                    <div
                      key={item.id}
                      className={`transition-colors ${
                        draggedIndex === index ? 'opacity-50' : ''
                      }`}
                    >
                      <div
                        draggable
                        onDragStart={() => handleDragStart(index)}
                        onDragOver={e => handleDragOver(e, index)}
                        onDragEnd={handleDragEnd}
                        className="flex items-center gap-2 px-3 py-2 cursor-move hover:bg-zinc-800/50"
                      >
                        <div className="flex shrink-0 items-center text-zinc-500">
                          <svg
                            className="h-4 w-4"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M4 8h16M4 16h16"
                            />
                          </svg>
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium text-zinc-400">
                              #{index + 1}
                            </span>
                            <span className="text-sm text-zinc-200 truncate">
                              {item.metadata.classifications[0]?.label ||
                                'Unknown'}
                            </span>
                            <span className="text-xs text-zinc-500">
                              {formatDuration(item.endTime - item.startTime)}
                            </span>
                          </div>
                        </div>
                        <div className="flex shrink-0 gap-1">
                          <button
                            type="button"
                            onClick={() => handleMoveUp(index)}
                            disabled={index === 0}
                            className="rounded p-1 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                            aria-label="Move up"
                          >
                            <svg
                              className="h-4 w-4"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M5 15l7-7 7 7"
                              />
                            </svg>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleMoveDown(index)}
                            disabled={index === sequence.length - 1}
                            className="rounded p-1 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                            aria-label="Move down"
                          >
                            <svg
                              className="h-4 w-4"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M19 9l-7 7-7-7"
                              />
                            </svg>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveFromSequence(item.id)}
                            className="rounded p-1 text-red-400 hover:bg-red-900/30 hover:text-red-300 transition-colors"
                            aria-label="Remove"
                          >
                            <svg
                              className="h-4 w-4"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M6 18L18 6M6 6l12 12"
                              />
                            </svg>
                          </button>
                        </div>
                      </div>
                      <div className="px-3 pb-3 pt-2 space-y-3 bg-zinc-900/50">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 text-xs text-zinc-400">
                            <svg
                              className="h-3.5 w-3.5"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
                              />
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                              />
                            </svg>
                            <span>
                              Clip:{' '}
                              {formatDuration(item.endTime - item.startTime)}
                            </span>
                            <span className="text-zinc-600">•</span>
                            <span className="text-zinc-500">
                              Full:{' '}
                              {formatDuration(item.metadata.durationSeconds)}
                            </span>
                          </div>
                          {(item.startTime !== 0 ||
                            item.endTime !== item.metadata.durationSeconds) && (
                            <button
                              type="button"
                              onClick={() => handleResetClip(item.id)}
                              className="text-xs text-zinc-500 hover:text-emerald-400 transition-colors"
                              title="Reset to full duration"
                            >
                              Reset
                            </button>
                          )}
                        </div>

                        {/* Dual Range Slider */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-medium text-zinc-400">
                              Trim Clip
                            </span>
                            <div className="flex items-center gap-2 font-mono text-emerald-400">
                              <span>{item.startTime.toFixed(2)}s</span>
                              <span className="text-zinc-600">→</span>
                              <span>{item.endTime.toFixed(2)}s</span>
                            </div>
                          </div>
                          <DualRangeSlider
                            min={0}
                            max={item.metadata.durationSeconds}
                            startValue={item.startTime}
                            endValue={item.endTime}
                            onStartChange={value =>
                              handleUpdateClipTime(item.id, 'startTime', value)
                            }
                            onEndChange={value =>
                              handleUpdateClipTime(item.id, 'endTime', value)
                            }
                            step={0.01}
                          />
                          <div className="flex items-center justify-between text-[10px] text-zinc-500 font-mono">
                            <span>0.00s</span>
                            <span>
                              {item.metadata.durationSeconds.toFixed(2)}s
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Playback Controls */}
            {sequence.length > 0 && (
              <div className="flex gap-2">
                {!isPlaying ? (
                  <button
                    type="button"
                    onClick={handlePlay}
                    className="flex-1 rounded-lg bg-emerald-600 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-500 active:bg-emerald-700 transition-colors"
                  >
                    <div className="flex items-center justify-center gap-2">
                      <svg
                        className="h-5 w-5"
                        fill="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path d="M8 5v14l11-7z" />
                      </svg>
                      Play Sequence
                    </div>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleStop}
                    className="flex-1 rounded-lg bg-red-600 px-4 py-3 text-sm font-semibold text-white hover:bg-red-500 active:bg-red-700 transition-colors"
                  >
                    <div className="flex items-center justify-center gap-2">
                      <svg
                        className="h-5 w-5"
                        fill="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path d="M6 6h12v12H6z" />
                      </svg>
                      Stop
                    </div>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
