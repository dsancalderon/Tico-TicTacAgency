import type { HTMLAttributes, ReactNode } from 'react';
import { useInView } from '../../hooks/useInView';
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion';

export interface AnimatedCardProps extends HTMLAttributes<HTMLDivElement> {
  index: number;
  inView?: boolean;
  children: ReactNode;
  className?: string;
}

/**
 * Reusable animated card component for fan mockups.
 * Manages scroll reveal stagger, initial-to-final rotation,
 * and hover elevation with rotation straightening ("salir del montón").
 */
export function AnimatedCard({
  index,
  inView: externalInView,
  children,
  className = '',
  ...props
}: AnimatedCardProps) {
  const [internalRef, internalInView] = useInView<HTMLDivElement>({
    threshold: 0.2,
    triggerOnce: true,
  });
  const prefersReducedMotion = usePrefersReducedMotion();

  const isRevealed =
    prefersReducedMotion ||
    (externalInView !== undefined ? externalInView : internalInView);

  const slotClass = `mockup-slot-${index % 3}`;

  return (
    <div
      ref={externalInView !== undefined ? undefined : internalRef}
      className={`mockup-fan-card ${slotClass} ${isRevealed ? 'is-revealed' : ''} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
