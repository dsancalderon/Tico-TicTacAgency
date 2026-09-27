import { useState, useRef, type MouseEvent } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';

export interface AnimatedCardProps {
  index: number;
  inView: boolean;
  image: {
    src: string;
    alt: string;
    title: string;
    description: string;
  };
  className?: string;
}

/**
 * AnimatedCard for Hero-10:
 * - Entrance: Side cards emerge directly from behind the center card (fan-out).
 * - Hover: Smooth 3D tilt with spring physics, cursor glare, elevation, and straightened rotation.
 */
export function AnimatedCard({
  index,
  inView,
  image,
  className = '',
}: AnimatedCardProps) {
  const cardRef = useRef<HTMLDivElement | null>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [glare, setGlare] = useState({ x: 50, y: 50 });

  // Spring physics for buttery 3D mouse tilt
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const rotateX = useSpring(useTransform(mouseY, [-0.5, 0.5], [6, -6]), {
    stiffness: 260,
    damping: 22,
  });
  const rotateY = useSpring(useTransform(mouseX, [-0.5, 0.5], [-6, 6]), {
    stiffness: 260,
    damping: 22,
  });

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    const el = cardRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const xPct = (e.clientX - rect.left) / rect.width;
    const yPct = (e.clientY - rect.top) / rect.height;
    mouseX.set(xPct - 0.5);
    mouseY.set(yPct - 0.5);
    setGlare({ x: Math.round(xPct * 100), y: Math.round(yPct * 100) });
  };

  const handleMouseEnter = () => {
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    mouseX.set(0);
    mouseY.set(0);
  };

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;

  // On desktop:
  // Card 0 (Left): starts tucked behind center card (+100% X offset)
  // Card 1 (Center): starts at center
  // Card 2 (Right): starts tucked behind center card (-100% X offset)
  const initialVariant = {
    opacity: 0,
    x: isMobile
      ? 0
      : index === 0
      ? 'calc(100% - 1.75rem)'
      : index === 2
      ? 'calc(-100% + 1.75rem)'
      : 0,
    y: isMobile ? 24 : index === 1 ? 32 : 0,
    rotate: 0,
    scale: 0.94,
  };

  const deployedVariant = {
    opacity: 1,
    x: 0,
    y: isMobile ? 0 : index === 1 ? 0 : 28,
    rotate: isMobile ? 0 : index === 0 ? -6 : index === 2 ? 6 : 0,
    scale: 1,
    transition: {
      duration: 0.85,
      delay: isMobile ? index * 0.12 : index === 1 ? 0.05 : 0.22,
      ease: [0.16, 1, 0.3, 1],
    },
  };

  const hoverStraighten = index === 0 ? -2 : index === 2 ? 2 : 0;
  const hoverY = index === 1 ? -10 : 18;

  return (
    <motion.div
      ref={cardRef}
      className={`relative shrink-0 snap-center ${className}`}
      initial={initialVariant}
      animate={inView ? deployedVariant : initialVariant}
      whileHover={
        isMobile
          ? undefined
          : {
              y: hoverY,
              rotate: hoverStraighten,
              scale: 1.025,
              zIndex: 35,
              transition: { duration: 0.24, ease: 'easeOut' },
            }
      }
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{
        zIndex: isHovered ? 35 : index === 1 ? 20 : 10,
        marginRight: !isMobile && index === 0 ? '-1.75rem' : 0,
        marginLeft: !isMobile && index === 2 ? '-1.75rem' : 0,
        transformStyle: 'preserve-3d',
      }}
    >
      <motion.div
        className="relative w-full h-full"
        style={{
          rotateX: isHovered && !isMobile ? rotateX : 0,
          rotateY: isHovered && !isMobile ? rotateY : 0,
          transformStyle: 'preserve-3d',
        }}
      >
        <div
          className={`overflow-hidden rounded-2xl border border-white bg-white transition-shadow duration-300 ${
            isHovered
              ? 'shadow-[0_32px_75px_-18px_rgba(10,25,79,0.42)] ring-2 ring-indigo-200'
              : 'shadow-[0_18px_50px_-20px_#0a194f55] ring-1 ring-blue-100'
          }`}
        >
          <img
            src={image.src}
            alt={image.alt}
            width={1122}
            height={1402}
            loading="lazy"
            decoding="async"
            className="block aspect-4/5 w-full object-cover"
          />

          {/* Dynamic 3D Glare sheen following cursor */}
          {isHovered && !isMobile && (
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 z-30 rounded-2xl transition-opacity duration-200"
              style={{
                background: `radial-gradient(circle 350px at ${glare.x}% ${glare.y}%, rgba(255, 255, 255, 0.28) 0%, transparent 65%)`,
              }}
            />
          )}
        </div>

        <figcaption className="px-2 pt-5 text-center sm:hidden">
          <h3 className="text-sm font-bold text-[#0a194f]">
            0{index + 1} / {image.title}
          </h3>
          <p className="mt-1 text-xs leading-relaxed text-slate-600">
            {image.description}
          </p>
        </figcaption>
      </motion.div>
    </motion.div>
  );
}
