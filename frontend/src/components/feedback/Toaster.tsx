import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/utils/helpers';
import { useToasts, useDashboardStore } from '@/contexts/DashboardContext';
import { useSound } from '@/contexts/SoundContext';
import { useReducedMotion } from '@/contexts/ReducedMotionContext';
import { X, CheckCircle, AlertTriangle, Info, AlertCircle } from 'lucide-react';

const TOAST_ICONS = {
  success: CheckCircle,
  warning: AlertTriangle,
  error: AlertCircle,
  info: Info,
};

const TOAST_COLORS = {
  success: { bg: 'bg-secure-500/15', border: 'border-secure-500/30', text: 'text-secure-400', icon: 'text-secure-400', hex: '#4ade80' },
  warning: { bg: 'bg-amber-500/15', border: 'border-amber-500/30', text: 'text-amber-400', icon: 'text-amber-400', hex: '#fbbf24' },
  error: { bg: 'bg-critical-500/15', border: 'border-critical-500/30', text: 'text-critical-400', icon: 'text-critical-400', hex: '#f87171' },
  info: { bg: 'bg-electric-500/15', border: 'border-electric-500/30', text: 'text-electric-400', icon: 'text-electric-400', hex: '#60a5fa' },
};

function ToastItem({ toast, onClose }: { toast: ReturnType<typeof useToasts>[0]; onClose: (id: string) => void }) {
  const { play } = useSound();
  const { reducedMotion } = useReducedMotion();
  const colors = TOAST_COLORS[toast.type];
  const Icon = TOAST_ICONS[toast.type];
  const action = toast.action;
  const [progress, setProgress] = useState(toast.duration ? 100 : 0);

  useEffect(() => {
    if (!toast.duration || toast.persistent) return;
    const start = Date.now();
    const duration = toast.duration;
    const animate = () => {
      const elapsed = Date.now() - start;
      const p = Math.max(0, 100 - (elapsed / duration) * 100);
      setProgress(p);
      if (p > 0) requestAnimationFrame(animate);
    };
    animate();
  }, [toast.duration, toast.persistent]);

  return (
    <motion.div
      initial={{ opacity: 0, x: 100, scale: 0.95 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 100, scale: 0.95 }}
      transition={{ duration: reducedMotion ? 0 : 300, ease: [0.34, 1.56, 0.64, 1] }}
      className={cn(
        'glass-panel-strong rounded-xl p-4 min-w-[320px] max-w-md flex items-start gap-3',
        'shadow-glow-lg border',
        colors.border,
        colors.bg
      )}
      role="alert"
      aria-live="polite"
    >
      <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0', colors.icon)}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className={cn('font-medium text-text-primary', colors.text)}>{toast.title}</p>
          <button
            onClick={() => { play('click'); onClose(toast.id); }}
            className="btn-icon p-1 text-text-muted hover:text-text-primary flex-shrink-0"
            aria-label="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        {toast.message && (
          <p className="text-body-sm text-text-secondary mt-1">{toast.message}</p>
        )}
        {action && (
          <button
            onClick={() => { play('click'); action.onClick(); }}
            className="mt-3 text-caption font-medium underline hover:no-underline"
            style={{ color: colors.hex }}
          >
            {action.label}
          </button>
        )}
      </div>
      {toast.duration && !toast.persistent && (
        <motion.div
          initial={false}
          animate={{ width: `${progress}%` }}
          className="absolute bottom-0 left-0 h-1 rounded-b-xl"
          style={{ backgroundColor: colors.hex }}
        />
      )}
    </motion.div>
  );
}

export function Toaster() {
  const toasts = useToasts();
  const { play } = useSound();
  const { reducedMotion } = useReducedMotion();

  useEffect(() => {
    if (toasts.length > 0) {
      const latest = toasts[toasts.length - 1];
      if (!latest) return;
      if (latest.type === 'error') play('error');
      else if (latest.type === 'warning') play('warning');
      else if (latest.type === 'success') play('success');
      else play('click');
    }
  }, [toasts.length, play]);

  return (
    <div
      className={cn(
        'fixed bottom-4 right-4 z-[800] flex flex-col gap-2 pointer-events-none',
        'max-h-[60vh] overflow-y-auto'
      )}
      aria-live="polite"
      aria-label="Notifications"
    >
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 100 }}
            transition={{ duration: reducedMotion ? 0 : 200 }}
            className="pointer-events-auto"
          >
            <ToastItem toast={toast} onClose={useDashboardStore.getState().removeToast} />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}