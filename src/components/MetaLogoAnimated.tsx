import { useEffect } from 'react';
import { easeInOut, motion, useAnimationFrame, useMotionValue, useTransform } from 'framer-motion';
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion';

/** Original continuous centerline; no downloaded brand artwork. */
const infinity = 'M18 18 C13 9 10 6 7 9 C4 12 1 24 6 25 C11 27 14 16 18 12 C23 5 27 7 30 13 C33 19 35 25 30 25 C25 26 22 23 18 18 Z';

export function MetaLogoAnimated({ active = false, className = 'h-9 w-9 shrink-0' }: { active?: boolean; className?: string }) {
  const reducedMotion = usePrefersReducedMotion();
  const elapsed = useMotionValue(0.7);
  const pathLength = useTransform(elapsed, [0, 0.7], [0, 1], { ease: easeInOut });

  useEffect(() => {
    elapsed.set(active && !reducedMotion ? 0 : 0.7);
  }, [active, reducedMotion, elapsed]);

  useAnimationFrame((_, delta) => {
    if (active && !reducedMotion && elapsed.get() < 0.7) {
      elapsed.set(Math.min(0.7, elapsed.get() + delta / 1000));
    }
  });

  return (
    <svg viewBox="0 0 36 36" className={className} aria-hidden="true" fill="none">
      <motion.path className="tico-network-meta-trace" d={infinity} stroke="#0866FF"
        strokeWidth="3.3" strokeLinecap="round" strokeLinejoin="round"
        style={{ pathLength: reducedMotion ? 1 : pathLength }} />
    </svg>
  );
}
