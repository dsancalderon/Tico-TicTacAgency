import { motion, type Variants } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion';
import { Cta, type CtaProps } from './hero-10-utils/cta';

export interface Hero10Props {
  id: string;
  eyebrow: string;
  title: string;
  titleHighlight: string;
  description: string;
  images: readonly { src: string; alt: string; title: string; description: string }[];
  primaryCTA: CtaProps;
  secondaryCTA?: CtaProps;
}

const reveal: Variants = {
  hidden: { opacity: 0, y: 18 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] } },
};
const fanSlots = [
  'sm:z-10 sm:rotate-[-6deg] sm:translate-y-7 sm:-mr-7',
  'sm:z-20',
  'sm:z-10 sm:rotate-[6deg] sm:translate-y-7 sm:-ml-7',
];

/** Hero-10 image fan adapted to Tico's existing React/Vite and Motion stack. */
export function Hero10({ id, eyebrow, title, titleHighlight, description, images, primaryCTA, secondaryCTA }: Hero10Props) {
  const reducedMotion = usePrefersReducedMotion();
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="relative isolate scroll-mt-20 overflow-hidden border-y border-blue-100/80 bg-[#f8faff] py-16 sm:py-24">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_60%,#e8e6ff_0%,transparent_65%)]" />
      <div className="relative mx-auto max-w-6xl px-5 sm:px-8">
        <motion.div className="mx-auto flex max-w-3xl flex-col items-center gap-5 text-center"
          initial={reducedMotion ? false : 'hidden'} whileInView="visible" viewport={{ once: true, amount: 0.2 }}
          variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.1 } } }}>
          <motion.p variants={reveal} className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-white px-3.5 py-1.5 text-xs font-semibold text-[#0a194f]">
            <Sparkles aria-hidden="true" className="h-3.5 w-3.5 text-indigo-500" />{eyebrow}
          </motion.p>
          <motion.h2 id={`${id}-title`} variants={reveal} className="text-balance text-3xl font-extrabold tracking-tight text-[#0a194f] sm:text-5xl sm:leading-[1.12]">
            {title}<br /><span className="bg-linear-to-r from-tico-blue to-tico-purple bg-clip-text text-transparent">{titleHighlight}</span>
          </motion.h2>
          <motion.p variants={reveal} className="max-w-xl text-pretty text-sm leading-relaxed text-slate-600 sm:text-base">{description}</motion.p>
          <motion.div variants={reveal} className="mt-1 flex flex-wrap justify-center gap-3">
            <Cta {...primaryCTA} />{secondaryCTA && <Cta {...secondaryCTA} variant="outline" />}
          </motion.div>
          <motion.p variants={reveal} className="text-xs font-medium text-slate-500">Plan editable · Exportación a Excel · Revisión antes de activar</motion.p>
        </motion.div>

        <motion.div role="group" aria-label="Tres etapas del trabajo con Tico. Desliza para ver las imágenes en móvil."
          tabIndex={0}
          className="tico-method-fan -mx-5 mt-10 flex snap-x snap-mandatory items-start gap-4 overflow-x-auto px-5 pt-2 pb-8 focus-visible:outline-2 focus-visible:outline-blue-600 sm:mx-auto sm:mt-14 sm:max-w-[940px] sm:justify-center sm:gap-0 sm:overflow-visible sm:px-0 sm:pb-14"
          initial={reducedMotion ? false : 'hidden'} whileInView="visible" viewport={{ once: true, amount: 0.15 }}
          variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.12 } } }}>
          {images.slice(0, 3).map((image, index) => (
            <motion.figure key={image.src} variants={reveal}
              className={`relative w-[82%] shrink-0 snap-center sm:w-[35%] ${fanSlots[index]}`}>
              <div className="overflow-hidden rounded-2xl border border-white bg-white shadow-[0_18px_50px_-20px_#0a194f55] ring-1 ring-blue-100">
                <img src={image.src} alt={image.alt} width={1122} height={1402} loading="lazy" decoding="async" className="block aspect-4/5 w-full object-cover" />
              </div>
              <figcaption className="px-2 pt-5 text-center sm:hidden">
                <h3 className="text-sm font-bold text-[#0a194f]">0{index + 1} / {image.title}</h3>
                <p className="mt-1 text-xs leading-relaxed text-slate-600">{image.description}</p>
              </figcaption>
            </motion.figure>
          ))}
        </motion.div>
        <div className="mx-auto hidden max-w-4xl grid-cols-3 gap-8 text-center sm:grid">
          {images.slice(0, 3).map((image, index) => <div key={image.src}>
            <h3 className="text-base font-bold text-[#0a194f]"><span className="mr-2 text-xs text-indigo-500">0{index + 1}</span>{image.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">{image.description}</p>
          </div>)}
        </div>
        <p className="mt-7 text-center text-[11px] text-slate-500">Vistas ilustrativas de Tico. Tú defines el presupuesto y decides cuándo activar en Meta Ads.</p>
      </div>
    </section>
  );
}
