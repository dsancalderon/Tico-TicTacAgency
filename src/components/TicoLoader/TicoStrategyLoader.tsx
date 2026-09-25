import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { easeInOut, motion, useAnimationFrame, useMotionValue, useTransform } from 'framer-motion';
import type { MotionValue } from 'framer-motion';
import { TICO_PATHS, TICO_RING, TICO_VIEWBOX } from '../TicoMascot';
import { useScrollLock } from '../../utils/scrollLock';

const captions = ['Formulando estrategia...', 'Analizando creativos...', 'Casi listo...'];

function ThinkingDot({ time, index }: { time: MotionValue<number>; index: number }) {
  const opacity = useTransform(time, t => t < 2.5
    ? .12 + .5 * Math.pow(Math.max(0, Math.sin(t * Math.PI * 2 - index * 1.1)), 2) : 0);
  return <motion.circle cx={151 + index * 32} cy={303} r={7} stroke="none" fill="currentColor" style={{ opacity }} />;
}

function StrategyBar({ time, index }: { time: MotionValue<number>; index: number }) {
  const pathLength = useTransform(time, [2.8 + index * .75, 3.5 + index * .85], [0, 1], { ease: easeInOut });
  return <motion.path d={`M${113 + index * 57} 339 v-${45 + index * 32} h30 v${45 + index * 32}`}
    strokeWidth={8} style={{ pathLength }} />;
}

/** One clock drives every part: first pass 0–7s, then only planning/closing (2.5–7s). */
export function TicoStrategyLoader() {
  const id = useId().replace(/:/g, '');
  const time = useMotionValue(0);
  const elapsed = useMotionValue(0);
  const phaseRef = useRef(0);
  const [phase, setPhase] = useState(0);
  useScrollLock();
  useEffect(() => {
    const root = document.getElementById('root');
    if (!root) return;
    const previous = root.inert;
    root.inert = true;
    return () => { root.inert = previous; };
  }, []);

  useAnimationFrame(ms => {
    const seconds = ms / 1000;
    const cycle = seconds < 7 ? seconds : 2.5 + (seconds - 7) % 4.5;
    elapsed.set(seconds);
    time.set(cycle);
    const nextPhase = cycle < 2.5 ? 0 : cycle < 5 ? 1 : 2;
    if (phaseRef.current !== nextPhase) {
      phaseRef.current = nextPhase;
      setPhase(nextPhase);
    }
  });

  const y = useTransform(elapsed, t => -4 * Math.sin(t * Math.PI / 1.75));
  const antennaScale = useTransform(time, [0, 1.25, 2.5, 7], [1, 1.15, 1, 1], { ease: easeInOut });
  const antennaRotate = useTransform(time, [2.5, 5, 7], [0, 360, 360], { ease: easeInOut });
  const haloScale = useTransform(time, [0, 1.25, 2.5, 5, 5.5, 7], [1, 1.35, 1, 1, 1.3, 1], { ease: easeInOut });
  const haloOpacity = useTransform(time, [0, 1.25, 2.5, 5, 5.5, 7], [.1, .45, .1, .1, .4, .1]);
  const faceOpacity = useTransform(time, [0, 2.1, 2.5, 5.7, 6.2, 6.7, 7], [1, 1, 0, 0, 1, 1, 0], { ease: easeInOut });
  const eyeScale = useTransform(time, [0, .9, 1.3, 1.7, 2.5, 5.7, 6.2, 7], [.45, .45, .08, .45, .45, .45, 1, 1], { ease: easeInOut });
  const smileOpacity = useTransform(time, [0, 2.5, 5.7, 6.2, 7], [.25, .25, 0, 1, 1]);
  const chartOpacity = useTransform(time, [2.5, 2.9, 5, 5.35, 5.7, 6.15, 7], [0, .6, .6, 1, .8, 0, 0], { ease: easeInOut });
  const handsOpacity = useTransform(time, [2.5, 2.9, 5.7, 6.15, 7], [0, 1, 1, 0, 0]);
  const handLeft = useTransform(time, [2.5, 3.1, 3.8, 4.5, 5.1, 5.4, 5.7, 6.15, 7], [10, -25, -12, -25, -12, 0, -12, 10, 10], { ease: easeInOut });
  const handRight = useTransform(handLeft, x => -x);
  const pieceY = useTransform(time, [2.5, 3.2, 4, 4.7, 5.2, 5.7, 7], [0, -14, 6, -8, 0, 0, 0], { ease: easeInOut });
  const pieceRightY = useTransform(pieceY, v => -v);
  const checkLength = useTransform(time, [5, 5.5], [0, 1], { ease: easeInOut });
  // This is cycle progress, deliberately not a percentage of the network request.
  const progress = useTransform(time, [0, 2.5, 5, 6.65, 7], [0, .28, .7, 1, 1], { ease: easeInOut });
  const dotX = useTransform(progress, p => p * 144);
  const trackOpacity = useTransform(time, [0, .2, 2.5, 2.75, 6.65, 7], [0, 1, 0, 1, 1, 0]);

  return createPortal(
    <motion.div className="fixed inset-0 z-[110] grid place-items-center overflow-hidden bg-[#F8FAFC] text-[#0a194f]"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: .25 }}
      data-testid="strategy-loader" data-phase={phase}>
      <div className="flex flex-col items-center p-10">
        <motion.div style={{ y }} className="mb-9 w-[148px] sm:w-[164px]" aria-hidden="true">
          <svg viewBox={`0 0 ${TICO_VIEWBOX.width} ${TICO_VIEWBOX.height}`} fill="none"
            preserveAspectRatio="xMidYMid meet" className="block h-auto w-full overflow-visible">
            <defs>
              <linearGradient id={`${id}-ink`} x1="0" y1="0" x2="367" y2="432" gradientUnits="userSpaceOnUse">
                <stop stopColor="#3B82F6" /><stop offset="1" stopColor="#8B5CF6" />
              </linearGradient>
              <radialGradient id={`${id}-halo`}>
                <stop stopColor="#8B5CF6" stopOpacity=".65" /><stop offset="1" stopColor="#8B5CF6" stopOpacity="0" />
              </radialGradient>
            </defs>
            <motion.circle cx={TICO_RING.cx} cy={TICO_RING.cy} r={85} fill={`url(#${id}-halo)`}
              style={{ scale: haloScale, opacity: haloOpacity, transformOrigin: '183.4px 55.12px' }} />
            <g stroke={`url(#${id}-ink)`} strokeLinecap="round" strokeLinejoin="round">
              <path d={TICO_PATHS.stem} strokeWidth={30.5} strokeLinecap="butt" />
              <motion.g style={{ scale: antennaScale, rotate: antennaRotate, transformOrigin: '183.4px 55.12px' }}>
                <circle cx={TICO_RING.cx} cy={TICO_RING.cy} r={TICO_RING.r} strokeWidth={27.75} />
                <circle cx={TICO_RING.cx} cy={TICO_RING.cy - TICO_RING.r} r={4} stroke="none" fill="#c4b5fd" />
              </motion.g>
              <path d={TICO_PATHS.head} strokeWidth={29.12} />
              <motion.g style={{ opacity: faceOpacity }}>
                <motion.g style={{ scaleY: eyeScale, transformOrigin: '183.4px 268px' }}>
                  <path d={TICO_PATHS.leftEye} strokeWidth={24.43} />
                  <path d={TICO_PATHS.rightEye} strokeWidth={24.43} />
                </motion.g>
                <motion.path d={TICO_PATHS.smile} strokeWidth={20.85} style={{ opacity: smileOpacity }} />
              </motion.g>
              <g color="#8B5CF6">{[0, 1, 2].map(index => <ThinkingDot key={index} time={time} index={index} />)}</g>
              <motion.g style={{ opacity: chartOpacity }}>
                <path d="M94 348H277" strokeWidth={5} opacity={.4} />
                {[0, 1, 2].map(index => <StrategyBar key={index} time={time} index={index} />)}
                <motion.path d="M153 195l18 17 35-36" strokeWidth={8} style={{ pathLength: checkLength }} />
              </motion.g>
              <motion.g style={{ opacity: handsOpacity }} strokeWidth={7}>
                <motion.g style={{ x: handLeft }}>
                  <ellipse cx={24} cy={290} rx={17} ry={23} fill="#3B82F6" fillOpacity={.04} />
                  <motion.rect x={-2} y={244} width={32} height={23} rx={6} style={{ y: pieceY }} />
                </motion.g>
                <motion.g style={{ x: handRight }}>
                  <ellipse cx={343} cy={290} rx={17} ry={23} fill="#8B5CF6" fillOpacity={.04} />
                  <motion.rect x={337} y={319} width={32} height={23} rx={6} style={{ y: pieceRightY }} />
                </motion.g>
              </motion.g>
            </g>
          </svg>
        </motion.div>
        <div aria-hidden="true" className="font-['Outfit'] text-[38px] font-semibold leading-none tracking-[-1.8px]">tico<span className="text-[#8B5CF6]">.</span></div>
        <p role="status" aria-live="polite" aria-atomic="true" className="mt-4 mb-6 min-w-56 text-center text-xs text-[#0a194f]/70">{captions[phase]}</p>
        <div aria-hidden="true" className="relative h-[3px] w-36 rounded-full bg-[#e9ecf5]">
          <motion.div className="absolute inset-0 origin-left rounded-full bg-gradient-to-r from-[#3B82F6] to-[#8B5CF6]" style={{ scaleX: progress, opacity: trackOpacity }} />
          <motion.span className="absolute -top-[2px] -left-[3px] h-[7px] w-[7px] rounded-full bg-[#8B5CF6] shadow-[0_0_9px_#8B5CF650]" style={{ x: dotX, opacity: trackOpacity }} />
        </div>
      </div>
      <div aria-hidden="true" className="absolute bottom-8 text-[9px] font-bold tracking-[.24em] text-[#778197]">TICTAC <span className="font-normal">AGENCY</span></div>
    </motion.div>, document.body
  );
}
