import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatNumber(value: number, options: Intl.NumberFormatOptions = {}): string {
  return new Intl.NumberFormat('en-US', {
    notation: 'compact',
    maximumFractionDigits: 2,
    ...options,
  }).format(value);
}

export function formatNumberFull(value: number, options: Intl.NumberFormatOptions = {}): string {
  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 2,
    ...options,
  }).format(value);
}

export function formatPercent(value: number, decimals: number = 1): string {
  return `${(value * 100).toFixed(decimals)}%`;
}

export function formatTimestamp(date: Date | string, options: Intl.DateTimeFormatOptions = {}): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    ...options,
  }).format(d);
}

export function formatDateTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(d);
}

export function formatRelativeTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffSec = Math.floor(diffMs / 1000);

  if (diffSec < 60) return 'just now';
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
  return `${Math.floor(diffSec / 86400)}d ago`;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function smoothstep(t: number): number {
  return t * t * (3 - 2 * t);
}

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function debounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}

export function throttle<T extends (...args: unknown[]) => unknown>(
  fn: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle = false;
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      fn(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

export function clampScore(score: number): number {
  return clamp(score, 0, 1);
}

export type RiskLevel = 'CRITICAL' | 'HIGH' | 'ELEVATED' | 'LOW' | 'MINIMAL';

export function getRiskLevel(probability: number): { level: RiskLevel; color: string; bgColor: string } {
  if (probability >= 0.8) return { level: 'CRITICAL', color: 'text-critical-400', bgColor: 'bg-critical-500/15' };
  if (probability >= 0.6) return { level: 'HIGH', color: 'text-amber-400', bgColor: 'bg-amber-500/15' };
  if (probability >= 0.4) return { level: 'ELEVATED', color: 'text-amber-400', bgColor: 'bg-amber-500/15' };
  if (probability >= 0.2) return { level: 'LOW', color: 'text-electric-400', bgColor: 'bg-electric-500/15' };
  return { level: 'MINIMAL', color: 'text-secure-400', bgColor: 'bg-secure-500/15' };
}

export function getStatusColor(status: 'ATTACK_LIKELY' | 'NORMAL'): string {
  return status === 'ATTACK_LIKELY' ? 'text-critical-400' : 'text-secure-400';
}

export function getStatusBg(status: 'ATTACK_LIKELY' | 'NORMAL'): string {
  return status === 'ATTACK_LIKELY' ? 'bg-critical-500/15' : 'bg-secure-500/15';
}

export function getModelModeClasses(mode: 'REAL_MODEL' | 'DEMO'): { badge: string; text: string; bg: string } {
  if (mode === 'REAL_MODEL') {
    return { badge: 'status-real-model', text: 'text-electric-400', bg: 'bg-electric-500/15' };
  }
  return { badge: 'status-demo', text: 'text-violet-400', bg: 'bg-violet-500/15' };
}

export function interpolateColor(color1: string, color2: string, factor: number): string {
  const c1 = hexToRgb(color1);
  const c2 = hexToRgb(color2);
  if (!c1 || !c2) return color1;
  const r = Math.round(lerp(c1.r, c2.r, factor));
  const g = Math.round(lerp(c1.g, c2.g, factor));
  const b = Math.round(lerp(c1.b, c2.b, factor));
  return `rgb(${r}, ${g}, ${b})`;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const [, r, g, b] = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex) ?? [];
  if (r === undefined || g === undefined || b === undefined) return null;
  return { r: parseInt(r, 16), g: parseInt(g, 16), b: parseInt(b, 16) };
}

export function createRafThrottle<T extends (...args: never[]) => void>(
  callback: T
): T & { cancel: () => void } {
  let rafId: number | null = null;
  let lastArgs: Parameters<T> | null = null;

  const throttled = ((...args: Parameters<T>) => {
    lastArgs = args;
    if (rafId === null) {
      rafId = requestAnimationFrame(() => {
        rafId = null;
        if (lastArgs) callback(...lastArgs);
      });
    }
  }) as T & { cancel: () => void };

  throttled.cancel = () => {
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
  };

  return throttled;
}

export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function supportsBackdropFilter(): boolean {
  if (typeof window === 'undefined') return false;
  return CSS.supports('backdrop-filter', 'blur(1px)') || CSS.supports('-webkit-backdrop-filter', 'blur(1px)');
}

export function getDevicePerformanceTier(): 'high' | 'medium' | 'low' {
  if (typeof navigator === 'undefined') return 'medium';
  const hwConcurrency = navigator.hardwareConcurrency || 4;
  const deviceMemory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory || 4;
  const isMobile = /Mobi|Android/i.test(navigator.userAgent);

  if (isMobile || hwConcurrency <= 2 || deviceMemory <= 2) return 'low';
  if (hwConcurrency >= 8 && deviceMemory >= 8) return 'high';
  return 'medium';
}