import { useState, useEffect, useRef } from 'react';
import { motion, useInView, type Variants } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import { Cta, type CtaProps } from './hero-10-utils/cta';
import { AnimatedCard } from './AnimatedCard';

export interface Hero10Props {
  id: string;
  eyebrow?: string;
  title: string;
  titleHighlight: string;
  description: string;
  images: readonly { src: string; alt: string; title: string; description: string }[];
  primaryCTA: CtaProps;
  secondaryCTA?: CtaProps;
}

const headerVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] },
  },
};

/**
 * Hero-10:
 * - Fan-out entrance: Cards emerge from behind the middle card.
 * - Interactive 3D hover: Spring physics tilt, lighting glare, lift & straightened angle.
 * - Sequential text reveal: 01/02/03 blocks appear smoothly AFTER the cards fan out.
 */
export function Hero10({
  id,
  eyebrow,
  title,
  titleHighlight,
  description,
  images,
  primaryCTA,
  secondaryCTA,
}: Hero10Props) {
  const sectionRef = useRef<HTMLElement | null>(null);
  const fanRef = useRef<HTMLDivElement | null>(null);

  // Trigger viewport when user scrolls near the elements
  const isFanInView = useInView(fanRef, { once: true, amount: 0.15 });

  // Sequential text animation: triggers after cards have finished opening
  const [cardsDeployed, setCardsDeployed] = useState(false);

  useEffect(() => {
    if (isFanInView) {
      // Fan cards deploy in ~800ms. Reveal text blocks right after they settle.
      const timer = setTimeout(() => {
        setCardsDeployed(true);
      }, 950);
      return () => clearTimeout(timer);
    }
  }, [isFanInView]);

  return (
    <section
      ref={sectionRef}
      id={id}
      aria-labelledby={`${id}-title`}
      className="relative isolate scroll-mt-20 overflow-hidden border-y border-blue-100/80 bg-[#f8faff] py-16 sm:py-24"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_60%,#e8e6ff_0%,transparent_65%)]"
      />
      <div className="relative mx-auto max-w-6xl px-5 sm:px-8">
        {/* Main Headers & Action CTAs */}
        <motion.div
          className="mx-auto flex max-w-3xl flex-col items-center gap-5 text-center"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          transition={{ staggerChildren: 0.08 }}
        >
          {eyebrow && (
            <motion.p
              variants={headerVariants}
              className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-white px-3.5 py-1.5 text-xs font-semibold text-[#0a194f]"
            >
              <Sparkles aria-hidden="true" className="h-3.5 w-3.5 text-indigo-500" />
              {eyebrow}
            </motion.p>
          )}

          <motion.h2
            id={`${id}-title`}
            variants={headerVariants}
            className="text-balance text-3xl font-extrabold tracking-tight text-[#0a194f] sm:text-5xl sm:leading-[1.12]"
          >
            {title}
            <br />
            <span className="bg-linear-to-r from-tico-blue to-tico-purple bg-clip-text text-transparent">
              {titleHighlight}
            </span>
          </motion.h2>

          <motion.p
            variants={headerVariants}
            className="max-w-xl text-pretty text-sm leading-relaxed text-slate-600 sm:text-base"
          >
            {description}
          </motion.p>

          <motion.div variants={headerVariants} className="mt-1 flex flex-wrap justify-center gap-3">
            <Cta {...primaryCTA} />
            {secondaryCTA && <Cta {...secondaryCTA} variant="outline" />}
          </motion.div>

          <motion.p variants={headerVariants} className="text-xs font-medium text-slate-500">
            Plan editable · Exportación a Excel · Revisión antes de activar
          </motion.p>
        </motion.div>

        {/* 1. Mockup Fan: Emerge from center card & 2. Interactive 3D Hover */}
        <div
          ref={fanRef}
          role="group"
          aria-label="Tres etapas del trabajo con Tico. Desliza para ver las imágenes en móvil."
          tabIndex={0}
          className="tico-method-fan -mx-5 mt-10 flex snap-x snap-mandatory items-start gap-4 overflow-x-auto px-5 pt-2 pb-8 focus-visible:outline-2 focus-visible:outline-blue-600 sm:mx-auto sm:mt-14 sm:max-w-[940px] sm:justify-center sm:gap-0 sm:overflow-visible sm:px-0 sm:pb-14 [perspective:1200px]"
        >
          {images.slice(0, 3).map((image, index) => (
            <AnimatedCard
              key={image.src}
              index={index}
              inView={isFanInView}
              image={image}
              className="w-[82%] sm:w-[35%]"
            />
          ))}
        </div>

        {/* 3. Text Blocks (01, 02, 03): Appear only AFTER cards have finished fanning out */}
        <div className="mx-auto hidden max-w-4xl grid-cols-3 gap-8 text-center sm:grid">
          {images.slice(0, 3).map((image, index) => (
            <motion.div
              key={image.src}
              initial={{ opacity: 0, y: 18 }}
              animate={cardsDeployed ? { opacity: 1, y: 0 } : { opacity: 0, y: 18 }}
              transition={{
                duration: 0.55,
                delay: index * 0.13,
                ease: [0.16, 1, 0.3, 1],
              }}
            >
              <h3 className="text-base font-bold text-[#0a194f]">
                <span className="mr-2 inline-block text-xs font-semibold text-indigo-500">
                  0{index + 1}
                </span>
                {image.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                {image.description}
              </p>
            </motion.div>
          ))}
        </div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={cardsDeployed ? { opacity: 1 } : { opacity: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="mt-7 text-center text-[11px] text-slate-500"
        >
          Vistas ilustrativas de Tico. Tú defines el presupuesto y decides cuándo activar en Meta Ads.
        </motion.p>
      </div>
    </section>
  );
}
