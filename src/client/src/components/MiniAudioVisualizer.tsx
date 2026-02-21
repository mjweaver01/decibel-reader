import { useEffect, useRef } from 'react';

interface MiniAudioVisualizerProps {
  stream: MediaStream | null;
  isRecording?: boolean;
  dB?: number;
}

export function MiniAudioVisualizer({
  stream,
  isRecording,
  dB = 0,
}: MiniAudioVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!stream || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const audioCtx = new AudioContext();
    const source = audioCtx.createMediaStreamSource(stream);
    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = 256;
    analyser.smoothingTimeConstant = 0.3;
    analyser.minDecibels = -70;
    analyser.maxDecibels = -10;
    source.connect(analyser);

    const frequencyData = new Uint8Array(analyser.frequencyBinCount);

    let animationId: number;
    let width = 0;
    let height = 0;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      width = rect.width;
      height = rect.height;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);

    const draw = () => {
      if (width === 0 || height === 0) resize();

      analyser.getByteFrequencyData(frequencyData);
      ctx.clearRect(0, 0, width, height);

      const barCount = 24;
      const barGap = 1;
      const barWidth = (width - (barCount - 1) * barGap) / barCount;

      for (let i = 0; i < barCount; i++) {
        const dataIndex = Math.floor((i / barCount) * frequencyData.length);
        const value = frequencyData[dataIndex] / 255;
        const barHeight = Math.max(2, value * height);

        const x = i * (barWidth + barGap);
        const y = height - barHeight;

        ctx.fillStyle =
          isRecording
            ? `rgba(239,68,68,${0.3 + value * 0.6})`
            : `rgba(16,185,129,${0.3 + value * 0.6})`;
        ctx.fillRect(x, y, barWidth, barHeight);
      }

      animationId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationId);
      audioCtx.close();
    };
  }, [stream, isRecording]);

  if (!stream) return null;

  return (
    <div className="flex items-center gap-2 rounded-lg bg-zinc-900/90 px-3 py-1.5 ring-1 ring-zinc-700/50">
      <span className="text-sm font-mono tabular-nums text-emerald-400">
        {dB.toFixed(1)}
        <span className="ml-0.5 text-xs text-zinc-500">dB</span>
      </span>
      <span
        className={`h-1 w-1 shrink-0 rounded-full transition-opacity ${
          isRecording ? 'bg-red-500 opacity-100 animate-pulse' : 'opacity-0'
        }`}
        title={isRecording ? 'Recording' : undefined}
        aria-hidden={!isRecording}
      />
      <div className="overflow-hidden rounded">
        <canvas
          ref={canvasRef}
          className="block"
          style={{ width: 96, height: 24 }}
        />
      </div>
    </div>
  );
}
