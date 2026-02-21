interface StatusIndicatorProps {
  connected: boolean;
  isRecording: boolean;
  error?: string | null;
}

export function StatusIndicator({ connected, isRecording, error }: StatusIndicatorProps) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2">
        <span
          className={`h-2 w-2 rounded-full ${
            error ? "bg-red-500" : connected ? "bg-emerald-500" : "bg-zinc-500"
          }`}
          title={connected ? "Live" : "Off"}
        />
        <span className="text-sm text-zinc-400">
          {error ? "Error" : connected ? "Live" : "Off"}
        </span>
      </div>
      {isRecording && (
        <div className="flex items-center gap-2 rounded-full bg-red-500/20 px-2 py-2">
          <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
          <span className="text-sm font-medium text-red-400">Recording</span>
        </div>
      )}
    </div>
  );
}
