import { HTMLAttributes, forwardRef } from 'react';
import { cn } from '@/utils/helpers';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'elevated' | 'strong' | 'interactive';
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant = 'default', padding = 'md', children, ...props }, ref) => {
    const variants = {
      default: 'glass-panel',
      elevated: 'glass-panel-elevated',
      strong: 'glass-panel-strong',
      interactive: 'glass-panel kpi-card cursor-pointer',
    };

    const paddings = {
      none: '',
      sm: 'p-3',
      md: 'p-5',
      lg: 'p-6',
    };

    return (
      <div
        ref={ref}
        className={cn('rounded-2xl', variants[variant], paddings[padding], className)}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';

export interface CardHeaderProps extends HTMLAttributes<HTMLDivElement> {}

export const CardHeader = forwardRef<HTMLDivElement, CardHeaderProps>(
  ({ className, children, ...props }, ref) => (
    <div ref={ref} className={cn('mb-4', className)} {...props}>{children}</div>
  )
);

CardHeader.displayName = 'CardHeader';

export interface CardTitleProps extends HTMLAttributes<HTMLHeadingElement> {}

export const CardTitle = forwardRef<HTMLHeadingElement, CardTitleProps>(
  ({ className, children, ...props }, ref) => (
    <h3 ref={ref} className={cn('text-heading-md text-text-primary font-semibold', className)} {...props}>{children}</h3>
  )
);

CardTitle.displayName = 'CardTitle';

export interface CardDescriptionProps extends HTMLAttributes<HTMLParagraphElement> {}

export const CardDescription = forwardRef<HTMLParagraphElement, CardDescriptionProps>(
  ({ className, children, ...props }, ref) => (
    <p ref={ref} className={cn('text-body-sm text-text-muted mt-1', className)} {...props}>{children}</p>
  )
);

CardDescription.displayName = 'CardDescription';

export interface CardContentProps extends HTMLAttributes<HTMLDivElement> {}

export const CardContent = forwardRef<HTMLDivElement, CardContentProps>(
  ({ className, children, ...props }, ref) => (
    <div ref={ref} className={cn(className)} {...props}>{children}</div>
  )
);

CardContent.displayName = 'CardContent';

export interface CardFooterProps extends HTMLAttributes<HTMLDivElement> {}

export const CardFooter = forwardRef<HTMLDivElement, CardFooterProps>(
  ({ className, children, ...props }, ref) => (
    <div ref={ref} className={cn('mt-4 pt-4 border-t border-border-subtle flex items-center gap-3', className)} {...props}>{children}</div>
  )
);

CardFooter.displayName = 'CardFooter';