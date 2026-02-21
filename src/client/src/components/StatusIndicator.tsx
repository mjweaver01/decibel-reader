interface StatusIndicatorProps {
  connected: boolean;
  isRecording: boolean;
  error?: string | null;
}

export function StatusIndicator({
  connected,
  isRecording,
  error,
}: StatusIndicatorProps) {
  return (
    <div className="flex items-center gap-2">
      <span
        className={`h-2 w-2 shrink-0 rounded-full ${
          isRecording
            ? 'bg-red-500 opacity-100 animate-pulse'
            : error
              ? 'bg-red-500'
              : connected
                ? 'bg-emerald-500'
                : 'bg-zinc-500'
        }`}
        title={connected ? 'Live' : 'Off'}
      />
      <span className="text-sm text-zinc-400">
        {error ? 'Error' : connected ? 'Live' : 'Off'}
      </span>
    </div>
  );
}
