import { useCallback, useEffect, useRef, useState } from 'react';

interface DualRangeSliderProps {
  min: number;
  max: number;
  startValue: number;
  endValue: number;
  onStartChange: (value: number) => void;
  onEndChange: (value: number) => void;
  step?: number;
}

export function DualRangeSlider({
  min,
  max,
  startValue,
  endValue,
  onStartChange,
  onEndChange,
  step = 0.01,
}: DualRangeSliderProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState<'start' | 'end' | null>(null);

  const getValueFromPosition = useCallback((clientX: number): number => {
    if (!trackRef.current) return min;
    const rect = trackRef.current.getBoundingClientRect();
    const percentage = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const rawValue = min + percentage * (max - min);
    return Math.round(rawValue / step) * step;
  }, [min, max, step]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!dragging) return;
    const value = getValueFromPosition(e.clientX);
    
    if (dragging === 'start') {
      onStartChange(Math.min(value, endValue - step));
    } else {
      onEndChange(Math.max(value, startValue + step));
    }
  }, [dragging, getValueFromPosition, onStartChange, onEndChange, startValue, endValue, step]);

  const handleMouseUp = useCallback(() => {
    setDragging(null);
  }, []);

  useEffect(() => {
    if (dragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [dragging, handleMouseMove, handleMouseUp]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!dragging || !e.touches[0]) return;
    e.preventDefault();
    const value = getValueFromPosition(e.touches[0].clientX);
    
    if (dragging === 'start') {
      onStartChange(Math.min(value, endValue - step));
    } else {
      onEndChange(Math.max(value, startValue + step));
    }
  }, [dragging, getValueFromPosition, onStartChange, onEndChange, startValue, endValue, step]);

  const handleTouchEnd = useCallback(() => {
    setDragging(null);
  }, []);

  useEffect(() => {
    if (dragging) {
      window.addEventListener('touchmove', handleTouchMove, { passive: false });
      window.addEventListener('touchend', handleTouchEnd);
      return () => {
        window.removeEventListener('touchmove', handleTouchMove);
        window.removeEventListener('touchend', handleTouchEnd);
      };
    }
  }, [dragging, handleTouchMove, handleTouchEnd]);

  const startPercent = ((startValue - min) / (max - min)) * 100;
  const endPercent = ((endValue - min) / (max - min)) * 100;

  return (
    <div className="relative w-full">
      {/* Track */}
      <div
        ref={trackRef}
        className="relative h-2 bg-zinc-800 rounded-full cursor-pointer"
        onMouseDown={(e) => {
          const value = getValueFromPosition(e.clientX);
          const distToStart = Math.abs(value - startValue);
          const distToEnd = Math.abs(value - endValue);
          setDragging(distToStart < distToEnd ? 'start' : 'end');
        }}
      >
        {/* Selected range highlight */}
        <div
          className="absolute inset-y-0 bg-emerald-600 rounded-full"
          style={{
            left: `${startPercent}%`,
            right: `${100 - endPercent}%`,
          }}
        />
        
        {/* Start thumb */}
        <div
          className={`absolute w-4 h-4 bg-emerald-500 border-2 border-zinc-100 rounded-full shadow-lg ${
            dragging === 'start' ? 'cursor-grabbing' : 'cursor-grab'
          }`}
          style={{ 
            left: `${startPercent}%`,
            top: '50%',
            transform: 'translate(-50%, -50%)',
          }}
          onMouseDown={(e) => {
            e.stopPropagation();
            setDragging('start');
          }}
          onTouchStart={(e) => {
            e.stopPropagation();
            setDragging('start');
          }}
        />
        
        {/* End thumb */}
        <div
          className={`absolute w-4 h-4 bg-emerald-500 border-2 border-zinc-100 rounded-full shadow-lg ${
            dragging === 'end' ? 'cursor-grabbing' : 'cursor-grab'
          }`}
          style={{ 
            left: `${endPercent}%`,
            top: '50%',
            transform: 'translate(-50%, -50%)',
          }}
          onMouseDown={(e) => {
            e.stopPropagation();
            setDragging('end');
          }}
          onTouchStart={(e) => {
            e.stopPropagation();
            setDragging('end');
          }}
        />
      </div>
    </div>
  );
}
