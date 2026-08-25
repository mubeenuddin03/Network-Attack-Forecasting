import { ReactNode, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';
import { cn } from '@/utils/helpers';
import { useSound } from '@/contexts/SoundContext';
import { useReducedMotion } from '@/contexts/ReducedMotionContext';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  closeOnOverlayClick?: boolean;
  closeOnEscape?: boolean;
  showCloseButton?: boolean;
  className?: string;
}

export function Modal({
  isOpen,
  onClose,
  title,
  description,
  children,
  size = 'md',
  closeOnOverlayClick = true,
  closeOnEscape = true,
  showCloseButton = true,
  className,
}: ModalProps) {
  const { play } = useSound();
  const { reducedMotion } = useReducedMotion();
  const previousActiveElement = useRef<HTMLElement | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  const sizes = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    full: 'max-w-[90vw]',
  };

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!closeOnEscape) return;
    if (e.key === 'Escape') {
      play('click');
      onClose();
    }
    if (e.key === 'Tab') {
      const focusableElements = modalRef.current?.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (focusableElements && focusableElements.length > 0) {
        const items = Array.from(focusableElements);
        const first = items[0];
        const last = items[items.length - 1];
        if (first && last) {
          if (e.shiftKey && document.activeElement === first) {
            e.preventDefault();
            last.focus();
          } else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    }
  }, [closeOnEscape, onClose, play]);

  useEffect(() => {
    if (isOpen) {
      previousActiveElement.current = document.activeElement as HTMLElement;
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
      const modal = modalRef.current;
      modal?.focus();
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

  const modalContent = (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: reducedMotion ? 0 : 200 }}
      className="fixed inset-0 z-[500] bg-black/60 backdrop-blur-sm"
      onClick={closeOnOverlayClick ? () => { play('click'); onClose(); } : undefined}
      aria-hidden="true"
    />
  );

  const modalDialog = (
    <motion.div
      ref={modalRef}
      initial={{ opacity: 0, scale: 0.95, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: reducedMotion ? 0 : 300, ease: [0.34, 1.56, 0.64, 1] }}
      className={cn(
        'fixed inset-0 z-[500] flex items-center justify-center p-4',
        'glass-panel-strong rounded-2xl shadow-glow-lg',
        sizes[size],
        'w-full max-h-[90vh] overflow-hidden flex-col',
        className
      )}
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? 'modal-title' : undefined}
      aria-describedby={description ? 'modal-description' : undefined}
    >
      {(title || showCloseButton) && (
        <div className="flex items-start justify-between p-5 border-b border-border-subtle flex-shrink-0">
          <div>
            {title && (
              <h2 id="modal-title" className="text-heading-md text-text-primary font-semibold">
                {title}
              </h2>
            )}
            {description && (
              <p id="modal-description" className="text-body-sm text-text-muted mt-1">
                {description}
              </p>
            )}
          </div>
          {showCloseButton && (
            <button
              onClick={() => { play('click'); onClose(); }}
              className="btn-icon p-1.5 ml-4 flex-shrink-0"
              aria-label="Close modal"
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
  );

  return createPortal(<>{modalContent}{modalDialog}</>, document.body);
}