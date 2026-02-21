import { useEffect, useRef } from "react";

interface AudioVisualizerProps {
  stream: MediaStream | null;
  isRecording?: boolean;
  dB?: number;
  threshold?: number;
}

export function AudioVisualizer({ stream, isRecording, dB = 0, threshold = -20 }: AudioVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    if (!stream || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const audioCtx = new AudioContext();
    const source = audioCtx.createMediaStreamSource(stream);
    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = 2048;
    analyser.smoothingTimeConstant = 0.7;
    analyser.minDecibels = -70;
    analyser.maxDecibels = -10;
    source.connect(analyser);

    analyserRef.current = analyser;
    ctxRef.current = audioCtx;

    const waveformData = new Uint8Array(analyser.fftSize);
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
    window.addEventListener("resize", resize);

    const draw = () => {
      if (width === 0 || height === 0) {
        resize();
      }

      analyser.getByteTimeDomainData(waveformData);
      analyser.getByteFrequencyData(frequencyData);

      ctx.clearRect(0, 0, width, height);

      // Subtle grid
      ctx.strokeStyle = "rgba(255,255,255,0.03)";
      ctx.lineWidth = 1;
      for (let i = 1; i < 4; i++) {
        ctx.beginPath();
        ctx.moveTo(0, (height * i) / 4);
        ctx.lineTo(width, (height * i) / 4);
        ctx.stroke();
      }
      for (let i = 1; i < 8; i++) {
        ctx.beginPath();
        ctx.moveTo((width * i) / 8, 0);
        ctx.lineTo((width * i) / 8, height);
        ctx.stroke();
      }

      const waveHeight = height * 0.45;
      const waveY = height * 0.35;
      const barAreaTop = height * 0.75;
      const barAreaHeight = height * 0.22;

      // Threshold indicator line (dB -60 to 0 maps to bottom to top)
      const thresholdNorm = Math.max(0, Math.min(1, (threshold + 60) / 60));
      const thresholdY = waveY - waveHeight + thresholdNorm * waveHeight * 2;
      ctx.strokeStyle = "rgba(251,191,36,0.4)";
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(0, thresholdY);
      ctx.lineTo(width, thresholdY);
      ctx.stroke();
      ctx.setLineDash([]);

      // Waveform - oscilloscope style
      ctx.beginPath();
      ctx.lineWidth = 2;
      ctx.lineJoin = "round";
      ctx.lineCap = "round";

      const gradient = ctx.createLinearGradient(0, 0, width, 0);
      gradient.addColorStop(0, isRecording ? "#ef4444" : "#10b981");
      gradient.addColorStop(0.5, isRecording ? "#f97316" : "#14b8a6");
      gradient.addColorStop(1, isRecording ? "#ef4444" : "#10b981");
      ctx.strokeStyle = gradient;

      ctx.shadowColor = isRecording ? "rgba(239,68,68,0.6)" : "rgba(16,185,129,0.5)";
      ctx.shadowBlur = 12;

      for (let i = 0; i < waveformData.length; i++) {
        const x = (i / waveformData.length) * width;
        const v = (waveformData[i] - 128) / 128;
        const y = waveY + v * waveHeight;

        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Mirror waveform (reflection)
      ctx.globalAlpha = 0.25;
      ctx.beginPath();
      for (let i = 0; i < waveformData.length; i++) {
        const x = (i / waveformData.length) * width;
        const v = (waveformData[i] - 128) / 128;
        const y = waveY + waveHeight + 40 + v * (waveHeight * 0.5);

        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.globalAlpha = 1;

      // Frequency bars
      const barCount = 48;
      const barGap = 2;
      const barWidth = (width - (barCount - 1) * barGap) / barCount;

      for (let i = 0; i < barCount; i++) {
        const dataIndex = Math.floor((i / barCount) * frequencyData.length);
        const value = frequencyData[dataIndex] / 255;
        const barHeight = Math.max(2, value * barAreaHeight);

        const x = i * (barWidth + barGap);
        const y = barAreaTop + barAreaHeight - barHeight;

        const barGrad = ctx.createLinearGradient(x, y + barHeight, x, y);
        barGrad.addColorStop(0, "rgba(16,185,129,0.2)");
        barGrad.addColorStop(0.5, "rgba(20,184,166,0.6)");
        barGrad.addColorStop(1, isRecording ? "rgba(239,68,68,0.9)" : "rgba(16,185,129,0.9)");
        ctx.fillStyle = barGrad;
        ctx.fillRect(x, y, barWidth, barHeight);
      }

      animationId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(animationId);
      audioCtx.close();
      analyserRef.current = null;
      ctxRef.current = null;
    };
  }, [stream, isRecording, threshold]);

  if (!stream) return null;

  return (
    <div className="relative overflow-hidden rounded-xl bg-zinc-900/90 p-6 ring-1 ring-zinc-700/50 shadow-xl">
      {/* Header row */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-mono font-semibold tabular-nums text-emerald-400">
            {dB.toFixed(1)}
          </span>
          <span className="text-sm text-zinc-500">dB</span>
        </div>
        <span
          className={`h-1.5 w-1.5 shrink-0 rounded-full transition-opacity ${
            isRecording ? "bg-red-500 opacity-100 animate-pulse" : "bg-transparent opacity-0"
          }`}
          title={isRecording ? "Recording" : undefined}
          aria-hidden={!isRecording}
        />
      </div>

      {/* Canvas */}
      <div className="overflow-hidden rounded-lg bg-zinc-950/50">
        <canvas
          ref={canvasRef}
          className="block h-44 w-full"
          style={{ minHeight: "176px" }}
        />
      </div>
    </div>
  );
}
