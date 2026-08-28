import { useRef, useEffect, useMemo, useState, useCallback } from 'react';
import { cn, formatTimestamp, clamp } from '@/utils/helpers';
import { useReducedMotion } from '@/contexts/ReducedMotionContext';
import type { RiskTimelineData, RiskTimelinePoint } from '@/types/dashboard';

interface RiskTimelineChartProps {
  data: RiskTimelineData | null;
  width?: number;
  height?: number;
  responsive?: boolean;
  className?: string;
  onPointHover?: (point: RiskTimelinePoint | null, index: number) => void;
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

export function RiskTimelineChart({
  data,
  width = 800,
  height = 300,
  responsive = false,
  className,
  onPointHover,
}: RiskTimelineChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const { reducedMotion } = useReducedMotion();
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [animationProgress, setAnimationProgress] = useState(0);
  const [dim, setDim] = useState<{ w: number; h: number }>({ w: width, h: height });

  const points = useMemo(() => data?.points || [], [data]);
  const currentIndex = data?.current_index ?? points.length - 1;
  const threshold = data?.threshold ?? 0.5;

  useEffect(() => {
    if (!responsive) {
      setDim({ w: width, h: height });
      return;
    }
    const el = containerRef.current;
    if (!el) return;
    const update = () => {
      const rect = el.getBoundingClientRect();
      setDim({ w: Math.max(rect.width, 240), h: height });
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [responsive, width, height]);

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
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [data, reducedMotion]);

  const cw = dim.w;
  const ch = dim.h;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(cw * dpr);
    canvas.height = Math.round(ch * dpr);
    canvas.style.width = responsive ? '100%' : `${cw}px`;
    canvas.style.height = `${ch}px`;

    const ctx = canvas.getContext('2d');
    if (ctx) ctx.scale(dpr, dpr);

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const padding = 60;
      const chartWidth = cw - padding * 2;

      if (points.length > 1) {
        const index = Math.round(
          clamp(((x - padding) / chartWidth) * (points.length - 1), 0, points.length - 1),
        );
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
  }, [cw, ch, responsive, points, onPointHover]);

  const drawChart = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, cw, ch);

    const padding = 60;
    const chartWidth = cw - padding * 2;
    const chartHeight = ch - padding * 2;

    ctx.save();

    // Grid
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.08)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = padding + (chartHeight / 4) * i;
      ctx.beginPath();
      ctx.moveTo(padding, y);
      ctx.lineTo(cw - padding, y);
      ctx.stroke();
    }
    for (let i = 0; i <= 5; i++) {
      const x = padding + (chartWidth / 5) * i;
      ctx.beginPath();
      ctx.moveTo(x, padding);
      ctx.lineTo(x, ch - padding);
      ctx.stroke();
    }

    // Threshold band
    const thresholdY = padding + chartHeight * (1 - threshold);
    ctx.setLineDash([6, 4]);
    ctx.strokeStyle = 'rgba(245, 158, 11, 0.5)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(padding, thresholdY);
    ctx.lineTo(cw - padding, thresholdY);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = 'rgba(245, 158, 11, 0.1)';
    ctx.fillRect(padding, 0, chartWidth, thresholdY);

    ctx.fillStyle = 'rgba(34, 197, 94, 0.05)';
    ctx.fillRect(padding, thresholdY, chartWidth, ch - padding - thresholdY);

    if (points.length > 1) {
      const visiblePoints = Math.floor(points.length * animationProgress);
      if (visiblePoints >= 2) {
        const drawPoints = points.slice(0, visiblePoints);

        const gradient = ctx.createLinearGradient(padding, padding, padding, ch - padding);
        gradient.addColorStop(0, 'rgba(239, 68, 68, 0.3)');
        gradient.addColorStop(0.5, 'rgba(245, 158, 11, 0.2)');
        gradient.addColorStop(1, 'rgba(34, 197, 94, 0.1)');

        const coords = drawPoints.map((p, i) => ({
          x: padding + (i / (points.length - 1)) * chartWidth,
          y: ch - padding - p.risk_score * chartHeight,
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

          ctx.lineTo(padding + chartWidth, ch - padding);
          ctx.lineTo(padding, ch - padding);
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

          // Current index marker
          drawPoints.forEach((point, i) => {
            if (i === currentIndex) {
              const x = padding + (i / (points.length - 1)) * chartWidth;
              const y = ch - padding - point.risk_score * chartHeight;

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

          // Hover crosshair + tooltip
          const hoverPoint =
            hoverIndex !== null && hoverIndex < drawPoints.length ? drawPoints[hoverIndex] : undefined;
          const hoverCoord =
            hoverIndex !== null && hoverIndex < coords.length ? coords[hoverIndex] : undefined;

          if (hoverPoint && hoverCoord) {
            const hx = hoverCoord.x;
            const hy = hoverCoord.y;

            // Vertical crosshair
            ctx.save();
            ctx.setLineDash([4, 4]);
            ctx.strokeStyle = 'rgba(148, 163, 184, 0.45)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(hx, padding);
            ctx.lineTo(hx, ch - padding);
            ctx.stroke();
            ctx.restore();

            // Highlight dot
            ctx.beginPath();
            ctx.arc(hx, hy, 6, 0, Math.PI * 2);
            ctx.fillStyle = hoverPoint.is_forecast ? '#ef4444' : '#3b82f6';
            ctx.fill();
            ctx.lineWidth = 2;
            ctx.strokeStyle = '#ffffff';
            ctx.stroke();

            // Tooltip
            const accent = hoverPoint.is_forecast ? '#ef4444' : '#3b82f6';
            const bw = 168;
            const bh = 70;
            let bx = hx + 16;
            if (bx + bw > cw - padding) bx = hx - 16 - bw;
            const by = clamp(hy - bh / 2, padding, ch - padding - bh);

            ctx.save();
            ctx.shadowColor = 'rgba(0,0,0,0.5)';
            ctx.shadowBlur = 16;
            ctx.shadowOffsetY = 6;
            roundRect(ctx, bx, by, bw, bh, 10);
            ctx.fillStyle = 'rgba(15, 23, 42, 0.96)';
            ctx.fill();
            ctx.restore();

            ctx.strokeStyle = 'rgba(148, 163, 184, 0.25)';
            ctx.lineWidth = 1;
            roundRect(ctx, bx, by, bw, bh, 10);
            ctx.stroke();

            // Type pill
            ctx.fillStyle = accent;
            roundRect(ctx, bx + 12, by + 12, 10, 10, 3);
            ctx.fill();
            ctx.font = '600 11px Inter, system-ui';
            ctx.fillStyle = accent;
            ctx.textAlign = 'left';
            ctx.fillText(hoverPoint.is_forecast ? 'FORECAST' : 'OBSERVED', bx + 28, by + 21);

            ctx.font = '12px Inter, system-ui';
            ctx.fillStyle = '#f8fafc';
            ctx.fillText(`Risk: ${(hoverPoint.risk_score * 100).toFixed(1)}%`, bx + 12, by + 42);

            ctx.fillStyle = 'rgba(148, 163, 184, 0.85)';
            ctx.font = '11px Inter, system-ui';
            ctx.fillText(formatTimestamp(hoverPoint.timestamp), bx + 12, by + 60);
          }
        }
      }
    }

    // Y axis labels
    ctx.font = '11px Inter, system-ui';
    ctx.fillStyle = 'rgba(148, 163, 184, 0.6)';
    ctx.textAlign = 'center';
    for (let i = 0; i <= 4; i++) {
      const y = padding + (chartHeight / 4) * i;
      const val = (1 - i / 4) * 100;
      ctx.fillText(`${val.toFixed(0)}%`, padding - 30, y + 4);
    }

    // X axis labels
    for (let i = 0; i <= 5; i++) {
      const x = padding + (chartWidth / 5) * i;
      const timeOffset = Math.round((points.length - 1 - i) * 5);
      ctx.fillText(`${timeOffset}m ago`, x, ch - padding + 20);
    }

    ctx.restore();
  }, [cw, ch, points, currentIndex, threshold, hoverIndex, animationProgress, onPointHover]);

  useEffect(() => {
    drawChart();
  }, [drawChart]);

  if (!responsive) {
    return (
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className={cn('block cursor-crosshair', className)}
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

  return (
    <div ref={containerRef} className={cn('w-full', className)}>
      <canvas
        ref={canvasRef}
        tabIndex={0}
        role="img"
        aria-label="Risk timeline chart showing attack probability over time with forecast horizon"
        className="block w-full cursor-crosshair"
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
    </div>
  );
}
