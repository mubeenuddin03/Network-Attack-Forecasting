import type { Transition, Variants } from 'framer-motion';

/** Cohesive easing curve used across the whole dashboard (soft, confident). */
export const EASE_OUT: [number, number, number, number] = [0.22, 1, 0.36, 1];

/** Slight overshoot easing for playful, "lovable" micro-interactions. */
export const EASE_SPRING: [number, number, number, number] = [0.34, 1.56, 0.64, 1];

/** Smooth spring for transforms (cards, tilts, pop-ins). */
export const SPRING_SMOOTH: Transition = {
  type: 'spring',
  stiffness: 260,
  damping: 30,
  mass: 0.8,
};

/** Gentle spring for larger surfaces. */
export const SPRING_GENTLE: Transition = {
  type: 'spring',
  stiffness: 180,
  damping: 24,
};

/** Single-element entrance: fade + lift + subtle de-blur. */
export const fadeUpItem: Variants = {
  hidden: { opacity: 0, y: 24, filter: 'blur(4px)' },
  visible: (delay: number = 0) => ({
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: { duration: 0.5, ease: EASE_OUT, delay },
  }),
};
