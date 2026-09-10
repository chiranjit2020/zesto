import { LazyMotion, domAnimation, MotionConfig, m, AnimatePresence } from 'framer-motion';
import type { Variants, Transition } from 'framer-motion';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

export { m, AnimatePresence };
export { useReducedMotion } from 'framer-motion';

/** motion-enabled <Link> for animated, client-routed cards */
export const MotionLink = m.create(Link);

/** Wrap the app once. LazyMotion keeps the bundle small (~21 KB); `strict` forces `m.*`
 *  (not `motion.*`) so we never accidentally pull the full feature set. reducedMotion
 *  "user" makes every animation below respect the OS setting automatically. */
export function MotionProvider({ children }: { children: ReactNode }) {
  return (
    <LazyMotion features={domAnimation} strict>
      <MotionConfig reducedMotion="user" transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}>
        {children}
      </MotionConfig>
    </LazyMotion>
  );
}

export const spring: Transition = { type: 'spring', stiffness: 380, damping: 30, mass: 0.7 };
export const softSpring: Transition = { type: 'spring', stiffness: 220, damping: 26 };

export const pageVariants: Variants = {
  initial: { opacity: 0, y: 10 },
  enter: { opacity: 1, y: 0, transition: { duration: 0.26, ease: [0.22, 1, 0.36, 1] } },
  exit: { opacity: 0, y: -8, transition: { duration: 0.16, ease: 'easeIn' } },
};

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.32, ease: [0.22, 1, 0.36, 1] } },
};

export const popIn: Variants = {
  hidden: { opacity: 0, scale: 0.9 },
  show: { opacity: 1, scale: 1, transition: spring },
};

const staggerParent: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05, delayChildren: 0.02 } },
};

/** Fade-and-rise a group of children in sequence. Use <StaggerItem> for each child. */
export function Stagger({
  children,
  className,
  amount = 0.15,
  once = true,
  as: _as,
}: {
  children: ReactNode;
  className?: string;
  amount?: number;
  once?: boolean;
  as?: never;
}) {
  return (
    <m.div
      className={className}
      variants={staggerParent}
      initial="hidden"
      whileInView="show"
      viewport={{ once, amount }}
    >
      {children}
    </m.div>
  );
}

export function StaggerItem({
  children,
  className,
  variants = fadeUp,
}: {
  children: ReactNode;
  className?: string;
  variants?: Variants;
}) {
  return (
    <m.div className={className} variants={variants}>
      {children}
    </m.div>
  );
}

/** One-shot fade-up on mount (for a single element, not a list). */
export function Reveal({
  children,
  className,
  delay = 0,
  y = 12,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  y?: number;
}) {
  return (
    <m.div
      className={className}
      initial={{ opacity: 0, y }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1], delay }}
    >
      {children}
    </m.div>
  );
}
