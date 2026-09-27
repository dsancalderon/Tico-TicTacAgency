import {
  useState,
  useRef,
  type HTMLAttributes,
  type ReactNode,
  type MouseEvent,
  type CSSProperties,
} from 'react';
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
 * Manages fan-out entrance emerging from center card,
 * and smooth interactive 3D perspective tilt on hover.
 */
export function AnimatedCard({
  index,
  inView: externalInView,
  children,
  className = '',
  style,
  onMouseMove,
  onMouseEnter,
  onMouseLeave,
  ...props
}: AnimatedCardProps) {
  const [internalRef, internalInView] = useInView<HTMLDivElement>({
    threshold: 0.15,
    triggerOnce: true,
  });
  const prefersReducedMotion = usePrefersReducedMotion();
  const cardRef = useRef<HTMLDivElement | null>(null);

  const isRevealed =
    prefersReducedMotion ||
    (externalInView !== undefined ? externalInView : internalInView);

  const slotClass = `mockup-slot-${index % 3}`;

  // 3D Tilt State
  const [isHovered, setIsHovered] = useState(false);
  const [tilt, setTilt] = useState({ x: 0, y: 0, glareX: 50, glareY: 50 });

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    if (prefersReducedMotion) return;
    const target = cardRef.current;
    if (!target) return;
    const rect = target.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;

    // Gentle 3D tilt clamped to ±6°
    const tiltX = (0.5 - y) * 7;
    const tiltY = (x - 0.5) * 7;

    setTilt({
      x: tiltX,
      y: tiltY,
      glareX: Math.round(x * 100),
      glareY: Math.round(y * 100),
    });

    onMouseMove?.(e);
  };

  const handleMouseEnter = (e: MouseEvent<HTMLDivElement>) => {
    setIsHovered(true);
    onMouseEnter?.(e);
  };

  const handleMouseLeave = (e: MouseEvent<HTMLDivElement>) => {
    setIsHovered(false);
    setTilt({ x: 0, y: 0, glareX: 50, glareY: 50 });
    onMouseLeave?.(e);
  };

  // Base straightened rotation & lift on desktop hover
  const baseStraighten = index === 0 ? -2 : index === 2 ? 2 : 0;
  const baseY = index === 1 ? -8 : 20;

  // Active 3D tilt style when hovered on revealed desktop
  const activeHoverStyle: CSSProperties =
    isRevealed && isHovered && !prefersReducedMotion
      ? {
          zIndex: 30,
          transform: `translateY(${baseY}px) rotate(${baseStraighten}deg) perspective(1000px) rotateX(${tilt.x.toFixed(
            2
          )}deg) rotateY(${tilt.y.toFixed(2)}deg) scale3d(1.02, 1.02, 1.02)`,
          transition: 'transform 90ms ease-out, box-shadow 250ms ease-out',
          ...style,
        }
      : style || {};

  return (
    <div
      ref={(node) => {
        cardRef.current = node;
        if (externalInView === undefined && internalRef) {
          (internalRef as unknown as { current: HTMLDivElement | null }).current = node;
        }
      }}
      className={`mockup-fan-card ${slotClass} ${isRevealed ? 'is-revealed' : ''} ${className}`}
      style={activeHoverStyle}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      {...props}
    >
      <div className="relative w-full h-full [transform-style:preserve-3d]">
        {children}

        {/* Soft 3D glare sheen following cursor */}
        {isHovered && !prefersReducedMotion && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 z-20 rounded-2xl transition-opacity duration-200"
            style={{
              background: `radial-gradient(circle 350px at ${tilt.glareX}% ${tilt.glareY}%, rgba(255, 255, 255, 0.22) 0%, transparent 65%)`,
            }}
          />
        )}
      </div>
    </div>
  );
}
