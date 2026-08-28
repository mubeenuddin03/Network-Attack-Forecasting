import { ReactNode, forwardRef, InputHTMLAttributes, TextareaHTMLAttributes, LabelHTMLAttributes } from 'react';
import { cn } from '@/utils/helpers';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, hint, leftIcon, rightIcon, id, ...props }, ref) => {
    const inputId = id || `input-${Math.random().toString(36).slice(2, 9)}`;
    const errorId = `${inputId}-error`;
    const hintId = `${inputId}-hint`;

    return (
      <div className="w-full">
        {label && (
          <label htmlFor={inputId} className="block text-body-sm font-medium text-text-secondary mb-1.5">
            {label}
          </label>
        )}
        <div className="relative">
          {leftIcon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none">
              {leftIcon}
            </div>
          )}
          <input
            ref={ref}
            id={inputId}
            className={cn(
              'w-full bg-surface-800 border border-border-default rounded-lg text-text-primary placeholder-text-muted transition-all duration-200',
              'focus:outline-none focus:ring-2 focus:ring-electric-500 focus:ring-offset-2 focus:ring-offset-surface-950 focus:border-transparent',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              'hover:border-border-strong',
              leftIcon ? 'pl-10' : 'pl-4',
              rightIcon ? 'pr-10' : 'pr-4',
              'py-2.5 text-body-sm',
              error && 'border-critical-500 focus:ring-critical-500',
              className
            )}
            aria-invalid={error ? 'true' : 'false'}
            aria-describedby={error ? errorId : hint ? hintId : undefined}
            {...props}
          />
          {rightIcon && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none">
              {rightIcon}
            </div>
          )}
        </div>
        {error && (
          <p id={errorId} className="mt-1.5 text-caption text-critical-400" role="alert">{error}</p>
        )}
        {hint && !error && (
          <p id={hintId} className="mt-1.5 text-caption text-text-muted">{hint}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, hint, id, ...props }, ref) => {
    const inputId = id || `textarea-${Math.random().toString(36).slice(2, 9)}`;
    const errorId = `${inputId}-error`;
    const hintId = `${inputId}-hint`;

    return (
      <div className="w-full">
        {label && (
          <label htmlFor={inputId} className="block text-body-sm font-medium text-text-secondary mb-1.5">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={inputId}
          className={cn(
            'w-full bg-surface-800 border border-border-default rounded-lg text-text-primary placeholder-text-muted transition-all duration-200 resize-y min-h-[100px]',
            'focus:outline-none focus:ring-2 focus:ring-electric-500 focus:ring-offset-2 focus:ring-offset-surface-950 focus:border-transparent',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            'hover:border-border-strong',
            'p-4 text-body-sm',
            error && 'border-critical-500 focus:ring-critical-500',
            className
          )}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={error ? errorId : hint ? hintId : undefined}
          {...props}
        />
        {error && (
          <p id={errorId} className="mt-1.5 text-caption text-critical-400" role="alert">{error}</p>
        )}
        {hint && !error && (
          <p id={hintId} className="mt-1.5 text-caption text-text-muted">{hint}</p>
        )}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';

export interface LabelProps extends LabelHTMLAttributes<HTMLLabelElement> {}

export const Label = forwardRef<HTMLLabelElement, LabelProps>(
  ({ className, children, ...props }, ref) => (
    <label ref={ref} className={cn('block text-body-sm font-medium text-text-secondary mb-1.5', className)} {...props}>
      {children}
    </label>
  )
);

Label.displayName = 'Label';