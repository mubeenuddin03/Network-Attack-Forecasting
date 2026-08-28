import { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { useReducedMotion } from '@/contexts/ReducedMotionContext';
import { EASE_OUT } from '@/utils/motion';

interface RevealProps {
  children: ReactNode;
  className?: string;
  delay?: number;
}

/**
 * Scroll-triggered entrance: fades in and slides up once the element
 * scrolls into view. Respects the user's reduced-motion preference.
 */
export function Reveal({ children, className, delay = 0 }: RevealProps) {
  const { reducedMotion } = useReducedMotion();

  if (reducedMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.6, ease: EASE_OUT, delay }}
    >
      {children}
    </motion.div>
  );
}

interface RevealItemProps {
  children: ReactNode;
  className?: string;
  delay?: number;
}

/**
 * Self-contained entrance used for grid/card items. Fades + lifts + de-blurs
 * on scroll-into-view and resolves to a static node under reduced motion.
 */
export function RevealItem({ children, className, delay = 0 }: RevealItemProps) {
  const { reducedMotion } = useReducedMotion();

  if (reducedMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={className}
      variants={{
        hidden: { opacity: 0, y: 24, filter: 'blur(4px)' },
        visible: {
          opacity: 1,
          y: 0,
          filter: 'blur(0px)',
          transition: { duration: 0.5, ease: EASE_OUT, delay },
        },
      }}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-60px' }}
    >
      {children}
    </motion.div>
  );
}
