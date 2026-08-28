import { ReactNode, forwardRef, ButtonHTMLAttributes } from 'react';
import { cn } from '@/utils/helpers';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'icon';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  loading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', loading, leftIcon, rightIcon, disabled, children, ...props }, ref) => {
    const baseStyles = 'inline-flex items-center justify-center gap-2 font-medium transition-all duration-200 ease-spring focus-visible:ring-2 focus-visible:ring-electric-500 focus-visible:ring-offset-2 focus-visible:ring-offset-surface-950 disabled:opacity-50 disabled:cursor-not-allowed';

    const variants = {
      primary: 'bg-electric-600 text-white hover:bg-electric-500 hover:shadow-glow-md active:scale-[0.98] active:bg-electric-700',
      secondary: 'bg-surface-800 text-text-primary border border-border-default hover:bg-surface-700 hover:border-border-strong active:scale-[0.98]',
      ghost: 'text-text-secondary hover:bg-surface-800 hover:text-text-primary active:scale-[0.98]',
      icon: 'p-2 text-text-secondary rounded-lg hover:bg-surface-800 hover:text-text-primary active:scale-[0.95]',
    };

    const sizes = {
      sm: 'px-3 py-1.5 text-caption',
      md: 'px-5 py-2.5 text-body-sm',
      lg: 'px-6 py-3 text-body',
      icon: 'p-2 w-9 h-9',
    };

    return (
      <button
        ref={ref}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        disabled={disabled || loading}
        {...props}
      >
        {loading ? (
          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        ) : (
          <>
            {leftIcon && <span className="flex-shrink-0">{leftIcon}</span>}
            {children}
            {rightIcon && <span className="flex-shrink-0">{rightIcon}</span>}
          </>
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';