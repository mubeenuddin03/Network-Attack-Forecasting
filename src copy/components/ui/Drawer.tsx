import { ReactNode, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';
import { cn } from '@/utils/helpers';
import { useSound } from '@/contexts/SoundContext';
import { useReducedMotion } from '@/contexts/ReducedMotionContext';

interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: ReactNode;
  position?: 'left' | 'right' | 'bottom';
  size?: 'sm' | 'md' | 'lg' | 'full';
  closeOnOverlayClick?: boolean;
  closeOnEscape?: boolean;
  showCloseButton?: boolean;
  className?: string;
}

export function Drawer({
  isOpen,
  onClose,
  title,
  description,
  children,
  position = 'right',
  size = 'md',
  closeOnOverlayClick = true,
  closeOnEscape = true,
  showCloseButton = true,
  className,
}: DrawerProps) {
  const { play } = useSound();
  const { reducedMotion } = useReducedMotion();
  const previousActiveElement = useRef<HTMLElement | null>(null);
  const drawerRef = useRef<HTMLDivElement>(null);

  const sizes = {
    sm: position === 'bottom' ? 'h-[30vh]' : 'w-72',
    md: position === 'bottom' ? 'h-[50vh]' : 'w-96',
    lg: position === 'bottom' ? 'h-[70vh]' : 'w-[32rem]',
    full: position === 'bottom' ? 'h-[90vh]' : 'w-[42rem]',
  };

  const positions = {
    left: 'left-0 top-0 h-full',
    right: 'right-0 top-0 h-full',
    bottom: 'left-0 right-0 bottom-0',
  };

  const animateProps = {
    left: { initial: { x: -300 }, exit: { x: -300 } },
    right: { initial: { x: 300 }, exit: { x: 300 } },
    bottom: { initial: { y: 300 }, exit: { y: 300 } },
  };

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!closeOnEscape) return;
    if (e.key === 'Escape') {
      play('click');
      onClose();
    }
  }, [closeOnEscape, onClose, play]);

  useEffect(() => {
    if (isOpen) {
      previousActiveElement.current = document.activeElement as HTMLElement;
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
      drawerRef.current?.focus();
      play('refresh');
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
      if (previousActiveElement.current) {
        previousActiveElement.current.focus();
      }
    };
  }, [isOpen, handleKeyDown, play]);

  if (!isOpen) return null;

  return createPortal(
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: reducedMotion ? 0 : 200 }}
        className="fixed inset-0 z-[500] bg-black/60 backdrop-blur-sm"
        onClick={closeOnOverlayClick ? () => { play('click'); onClose(); } : undefined}
        aria-hidden="true"
      />
      <motion.div
        ref={drawerRef}
        initial={animateProps[position].initial}
        animate={{ x: 0, y: 0 }}
        transition={{ duration: reducedMotion ? 0 : 400, ease: [0.34, 1.56, 0.64, 1] }}
        className={cn(
          'fixed z-[500] flex flex-col',
          'glass-panel-strong shadow-glow-lg',
          positions[position],
          sizes[size],
          'max-h-full max-w-full overflow-hidden',
          className
        )}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? 'drawer-title' : undefined}
        aria-describedby={description ? 'drawer-description' : undefined}
      >
        {(title || showCloseButton) && (
          <div className="flex items-start justify-between p-5 border-b border-border-subtle flex-shrink-0">
            <div>
              {title && (
                <h2 id="drawer-title" className="text-heading-md text-text-primary font-semibold">
                  {title}
                </h2>
              )}
              {description && (
                <p id="drawer-description" className="text-body-sm text-text-muted mt-1">
                  {description}
                </p>
              )}
            </div>
            {showCloseButton && (
              <button
                onClick={() => { play('click'); onClose(); }}
                className="btn-icon p-1.5 ml-4 flex-shrink-0"
                aria-label="Close drawer"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        )}
        <div className="flex-1 overflow-y-auto p-5">
          {children}
        </div>
      </motion.div>
    </>,
    document.body
  );
}