import { ReactNode, useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/utils/helpers';

interface TooltipProps {
  content: ReactNode;
  children: ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
  delay?: number;
  className?: string;
}

export function Tooltip({ content, children, position = 'top', delay = 200, className }: TooltipProps) {
  const [visible, setVisible] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const childRef = useRef<HTMLElement>(null);

  const show = () => {
    timeoutRef.current = setTimeout(() => setVisible(true), delay);
  };

  const hide = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setVisible(false);
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape' || e.key === 'Tab') hide();
  };

  useEffect(() => {
    const el = childRef.current;
    if (!el) return;
    el.addEventListener('mouseenter', show);
    el.addEventListener('mouseleave', hide);
    el.addEventListener('focus', show);
    el.addEventListener('blur', hide);
    el.addEventListener('keydown', handleKeyDown);
    return () => {
      el.removeEventListener('mouseenter', show);
      el.removeEventListener('mouseleave', hide);
      el.removeEventListener('focus', show);
      el.removeEventListener('blur', hide);
      el.removeEventListener('keydown', handleKeyDown);
    };
  }, [show, hide, delay]);

  const positions = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  };

  const arrows = {
    top: 'border-t-electric-600',
    bottom: 'border-b-electric-600',
    left: 'border-l-electric-600',
    right: 'border-r-electric-600',
  };

  if (!childRef.current) {
    return <span ref={childRef}>{children}</span>;
  }

  return (
    <>
      <span ref={childRef} tabIndex={0} className="relative">{children}</span>
      <AnimatePresence>
        {visible && createPortal(
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: position === 'top' ? 4 : position === 'bottom' ? -4 : 0, x: position === 'left' ? 4 : position === 'right' ? -4 : 0 }}
            animate={{ opacity: 1, scale: 1, y: 0, x: 0 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 150, ease: 'easeOut' }}
            className={cn('fixed z-[700] pointer-events-none', positions[position], className)}
            role="tooltip"
          >
            <div className="relative">
              <div className="glass-panel-strong px-3 py-1.5 rounded-lg text-caption text-text-secondary whitespace-nowrap shadow-glow-sm">
                {content}
              </div>
              <div className={cn('absolute w-0 h-0 border-4 border-transparent', arrows[position], {
                top: 'bottom-0 left-1/2 -translate-x-1/2',
                bottom: 'top-0 left-1/2 -translate-x-1/2',
                left: 'right-0 top-1/2 -translate-y-1/2',
                right: 'left-0 top-1/2 -translate-y-1/2',
              })} />
            </div>
          </motion.div>,
          document.body
        )}
      </AnimatePresence>
    </>
  );
}