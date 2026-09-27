import { Sparkles } from 'lucide-react';
import { useInView } from '../../hooks/useInView';
import { Cta, type CtaProps } from './hero-10-utils/cta';
import { RevealOnScroll } from './RevealOnScroll';
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

/**
 * Hero-10 section adapted with custom useInView scroll reveal,
 * staggered deploy animations, and interactive hover effects.
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
  // Viewport observers with triggerOnce: true and threshold 0.15 - 0.2
  const [headerRef, headerInView] = useInView<HTMLDivElement>({ threshold: 0.15, triggerOnce: true });
  const [fanRef, fanInView] = useInView<HTMLDivElement>({ threshold: 0.15, triggerOnce: true });
  const [blocksRef, blocksInView] = useInView<HTMLDivElement>({ threshold: 0.2, triggerOnce: true });

  return (
    <section
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
        <div ref={headerRef} className="mx-auto flex max-w-3xl flex-col items-center gap-5 text-center">
          {eyebrow && (
            <RevealOnScroll inView={headerInView} delay={0} duration={500} yOffset={14}>
              <p className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-white px-3.5 py-1.5 text-xs font-semibold text-[#0a194f]">
                <Sparkles aria-hidden="true" className="h-3.5 w-3.5 text-indigo-500" />
                {eyebrow}
              </p>
            </RevealOnScroll>
          )}

          <RevealOnScroll inView={headerInView} delay={70} duration={600} yOffset={20}>
            <h2
              id={`${id}-title`}
              className="text-balance text-3xl font-extrabold tracking-tight text-[#0a194f] sm:text-5xl sm:leading-[1.12]"
            >
              {title}
              <br />
              <span className="bg-linear-to-r from-tico-blue to-tico-purple bg-clip-text text-transparent">
                {titleHighlight}
              </span>
            </h2>
          </RevealOnScroll>

          <RevealOnScroll inView={headerInView} delay={150} duration={600} yOffset={18}>
            <p className="max-w-xl text-pretty text-sm leading-relaxed text-slate-600 sm:text-base">
              {description}
            </p>
          </RevealOnScroll>

          <RevealOnScroll inView={headerInView} delay={230} duration={550} yOffset={16}>
            <div className="mt-1 flex flex-wrap justify-center gap-3">
              <Cta {...primaryCTA} />
              {secondaryCTA && <Cta {...secondaryCTA} variant="outline" />}
            </div>
          </RevealOnScroll>

          <RevealOnScroll inView={headerInView} delay={290} duration={500} yOffset={12}>
            <p className="text-xs font-medium text-slate-500">
              Plan editable · Exportación a Excel · Revisión antes de activar
            </p>
          </RevealOnScroll>
        </div>

        {/* 1. Mockup Fan Scroll Reveal & 2. Interactive Hover */}
        <div
          ref={fanRef}
          role="group"
          aria-label="Tres etapas del trabajo con Tico. Desliza para ver las imágenes en móvil."
          tabIndex={0}
          className="tico-method-fan -mx-5 mt-10 flex snap-x snap-mandatory items-start gap-4 overflow-x-auto px-5 pt-2 pb-8 focus-visible:outline-2 focus-visible:outline-blue-600 sm:mx-auto sm:mt-14 sm:max-w-[940px] sm:justify-center sm:gap-0 sm:overflow-visible sm:px-0 sm:pb-14"
        >
          {images.slice(0, 3).map((image, index) => (
            <AnimatedCard
              key={image.src}
              index={index}
              inView={fanInView}
              className="relative w-[82%] shrink-0 snap-center sm:w-[35%]"
            >
              <div className="mockup-inner-frame overflow-hidden rounded-2xl border border-white bg-white shadow-[0_18px_50px_-20px_#0a194f55] ring-1 ring-blue-100">
                <img
                  src={image.src}
                  alt={image.alt}
                  width={1122}
                  height={1402}
                  loading="lazy"
                  decoding="async"
                  className="block aspect-4/5 w-full object-cover"
                />
              </div>
              <figcaption className="px-2 pt-5 text-center sm:hidden">
                <h3 className="text-sm font-bold text-[#0a194f]">
                  0{index + 1} / {image.title}
                </h3>
                <p className="mt-1 text-xs leading-relaxed text-slate-600">
                  {image.description}
                </p>
              </figcaption>
            </AnimatedCard>
          ))}
        </div>

        {/* 3. Text Blocks (01, 02, 03) with Cascading Delays */}
        <div
          ref={blocksRef}
          className="mx-auto hidden max-w-4xl grid-cols-3 gap-8 text-center sm:grid"
        >
          {images.slice(0, 3).map((image, index) => {
            const baseDelay = index * 140;
            return (
              <div key={image.src}>
                <RevealOnScroll
                  inView={blocksInView}
                  delay={baseDelay}
                  duration={550}
                  yOffset={18}
                  as="h3"
                  className="text-base font-bold text-[#0a194f]"
                >
                  <span className="mr-2 inline-block text-xs font-semibold text-indigo-500">
                    0{index + 1}
                  </span>
                  {image.title}
                </RevealOnScroll>

                <RevealOnScroll
                  inView={blocksInView}
                  delay={baseDelay + 100}
                  duration={550}
                  yOffset={16}
                  as="p"
                  className="mt-2 text-sm leading-relaxed text-slate-600"
                >
                  {image.description}
                </RevealOnScroll>
              </div>
            );
          })}
        </div>

        <RevealOnScroll inView={blocksInView} delay={450} duration={500} yOffset={10}>
          <p className="mt-7 text-center text-[11px] text-slate-500">
            Vistas ilustrativas de Tico. Tú defines el presupuesto y decides cuándo activar en Meta Ads.
          </p>
        </RevealOnScroll>
      </div>
    </section>
  );
}
