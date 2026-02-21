interface StatusIndicatorProps {
  connected: boolean;
  isRecording: boolean;
}

export function StatusIndicator({ connected, isRecording }: StatusIndicatorProps) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2">
        <span
          className={`h-2 w-2 rounded-full ${
            connected ? "bg-emerald-500" : "bg-red-500 animate-pulse"
          }`}
          title={connected ? "Connected" : "Disconnected"}
        />
        <span className="text-sm text-zinc-400">
          {connected ? "Live" : "Reconnecting..."}
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
