import { useEffect, useRef } from 'react';
import { animate, motion, useAnimationFrame, useMotionValue, useTransform } from 'framer-motion';
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion';

export function GoogleAdsLogoAnimated({ active = false, pending = false, className = 'h-9 w-9 shrink-0 overflow-visible' }: {
  active?: boolean; pending?: boolean; className?: string;
}) {
  const reducedMotion = usePrefersReducedMotion();
  const opening = useMotionValue(0);
  // 60 SVG units correspond to 8.6 CSS pixels at the card's 36px icon size.
  const leftX = useTransform(opening, value => -60 * value);
  const rightX = useTransform(opening, value => 60 * value);
  const circleY = useMotionValue(0);
  const physics = useRef({ falling: false, velocity: 0, bounces: 0 });
  const wasActive = useRef(false);

  useEffect(() => {
    let cancelled = false;
    physics.current.falling = false;
    opening.stop();
    circleY.stop();
    if (reducedMotion) {
      opening.set(0);
      circleY.set(0);
      wasActive.current = false;
      return;
    }
    const run = async () => {
      if (active) {
        wasActive.current = true;
        // Lift the seated circle as the casing opens, then release it.
        await Promise.all([
          animate(opening, 1, { type: 'spring', stiffness: 600, damping: 32, restDelta: 0.015, restSpeed: 0.15 }),
          animate(circleY, -45, { duration: 0.16, ease: 'easeOut' }),
        ]);
        if (!cancelled) physics.current = { falling: true, velocity: 0, bounces: 0 };
      } else if (wasActive.current) {
        await animate(circleY, -45, { duration: 0.12, ease: 'easeOut' });
        if (cancelled) return;
        await Promise.all([
          animate(opening, 0, { duration: 0.18, ease: 'easeInOut' }),
          animate(circleY, 0, { duration: 0.18, ease: 'easeInOut' }),
        ]);
      }
    };
    void run();
    return () => {
      cancelled = true;
      physics.current.falling = false;
      opening.stop();
      circleY.stop();
    };
  }, [active, reducedMotion, opening, circleY]);

  useAnimationFrame((_, delta) => {
    const state = physics.current;
    if (reducedMotion || !active || !state.falling) return;
    // Bounded substeps keep gravity stable after a slow frame or background tab.
    let remaining = Math.min(delta / 1000, 0.04);
    while (remaining > 0 && state.falling) {
      const dt = Math.min(remaining, 1 / 240);
      remaining -= dt;
      state.velocity += 1600 * dt;
      const next = circleY.get() + state.velocity * dt;
      if (next >= 0) {
        circleY.set(0);
        state.bounces += 1;
        state.velocity *= -0.3;
        if (state.bounces >= 3) state.falling = false;
      } else circleY.set(next);
    }
  });

  return (
    <svg viewBox="0 0 251 226" className={className} aria-hidden="true" fill="none">
      <motion.g className="tico-network-pill-right" data-part="pill-right" style={{ x: reducedMotion ? 0 : rightX }}>
        <path d={rightPill} fill={pending ? '#8491A3' : '#3C8BD9'} />
      </motion.g>
      <motion.g className="tico-network-pill-left" data-part="pill-left" style={{ x: reducedMotion ? 0 : leftX }}>
        <path d={leftPill} fill={pending ? '#BBC3CE' : '#FABC04'} />
        <motion.g data-part="inner-circle" style={{ y: reducedMotion ? 0 : circleY }}>
          <path d={circle} fill={pending ? '#69778B' : '#34A852'} />
        </motion.g>
      </motion.g>
    </svg>
  );
}

// Geometry already owned by BrandLogos.tsx, split into independently moving pieces.
const rightPill = 'M85.9 28.6c2.4-6.3 5.7-12.1 10.6-16.8 19.6-19.1 52-14.3 65.3 9.7 10 18.2 20.6 36 30.9 54 17.2 29.9 34.6 59.8 51.6 89.8 14.3 25.1-1.2 56.8-29.6 61.1-17.4 2.6-33.7-5.4-42.7-21-15.1-26.3-30.3-52.6-45.4-78.8-0.3-0.6-0.7-1.1-1.1-1.6-1.6-1.3-2.3-3.2-3.3-4.9-6.7-11.8-13.6-23.5-20.3-35.2-4.3-7.6-8.8-15.1-13.1-22.7-3.9-6.8-5.7-14.2-5.5-22 0-3.8 0.5-7.8 2.3-11.4z';
const leftPill = 'M85.9 28.6c-0.9 3.6-1.7 7.2-1.9 11-0.3 8.4 1.8 16.2 6 23.5 11 18.9 22 37.9 32.9 56.9 1 1.7 1.8 3.4 2.8 5-6 10.4-12 20.7-18.1 31.1-8.4 14.5-16.8 29.1-25.3 43.6-0.4 0-0.5-0.2-0.6-0.5-0.1-0.8 0.2-1.5 0.4-2.3 4.1-15 0.7-28.3-9.6-39.7-6.3-6.9-14.3-10.8-23.5-12.1-12-1.7-22.6 1.4-32.1 8.9-1.7 1.3-2.8 3.2-4.8 4.2-0.4 0-0.6-0.2-0.7-0.5 4.8-8.3 9.5-16.6 14.3-24.9 16.4-28.4 36.2-62.8 56.1-97.1 0.2-0.4 0.5-0.7 0.7-1.1z';
const circle = 'M11.8 158c1.9-1.7 3.7-3.5 5.7-5.1 24.3-19.2 60.8-5.3 66.1 25.1 1.3 7.3 0.6 14.3-1.6 21.3-0.1 0.6-0.2 1.1-0.4 1.7-0.9 1.6-1.7 3.3-2.7 4.9-8.9 14.7-22 22-39.2 20.9-19.7-1.5-35.2-16.3-37.9-35.9-1.3-9.5 0.6-18.4 5.5-26.6 1-1.8 2.2-3.4 3.3-5.2 0.8-0.9 0.6-1.7 1.5-1.7z';
