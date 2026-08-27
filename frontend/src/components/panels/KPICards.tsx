import { ReactNode, useRef, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn, formatNumber, clamp, lerp } from '@/utils/helpers';
import { Tooltip } from '@/components/ui/Tooltip';
import { Sparkline } from '../visualizations/Sparkline';
import { useReducedMotion } from '@/contexts/ReducedMotionContext';
import { useSound } from '@/contexts/SoundContext';

interface KPICardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: { value: number; label: string; positive?: boolean };
  icon?: ReactNode;
  sparklineData?: number[];
  sparklineColor?: 'electric' | 'violet' | 'amber' | 'critical' | 'secure';
  onClick?: () => void;
  onHover?: (hovering: boolean) => void;
  className?: string;
  children?: ReactNode;
  loading?: boolean;
  variant?: 'default' | 'primary' | 'alert';
}

export function KPICard({
  title,
  value,
  subtitle,
  trend,
  icon,
  sparklineData,
  sparklineColor = 'electric',
  onClick,
  onHover,
  className,
  children,
  loading,
  variant = 'default',
}: KPICardProps) {
  const { reducedMotion } = useReducedMotion();
  const { play } = useSound();
  const cardRef = useRef<HTMLDivElement>(null);
  const [hovered, setHovered] = useState(false);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });

  const colors = {
    electric: { glow: 'rgba(59, 130, 246, 0.3)', text: 'text-electric-400' },
    violet: { glow: 'rgba(139, 92, 246, 0.3)', text: 'text-violet-400' },
    amber: { glow: 'rgba(245, 158, 11, 0.3)', text: 'text-amber-400' },
    critical: { glow: 'rgba(239, 68, 68, 0.3)', text: 'text-critical-400' },
    secure: { glow: 'rgba(34, 197, 94, 0.3)', text: 'text-secure-400' },
  };

  const color = colors[sparklineColor as keyof typeof colors] || colors.electric;

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (reducedMotion) return;
    const rect = cardRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = ((e.clientX - rect.left) / rect.width - 0.5) * 10;
    const y = ((e.clientY - rect.top) / rect.height - 0.5) * -10;
    setTilt({ x, y });
  };

  const handleMouseLeaveCard = () => {
    setTilt({ x: 0, y: 0 });
    setHovered(false);
    onHover?.(false);
  };

  const handleMouseEnter = () => {
    setHovered(true);
    onHover?.(true);
    play('click');
  };

  const handleClick = () => {
    if (onClick) {
      play('click');
      onClick();
    }
  };

  const variantStyles = {
    default: '',
    primary: 'border-electric-500/30 shadow-glow-sm',
    alert: 'border-critical-500/30 shadow-glow-critical',
  };

  if (loading) {
    return (
      <div className={cn('glass-panel kpi-card rounded-2xl p-5', className)}>
        <div className="space-y-3">
          <div className="h-4 w-1/3 bg-surface-700 rounded animate-pulse" />
          <div className="h-8 w-1/2 bg-surface-700 rounded animate-pulse" />
          <div className="h-3 w-3/4 bg-surface-700 rounded animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <Tooltip content={subtitle || ''} position="top" delay={300}>
      <motion.div
        ref={cardRef}
        initial={false}
        animate={{
          rotateX: reducedMotion ? 0 : tilt.y,
          rotateY: reducedMotion ? 0 : tilt.x,
          scale: hovered && !reducedMotion ? 1.02 : 1,
          boxShadow: hovered && !reducedMotion ? color.glow : 'none',
        }}
        transition={{
          duration: reducedMotion ? 0 : 200,
          ease: [0.34, 1.56, 0.64, 1],
        }}
        onMouseMove={handleMouseMove}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeaveCard}
        onClick={handleClick}
        className={cn(
          'glass-panel kpi-card rounded-2xl p-5 relative overflow-hidden group cursor-pointer',
          'perspective-1000 transform-gpu',
          variantStyles[variant],
          className
        )}
        role="button"
        tabIndex={0}
        onKeyDown={(e: React.KeyboardEvent<HTMLDivElement>) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleClick(); } }}
        aria-label={`${title}: ${value}`}
      >
        <AnimatePresence mode="wait">
          {hovered && !reducedMotion && (
            <motion.div
              key="glow"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="absolute inset-0 bg-gradient-to-br from-electric-500/5 via-transparent to-violet-500/5 pointer-events-none"
            />
          )}
        </AnimatePresence>

        <div className="relative z-10 flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              {icon && (
                <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0', `bg-${sparklineColor}-500/15`, `text-${sparklineColor}-400`)}>
                  {icon}
                </div>
              )}
              <h3 className="text-caption text-text-muted font-medium uppercase tracking-wider truncate">{title}</h3>
            </div>
            <div className="text-metric font-display text-text-primary font-bold" style={{ fontSize: 'clamp(2rem, 4vw, 3rem)' }}>
              {typeof value === 'number' ? formatNumber(value) : value}
            </div>
            {sparklineData && sparklineData.length > 1 && (
              <div className="mt-3 h-12 w-full">
                <Sparkline data={sparklineData} color={sparklineColor} height={12} />
              </div>
            )}
            {trend && (
              <div className="mt-2 flex items-center gap-1.5">
                <span className={cn(
                  'text-caption font-medium flex items-center gap-1',
                  trend.positive ? 'text-secure-400' : 'text-critical-400'
                )}>
                  {trend.positive ? '▲' : '▼'} {Math.abs(trend.value).toFixed(1)}%
                </span>
                <span className="text-caption text-text-muted">{trend.label}</span>
              </div>
            )}
            {subtitle && !trend && (
              <p className="mt-2 text-body-sm text-text-muted">{subtitle}</p>
            )}
          </div>
          {children && (
            <div className="flex-shrink-0">{children}</div>
          )}
        </div>
      </motion.div>
    </Tooltip>
  );
}

interface ForecastKPICardProps {
  probability: number;
  status: 'ATTACK_LIKELY' | 'NORMAL';
  threshold: number;
  mode: 'REAL_MODEL' | 'DEMO';
  forecastHorizon: number;
  onClick?: () => void;
  className?: string;
  loading?: boolean;
}

export function ForecastKPICard({ 
  probability, 
  status, 
  threshold, 
  mode, 
  forecastHorizon = 5, 
  onClick,
  className,
  loading,
}: ForecastKPICardProps) {
  const { reducedMotion } = useReducedMotion();
  const { play } = useSound();
  const cardRef = useRef<HTMLDivElement>(null);
  const [hovered, setHovered] = useState(false);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [displayProbability, setDisplayProbability] = useState(probability);

  useEffect(() => {
    if (reducedMotion) {
      setDisplayProbability(probability);
      return;
    }
    const start = displayProbability;
    const duration = 800;
    const startTime = Date.now();
    
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = progress * progress * (3 - 2 * progress);
      setDisplayProbability(lerp(start, probability, eased));
      if (progress < 1) requestAnimationFrame(animate);
    };
    animate();
  }, [probability, reducedMotion]);

  const riskLevel = probability >= 0.8 ? 'CRITICAL' : probability >= 0.6 ? 'HIGH' : probability >= 0.4 ? 'ELEVATED' : probability >= 0.2 ? 'LOW' : 'MINIMAL';
  const riskColors = {
    CRITICAL: { bg: 'bg-critical-500/15', text: 'text-critical-400', border: 'border-critical-500/30', glow: 'glow-critical', hex: '#f87171' },
    HIGH: { bg: 'bg-amber-500/15', text: 'text-amber-400', border: 'border-amber-500/30', glow: 'glow-amber', hex: '#fbbf24' },
    ELEVATED: { bg: 'bg-amber-500/15', text: 'text-amber-400', border: 'border-amber-500/30', glow: 'glow-amber', hex: '#fbbf24' },
    LOW: { bg: 'bg-electric-500/15', text: 'text-electric-400', border: 'border-electric-500/30', glow: 'glow-sm', hex: '#60a5fa' },
    MINIMAL: { bg: 'bg-secure-500/15', text: 'text-secure-400', border: 'border-secure-500/30', glow: 'glow-secure', hex: '#4ade80' },
  };
  const colors = riskColors[riskLevel as keyof typeof riskColors];

  const isAttackLikely = status === 'ATTACK_LIKELY';
  const modeColors = mode === 'REAL_MODEL' 
    ? { bg: 'bg-electric-500/15', text: 'text-electric-400', border: 'border-electric-500/30', hex: '#60a5fa' }
    : { bg: 'bg-violet-500/15', text: 'text-violet-400', border: 'border-violet-500/30', hex: '#a78bfa' };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (reducedMotion) return;
    const rect = cardRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = ((e.clientX - rect.left) / rect.width - 0.5) * 8;
    const y = ((e.clientY - rect.top) / rect.height - 0.5) * -8;
    setTilt({ x, y });
  };

  const handleMouseLeave = () => setTilt({ x: 0, y: 0 });

  if (loading) {
    return (
      <div className={cn('glass-panel kpi-card rounded-2xl p-6 md:p-8', className)}>
        <div className="space-y-4">
          <div className="h-6 w-1/4 bg-surface-700 rounded animate-pulse" />
          <div className="h-16 w-1/3 bg-surface-700 rounded animate-pulse" />
          <div className="h-4 w-1/2 bg-surface-700 rounded animate-pulse" />
          <div className="grid grid-cols-3 gap-4 mt-4">
            <div className="h-20 bg-surface-700 rounded animate-pulse" />
            <div className="h-20 bg-surface-700 rounded animate-pulse" />
            <div className="h-20 bg-surface-700 rounded animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      ref={cardRef}
      initial={false}
      animate={{
        rotateX: reducedMotion ? 0 : tilt.y,
        rotateY: reducedMotion ? 0 : tilt.x,
        scale: hovered && !reducedMotion ? 1.015 : 1,
      }}
      transition={{
        duration: reducedMotion ? 0 : 300,
        ease: [0.34, 1.56, 0.64, 1],
      }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onMouseEnter={() => { setHovered(true); play('click'); }}
      onClick={onClick}
      className={cn(
        'glass-panel-strong kpi-card rounded-2xl p-6 md:p-8 relative overflow-hidden group cursor-pointer',
        'perspective-1000 transform-gpu',
        colors.border,
        colors.glow,
        className
      )}
      role="button"
      tabIndex={0}
      onKeyDown={(e: React.KeyboardEvent<HTMLDivElement>) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick?.(); play('click'); } }}
      aria-label={`Attack forecast: ${(probability * 100).toFixed(1)}% probability, ${status}, ${mode}`}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-transparent via-electric-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

      <div className="relative z-10 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-caption text-text-muted uppercase tracking-wider font-medium mb-1">
              Next {forecastHorizon}-Minute Forecast
            </p>
            <p className="text-body-sm text-text-secondary">Attack Probability</p>
          </div>
          <div className="flex items-center gap-2">
            <span className={cn('px-2.5 py-1 rounded-full text-caption font-medium uppercase tracking-wider border', colors.bg, colors.text, colors.border)}>
              {riskLevel}
            </span>
            <span className={cn('px-2.5 py-1 rounded-full text-caption font-medium uppercase tracking-wider border', modeColors.bg, modeColors.text, modeColors.border)}>
              {mode}
            </span>
          </div>
        </div>

        <div className="relative">
          <div className="flex items-baseline gap-3">
            <motion.span
              initial={false}
              animate={{ scale: hovered && !reducedMotion ? 1.05 : 1 }}
              className="font-display font-bold text-text-primary"
              style={{ fontSize: 'clamp(3rem, 6vw, 5rem)', lineHeight: 1 }}
            >
              {(displayProbability * 100).toFixed(1)}%
            </motion.span>
            <div className="flex flex-col justify-end">
              <span className={cn('text-heading-md font-semibold', isAttackLikely ? 'text-critical-400' : 'text-secure-400')}>
                {status}
              </span>
              <p className="text-caption text-text-muted">Threshold: {(threshold * 100).toFixed(0)}%</p>
            </div>
          </div>

          <div className="mt-4 h-3 bg-surface-800 rounded-full overflow-hidden relative">
            <motion.div
              initial={false}
              animate={{ width: `${clamp(displayProbability, 0, 1) * 100}%` }}
              transition={{ duration: reducedMotion ? 0 : 800, ease: [0.34, 1.56, 0.64, 1] }}
              className="h-full rounded-full relative"
              style={{ background: `linear-gradient(90deg, ${colors.hex}, ${colors.hex}cc)` }}
            >
              <div className="absolute right-0 top-0 bottom-0 w-4 bg-gradient-to-r from-transparent to-white/20" />
            </motion.div>
            <div
              className="absolute top-0 bottom-0 w-1 bg-white/50 transform -translate-x-1/2"
              style={{ left: `${clamp(threshold, 0, 1) * 100}%` }}
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 pt-4 border-t border-border-subtle">
          <div className="text-center p-3 rounded-lg bg-surface-800/50">
            <p className="text-metric-sm font-display text-text-primary">{(probability * 100).toFixed(1)}%</p>
            <p className="text-caption text-text-muted">Current Risk</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-surface-800/50">
            <p className="text-metric-sm font-display text-text-primary">{(threshold * 100).toFixed(0)}%</p>
            <p className="text-caption text-text-muted">Alert Threshold</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-surface-800/50">
            <p className="text-metric-sm font-display text-text-primary">{forecastHorizon} min</p>
            <p className="text-caption text-text-muted">Forecast Window</p>
          </div>
        </div>

        <div className="flex items-center gap-4 text-caption text-text-muted pt-4 border-t border-border-subtle">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-electric-400" />
            Historical Observed
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-critical-400" />
            Future Forecast
          </span>
            <span className="flex items-center gap-1.5 ml-auto" style={{ color: modeColors.hex }}>
            {mode === 'REAL_MODEL' ? '🔒 Trained Model' : '⚠️ Heuristic Demo'}
          </span>
        </div>
      </div>
    </motion.div>
  );
}