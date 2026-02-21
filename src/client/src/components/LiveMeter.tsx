import { MIN_DB, MAX_DB } from '@shared/constants';
interface LiveMeterProps {
  dB: number;
  threshold: number;
}

export function LiveMeter({ dB, threshold }: LiveMeterProps) {
  const percent = Math.max(
    0,
    Math.min(100, ((dB - MIN_DB) / (MAX_DB - MIN_DB)) * 100)
  );
  const thresholdPercent = Math.max(
    0,
    Math.min(100, ((threshold - MIN_DB) / (MAX_DB - MIN_DB)) * 100)
  );

  return (
    <div className="rounded-lg bg-zinc-900 p-6">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-medium text-zinc-400">Live Level</span>
        <span className="text-2xl font-mono font-bold text-emerald-400">
          {dB.toFixed(1)} dB
        </span>
      </div>
      <div className="relative h-2 overflow-hidden rounded-full bg-zinc-800">
        <div
          className="absolute left-0 top-0 h-full rounded-full bg-emerald-500 transition-all duration-150"
          style={{ width: `${percent}%` }}
        />
        <div
          className="absolute top-0 h-full w-0.5 bg-amber-500"
          style={{ left: `${thresholdPercent}%` }}
          title={`Threshold: ${threshold} dB`}
        />
      </div>
      <div className="mt-1 flex justify-between text-xs text-zinc-500">
        <span>{MIN_DB} dB</span>
        <span>{MAX_DB} dB</span>
      </div>
    </div>
  );
}
