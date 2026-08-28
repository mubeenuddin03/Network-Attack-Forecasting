import { HTMLAttributes, forwardRef } from 'react';
import { cn } from '@/utils/helpers';

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info' | 'connected' | 'degraded' | 'offline' | 'real-model' | 'demo';
  size?: 'sm' | 'md' | 'lg';
  dot?: boolean;
}

const variantClasses = {
  default: 'bg-surface-700 text-text-secondary border-border-default',
  success: 'bg-secure-500/15 text-secure-400 border-secure-500/30',
  warning: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  error: 'bg-critical-500/15 text-critical-400 border-critical-500/30',
  info: 'bg-electric-500/15 text-electric-400 border-electric-500/30',
  connected: 'bg-secure-500/15 text-secure-400 border-secure-500/30',
  degraded: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  offline: 'bg-critical-500/15 text-critical-400 border-critical-500/30',
  'real-model': 'bg-electric-500/15 text-electric-400 border-electric-500/30',
  demo: 'bg-violet-500/15 text-violet-400 border-violet-500/30',
};

const sizeClasses = {
  sm: 'px-2 py-0.5 text-[0.625rem]',
  md: 'px-2.5 py-1 text-caption',
  lg: 'px-3 py-1.5 text-body-sm',
};

const dotColors = {
  default: 'bg-text-muted',
  success: 'bg-secure-400',
  warning: 'bg-amber-400',
  error: 'bg-critical-400',
  info: 'bg-electric-400',
  connected: 'bg-secure-400',
  degraded: 'bg-amber-400',
  offline: 'bg-critical-400',
  'real-model': 'bg-electric-400',
  demo: 'bg-violet-400',
};

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant = 'default', size = 'md', dot, children, ...props }, ref) => {
    const dotColor = dotColors[variant] || dotColors.default;

    return (
      <span
        ref={ref}
        className={cn(
          'inline-flex items-center gap-1.5 font-medium uppercase tracking-wider rounded-full border',
          variantClasses[variant],
          sizeClasses[size],
          className
        )}
        {...props}
      >
        {dot && <span className={cn('w-1.5 h-1.5 rounded-full animate-pulse', dotColor)} />}
        {children}
      </span>
    );
  }
);

Badge.displayName = 'Badge';