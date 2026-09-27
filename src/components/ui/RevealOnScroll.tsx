import type { ElementType, ReactNode, HTMLAttributes, CSSProperties } from 'react';
import { useInView } from '../../hooks/useInView';
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion';

export interface RevealOnScrollProps extends HTMLAttributes<HTMLElement> {
  children: ReactNode;
  as?: ElementType;
  inView?: boolean;
  delay?: number; // Delay in milliseconds
  duration?: number; // Duration in milliseconds
  yOffset?: number; // Distance in pixels to translate on Y axis
  threshold?: number;
  triggerOnce?: boolean;
  className?: string;
  style?: CSSProperties;
}

/**
 * Reusable scroll reveal component for headings, paragraphs, and text blocks.
 * Uses hardware-accelerated opacity & translateY transitions with ease-out-expo timing.
 * Gracefully degrades with zero layout shift for users with prefers-reduced-motion.
 */
export function RevealOnScroll({
  children,
  as: Component = 'div',
  inView: externalInView,
  delay = 0,
  duration = 550,
  yOffset = 18,
  threshold = 0.2,
  triggerOnce = true,
  className = '',
  style = {},
  ...rest
}: RevealOnScrollProps) {
  const [internalRef, internalInView] = useInView<HTMLElement>({
    threshold,
    triggerOnce,
  });
  const prefersReducedMotion = usePrefersReducedMotion();

  const isVisible =
    prefersReducedMotion ||
    (externalInView !== undefined ? externalInView : internalInView);

  const transitionStyle: CSSProperties = prefersReducedMotion
    ? {
        opacity: 1,
        transform: 'none',
        transition: 'none',
        ...style,
      }
    : {
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'translateY(0)' : `translateY(${yOffset}px)`,
        transitionProperty: 'opacity, transform',
        transitionDuration: `${duration}ms`,
        transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
        transitionDelay: `${delay}ms`,
        willChange: isVisible ? 'auto' : 'opacity, transform',
        ...style,
      };

  return (
    <Component
      ref={externalInView !== undefined ? undefined : internalRef}
      className={className}
      style={transitionStyle}
      {...rest}
    >
      {children}
    </Component>
  );
}
