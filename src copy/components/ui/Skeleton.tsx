import { HTMLAttributes, forwardRef } from 'react';
import { cn } from '@/utils/helpers';

interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'text' | 'circular' | 'rectangular' | 'card' | 'kpi' | 'chart' | 'table-row';
  width?: string | number;
  height?: string | number;
  animation?: 'pulse' | 'wave' | 'none';
}

export const Skeleton = forwardRef<HTMLDivElement, SkeletonProps>(
  ({ className, variant = 'text', width, height, animation = 'wave', ...props }, ref) => {
    const baseStyles = 'relative overflow-hidden bg-surface-700 rounded';

    const variants = {
      text: 'h-4 w-full',
      circular: 'rounded-full',
      rectangular: 'rounded-lg',
      card: 'rounded-2xl',
      kpi: 'rounded-2xl',
      chart: 'rounded-2xl',
      'table-row': 'h-12',
    };

    const animations = {
      pulse: 'animate-pulse',
      wave: 'before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_2s_ease-in-out_infinite] before:bg-gradient-to-r before:from-transparent before:via-white/10 before:to-transparent',
      none: '',
    };

    const content = (
      <div
        ref={ref}
        className={cn(baseStyles, variants[variant], animations[animation], className)}
        style={{ width, height }}
        {...props}
      />
    );

    if (variant === 'card' || variant === 'kpi') {
      return (
        <div className={cn('glass-panel', className)} style={{ width, height }} {...props}>
          {content}
        </div>
      );
    }

    return content;
  }
);

Skeleton.displayName = 'Skeleton';

export function KPISkeleton() {
  return (
    <div className="glass-panel kpi-card rounded-2xl p-5 space-y-3">
      <Skeleton variant="text" width="40%" height="1rem" className="mx-auto" />
      <Skeleton variant="text" width="60%" height="3rem" className="mx-auto" />
      <Skeleton variant="text" width="80%" height="0.75rem" className="mx-auto" />
      <Skeleton variant="rectangular" width="100%" height="40px" className="mt-2" />
    </div>
  );
}

export function ChartSkeleton() {
  return (
    <div className="glass-panel rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <Skeleton variant="text" width="30%" height="1.25rem" />
        <Skeleton variant="text" width="20%" height="1rem" />
      </div>
      <Skeleton variant="chart" width="100%" height="280px" />
    </div>
  );
}

export function TableRowSkeleton(columns: number = 5) {
  return (
    <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
      {Array.from({ length: columns }).map((_, i) => (
        <Skeleton key={i} variant="text" width="80%" height="1rem" />
      ))}
    </div>
  );
}

export function CardSkeleton() {
  return (
    <div className="glass-panel rounded-2xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <Skeleton variant="text" width="30%" height="1.25rem" />
        <Skeleton variant="circular" width="2rem" height="2rem" />
      </div>
      <Skeleton variant="text" width="60%" height="1rem" />
      <Skeleton variant="rectangular" width="100%" height="120px" />
    </div>
  );
}

export function HeroSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton variant="text" width="40%" height="1.5rem" />
          <Skeleton variant="text" width="60%" height="1rem" />
        </div>
        <Skeleton variant="circular" width="3rem" height="3rem" />
      </div>
      <Skeleton variant="rectangular" width="100%" height="300px" className="rounded-2xl" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Skeleton variant="kpi" />
        <Skeleton variant="kpi" />
        <Skeleton variant="kpi" />
      </div>
    </div>
  );
}

export function SidebarSkeleton() {
  return (
    <div className="space-y-2 p-4">
      <Skeleton variant="text" width="30%" height="1.25rem" className="mx-auto" />
      <div className="space-y-1.5 mt-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} variant="text" width="70%" height="2.5rem" className="rounded-lg" />
        ))}
      </div>
    </div>
  );
}