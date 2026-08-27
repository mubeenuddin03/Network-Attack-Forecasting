import { ReactNode } from 'react';
import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
  useMotionTemplate,
} from 'framer-motion';
import { cn } from '@/utils/helpers';
import { useReducedMotion } from '@/contexts/ReducedMotionContext';

interface TiltCardProps {
  children: ReactNode;
  className?: string;
  intensity?: number;
  glow?: 'indigo' | 'cyan' | 'red' | 'purple';
}

const GLOW_RGB: Record<NonNullable<TiltCardProps['glow']>, string> = {
  indigo: '124, 92, 246',
  cyan: '56, 189, 248',
  purple: '192, 132, 252',
  red: '248, 113, 113',
};

/**
 * Wraps a panel/card with a dynamic 3D tilt (rotateX / rotateY) that tracks
 * the cursor, plus a soft neon spotlight glow that follows the pointer. All 3D
 * and glow transforms are disabled when the user prefers reduced motion.
 */
export function TiltCard({ children, className, intensity = 6, glow = 'indigo' }: TiltCardProps) {
  const { reducedMotion } = useReducedMotion();
  const px = useMotionValue(0);
  const py = useMotionValue(0);
  const gx = useMotionValue(50);
  const gy = useMotionValue(50);

  const sx = useSpring(px, { stiffness: 220, damping: 18 });
  const sy = useSpring(py, { stiffness: 220, damping: 18 });
  const rotateX = useTransform(sy, [-0.5, 0.5], [`${intensity}deg`, `-${intensity}deg`]);
  const rotateY = useTransform(sx, [-0.5, 0.5], [`-${intensity}deg`, `${intensity}deg`]);

  const glowX = useTransform(gx, (v) => `${v}%`);
  const glowY = useTransform(gy, (v) => `${v}%`);
  const glowBg = useMotionTemplate`radial-gradient(300px circle at ${glowX} ${glowY}, rgba(${GLOW_RGB[glow]}, 0.18), transparent 60%)`;

  const handleMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (reducedMotion) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const w = rect.width || 1;
    const h = rect.height || 1;
    px.set((e.clientX - rect.left) / w - 0.5);
    py.set((e.clientY - rect.top) / h - 0.5);
    gx.set(((e.clientX - rect.left) / w) * 100);
    gy.set(((e.clientY - rect.top) / h) * 100);
  };

  const handleLeave = () => {
    px.set(0);
    py.set(0);
    gx.set(50);
    gy.set(50);
  };

  return (
    <motion.div
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      style={reducedMotion ? undefined : { rotateX, rotateY, transformStyle: 'preserve-3d' }}
      className={cn('relative group rounded-2xl overflow-hidden will-change-transform', className)}
    >
      {children}
      <div
        aria-hidden
        className={cn(
          'pointer-events-none absolute inset-0 rounded-2xl opacity-0 transition-opacity duration-300',
          !reducedMotion && 'group-hover:opacity-100',
        )}
        style={{ background: glowBg as unknown as string }}
      />
    </motion.div>
  );
}
