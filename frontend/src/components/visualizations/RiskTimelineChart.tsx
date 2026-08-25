import { useRef, useEffect, useMemo, useState, useCallback } from 'react';
import { cn, formatTimestamp, clamp } from '@/utils/helpers';
import { useReducedMotion } from '@/contexts/ReducedMotionContext';
import type { RiskTimelineData, RiskTimelinePoint } from '@/types/dashboard';

interface RiskTimelineChartProps {
  data: RiskTimelineData | null;
  width?: number;
  height?: number;
  className?: string;
  onPointHover?: (point: RiskTimelinePoint | null, index: number) => void;
}

export function RiskTimelineChart({ data, width = 800, height = 300, className, onPointHover }: RiskTimelineChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const { reducedMotion } = useReducedMotion();
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [animationProgress, setAnimationProgress] = useState(0);

  const points = useMemo(() => data?.points || [], [data]);
  const currentIndex = data?.current_index ?? points.length - 1;
  const threshold = data?.threshold ?? 0.5;

  useEffect(() => {
    if (reducedMotion) {
      setAnimationProgress(1);
      return;
    }
    let progress = 0;
    const animate = () => {
      progress += 0.02;
      if (progress >= 1) {
        setAnimationProgress(1);
        return;
      }
      setAnimationProgress(progress);
      animationRef.current = requestAnimationFrame(animate);
    };
    animate();
    return () => { if (animationRef.current) cancelAnimationFrame(animationRef.current); };
  }, [data, reducedMotion]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    const ctx = canvas.getContext('2d');
    if (ctx) ctx.scale(dpr, dpr);

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const padding = 60;
      const chartWidth = width - padding * 2;
      
      if (points.length > 1) {
        const index = Math.round(clamp((x - padding) / chartWidth * (points.length - 1), 0, points.length - 1));
        setHoverIndex(index);
        onPointHover?.(points[index] ?? null, index);
      }
    };

    const handleMouseLeave = () => {
      setHoverIndex(null);
      onPointHover?.(null, -1);
    };

    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [width, height, points, onPointHover]);

  const drawChart = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, width, height);

    const padding = 60;
    const chartWidth = width - padding * 2;
    const chartHeight = height - padding * 2;

    ctx.save();

    ctx.strokeStyle = 'rgba(148, 163, 184, 0.08)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = padding + (chartHeight / 4) * i;
      ctx.beginPath();
      ctx.moveTo(padding, y);
      ctx.lineTo(width - padding, y);
      ctx.stroke();
    }
    for (let i = 0; i <= 5; i++) {
      const x = padding + (chartWidth / 5) * i;
      ctx.beginPath();
      ctx.moveTo(x, padding);
      ctx.lineTo(x, height - padding);
      ctx.stroke();
    }

    const thresholdY = padding + chartHeight * (1 - threshold);
    ctx.setLineDash([6, 4]);
    ctx.strokeStyle = 'rgba(245, 158, 11, 0.5)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(padding, thresholdY);
    ctx.lineTo(width - padding, thresholdY);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = 'rgba(245, 158, 11, 0.1)';
    ctx.fillRect(padding, 0, chartWidth, thresholdY);

    ctx.fillStyle = 'rgba(34, 197, 94, 0.05)';
    ctx.fillRect(padding, thresholdY, chartWidth, height - padding - thresholdY);

    if (points.length > 1) {
      const visiblePoints = Math.floor(points.length * animationProgress);
      if (visiblePoints >= 2) {
        const drawPoints = points.slice(0, visiblePoints);

        const gradient = ctx.createLinearGradient(padding, padding, padding, height - padding);
        gradient.addColorStop(0, 'rgba(239, 68, 68, 0.3)');
        gradient.addColorStop(0.5, 'rgba(245, 158, 11, 0.2)');
        gradient.addColorStop(1, 'rgba(34, 197, 94, 0.1)');

        const coords = drawPoints.map((p, i) => ({
          x: padding + (i / (points.length - 1)) * chartWidth,
          y: height - padding - p.risk_score * chartHeight,
        }));
        const [firstCoord] = coords;

        if (firstCoord) {
          ctx.beginPath();
          ctx.moveTo(firstCoord.x, firstCoord.y);

          let prevCoord = firstCoord;
          for (let i = 1; i < coords.length; i++) {
            const coord = coords[i];
            if (!coord) break;
            const cpX = (prevCoord.x + coord.x) / 2;
            ctx.bezierCurveTo(cpX, prevCoord.y, cpX, coord.y, coord.x, coord.y);
            prevCoord = coord;
          }

          ctx.lineTo(padding + chartWidth, height - padding);
          ctx.lineTo(padding, height - padding);
          ctx.closePath();

          ctx.fillStyle = gradient;
          ctx.globalAlpha = 0.3;
          ctx.fill();

          ctx.beginPath();
          ctx.moveTo(firstCoord.x, firstCoord.y);

          prevCoord = firstCoord;
          for (let i = 1; i < coords.length; i++) {
            const coord = coords[i];
            if (!coord) break;
            const cpX = (prevCoord.x + coord.x) / 2;
            ctx.bezierCurveTo(cpX, prevCoord.y, cpX, coord.y, coord.x, coord.y);
            prevCoord = coord;
          }
          ctx.strokeStyle = 'rgba(59, 130, 246, 0.8)';
          ctx.lineWidth = 2.5;
          ctx.globalAlpha = 1;
          ctx.stroke();

          drawPoints.forEach((point, i) => {
            if (i === currentIndex) {
              const x = padding + (i / (points.length - 1)) * chartWidth;
              const y = height - padding - point.risk_score * chartHeight;

              ctx.beginPath();
              ctx.arc(x, y, 8, 0, Math.PI * 2);
              ctx.fillStyle = point.is_forecast ? '#ef4444' : '#3b82f6';
              ctx.globalAlpha = 1;
              ctx.fill();

              ctx.beginPath();
              ctx.arc(x, y, 4, 0, Math.PI * 2);
              ctx.fillStyle = '#ffffff';
              ctx.fill();
            }
          });

          const hoverPoint = hoverIndex !== null && hoverIndex < drawPoints.length ? drawPoints[hoverIndex] : undefined;
          const hoverCoord = hoverIndex !== null && hoverIndex < coords.length ? coords[hoverIndex] : undefined;

          if (hoverPoint && hoverCoord) {
            const x = hoverCoord.x;
            const y = hoverCoord.y;

            ctx.beginPath();
            ctx.arc(x, y, 10, 0, Math.PI * 2);
            ctx.strokeStyle = '#3b82f6';
            ctx.lineWidth = 2;
            ctx.globalAlpha = 0.8;
            ctx.stroke();

            ctx.fillStyle = 'rgba(15, 23, 42, 0.95)';
            ctx.fillRect(x + 15, y - 35, 160, 60);
            ctx.strokeStyle = 'rgba(148, 163, 184, 0.2)';
            ctx.strokeRect(x + 15, y - 35, 160, 60);

            ctx.fillStyle = '#f8fafc';
            ctx.font = '12px Inter, system-ui';
            ctx.fillText(`Risk: ${(hoverPoint.risk_score * 100).toFixed(1)}%`, x + 20, y - 20);
            ctx.fillText(`Time: ${formatTimestamp(hoverPoint.timestamp)}`, x + 20, y - 5);
            ctx.fillStyle = hoverPoint.is_forecast ? '#ef4444' : '#3b82f6';
            ctx.fillText(hoverPoint.is_forecast ? 'FORECAST' : 'OBSERVED', x + 20, y + 10);
          }
        }
      }
    }

    ctx.font = '11px Inter, system-ui';
    ctx.fillStyle = 'rgba(148, 163, 184, 0.6)';
    ctx.textAlign = 'center';
    for (let i = 0; i <= 4; i++) {
      const y = padding + (chartHeight / 4) * i;
      const val = (1 - i / 4) * 100;
      ctx.fillText(`${val.toFixed(0)}%`, padding - 30, y + 4);
    }

    ctx.textAlign = 'center';
    for (let i = 0; i <= 5; i++) {
      const x = padding + (chartWidth / 5) * i;
      const timeOffset = Math.round((points.length - 1 - i) * 5);
      ctx.fillText(`${timeOffset}m ago`, x, height - padding + 20);
    }

    ctx.restore();
  }, [width, height, points, currentIndex, threshold, hoverIndex, animationProgress, onPointHover]);

  useEffect(() => {
    drawChart();
  }, [drawChart]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className={cn('w-full h-full block', className)}
      tabIndex={0}
      role="img"
      aria-label="Risk timeline chart showing attack probability over time with forecast horizon"
      onKeyDown={(e) => {
        if (e.key === 'ArrowLeft' && hoverIndex !== null && hoverIndex > 0) {
          setHoverIndex(hoverIndex - 1);
          onPointHover?.(points[hoverIndex - 1] ?? null, hoverIndex - 1);
        } else if (e.key === 'ArrowRight' && hoverIndex !== null && hoverIndex < points.length - 1) {
          setHoverIndex(hoverIndex + 1);
          onPointHover?.(points[hoverIndex + 1] ?? null, hoverIndex + 1);
        }
      }}
    />
  );
}