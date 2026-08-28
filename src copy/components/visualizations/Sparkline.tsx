import { useRef, useEffect, useMemo, useState } from 'react';
import { cn } from '@/utils/helpers';

interface SparklineProps {
  data: number[];
  color?: 'electric' | 'violet' | 'amber' | 'critical' | 'secure';
  width?: number;
  height?: number;
  showArea?: boolean;
  showPoints?: boolean;
  animate?: boolean;
  className?: string;
}

const colorMap = {
  electric: { stroke: '#3b82f6', fill: 'rgba(59, 130, 246, 0.15)', point: '#3b82f6' },
  violet: { stroke: '#8b5cf6', fill: 'rgba(139, 92, 246, 0.15)', point: '#8b5cf6' },
  amber: { stroke: '#f59e0b', fill: 'rgba(245, 158, 11, 0.15)', point: '#f59e0b' },
  critical: { stroke: '#ef4444', fill: 'rgba(239, 68, 68, 0.15)', point: '#ef4444' },
  secure: { stroke: '#22c55e', fill: 'rgba(34, 197, 94, 0.15)', point: '#22c55e' },
};

export function Sparkline({
  data,
  color = 'electric',
  width = 200,
  height = 40,
  showArea = true,
  showPoints = false,
  animate = true,
  className,
}: SparklineProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const [progress, setProgress] = useState(0);
  const colors = colorMap[color];

  const min = useMemo(() => Math.min(...data), [data]);
  const max = useMemo(() => Math.max(...data), [data]);
  const range = max - min || 1;

  useEffect(() => {
    if (!animate) {
      setProgress(1);
      return;
    }
    let p = 0;
    const tick = () => {
      p += 0.03;
      if (p >= 1) {
        setProgress(1);
        return;
      }
      setProgress(p);
      animationRef.current = requestAnimationFrame(tick);
    };
    tick();
    return () => { if (animationRef.current) cancelAnimationFrame(animationRef.current); };
  }, [animate, data.length]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.scale(dpr, dpr);

    const padding = 2;
    const chartWidth = width - padding * 2;
    const chartHeight = height - padding * 2;

    ctx.clearRect(0, 0, width, height);

    const visiblePoints = Math.max(2, Math.floor(data.length * progress));
    const visibleData = data.slice(0, visiblePoints);

    if (visibleData.length < 2) return;

    ctx.save();

    if (showArea) {
      const gradient = ctx.createLinearGradient(0, padding, 0, height - padding);
      gradient.addColorStop(0, colors.fill.replace('0.15', '0.2'));
      gradient.addColorStop(1, colors.fill.replace('0.15', '0'));

      ctx.beginPath();
      ctx.moveTo(padding, height - padding);
      
      for (let i = 0; i < visibleData.length; i++) {
        const current = visibleData[i] ?? min;
        const x = padding + (i / (data.length - 1)) * chartWidth;
        const y = height - padding - ((current - min) / range) * chartHeight;

        if (i === 0) {
          ctx.lineTo(x, y);
        } else {
          const prevValue = visibleData[i - 1] ?? min;
          const prevX = padding + ((i - 1) / (data.length - 1)) * chartWidth;
          const cpX = (prevX + x) / 2;
          const prevY = height - padding - ((prevValue - min) / range) * chartHeight;
          ctx.bezierCurveTo(cpX, prevY, cpX, y, x, y);
        }
      }

      ctx.lineTo(padding + chartWidth, height - padding);
      ctx.closePath();
      ctx.fillStyle = gradient;
      ctx.fill();
    }

    ctx.beginPath();
    for (let i = 0; i < visibleData.length; i++) {
      const current = visibleData[i] ?? min;
      const x = padding + (i / (data.length - 1)) * chartWidth;
      const y = height - padding - ((current - min) / range) * chartHeight;

      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        const prevValue = visibleData[i - 1] ?? min;
        const prevX = padding + ((i - 1) / (data.length - 1)) * chartWidth;
        const cpX = (prevX + x) / 2;
        const prevY = height - padding - ((prevValue - min) / range) * chartHeight;
        ctx.bezierCurveTo(cpX, prevY, cpX, y, x, y);
      }
    }
    ctx.strokeStyle = colors.stroke;
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();

    if (showPoints && visibleData.length > 0) {
      const lastIdx = visibleData.length - 1;
      const lastValue = visibleData[lastIdx] ?? min;
      const x = padding + (lastIdx / (data.length - 1)) * chartWidth;
      const y = height - padding - ((lastValue - min) / range) * chartHeight;
      
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.fillStyle = colors.point;
      ctx.fill();
      
      ctx.beginPath();
      ctx.arc(x, y, 6, 0, Math.PI * 2);
      ctx.strokeStyle = colors.stroke + '80';
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    ctx.restore();
  }, [width, height, data, min, max, range, progress, showArea, showPoints, colors]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className={cn('block', className)}
      aria-hidden="true"
    />
  );
}