import { useState, useEffect, useRef } from 'react';
import { TicoMascot } from '../TicoMascot';
import './tico-loader.css';

export type LoaderPhase = 'entering' | 'loading' | 'exiting' | 'done';
export interface TicoLoaderProps {
  isLoaded: boolean;
  onFinish?: () => void;
  minDuration?: number;
  /** Explicit opt-in to full motion, including when the system requests reduced motion. */
  forceMotion?: boolean;
}

export function TicoLoader({ isLoaded, onFinish, minDuration = 1200, forceMotion = false }: TicoLoaderProps) {
  const [phase, setPhase] = useState<LoaderPhase>('loading');
  const started = useRef(0);
  const finish = useRef(onFinish);
  useEffect(() => { started.current = Date.now(); }, []);
  useEffect(() => { finish.current = onFinish; }, [onFinish]);

  useEffect(() => {
    const overflow = document.body.style.overflow;
    const padding = document.body.style.paddingRight;
    if (phase === 'done') return;
    const scrollbar = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = 'hidden';
    if (scrollbar > 0) document.body.style.paddingRight = `${scrollbar}px`;
    return () => {
      document.body.style.overflow = overflow;
      document.body.style.paddingRight = padding;
    };
  }, [phase]);

  useEffect(() => {
    if (!isLoaded) return;
    const timer = window.setTimeout(() => setPhase('exiting'),
      Math.max(0, minDuration - (Date.now() - started.current)));
    return () => window.clearTimeout(timer);
  }, [isLoaded, minDuration]);

  useEffect(() => {
    if (phase !== 'exiting') return;
    const duration = !forceMotion && window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 450;
    const timer = window.setTimeout(() => {
      setPhase('done');
      finish.current?.();
    }, duration);
    return () => window.clearTimeout(timer);
  }, [phase, forceMotion]);

  if (phase === 'done') return null;
  return (
    <div className={`tico-loader tico-phase-${phase}`} data-motion={forceMotion ? 'full' : 'system'} role="status" aria-live="polite">
      <div className="tico-loader-content">
        <div className="tico-loader-art" aria-hidden="true">
          <div className="tico-loader-aura" />
          <div className="tico-loader-float"><TicoMascot /></div>
          <div className="tico-loader-shadow" />
        </div>
        <div className="tico-loader-wordmark" aria-hidden="true">tico<span>.</span></div>
        <p className="tico-loader-caption">Preparando tu espacio</p>
        <div className="tico-loader-track" aria-hidden="true"><span /></div>
      </div>
      <div className="tico-loader-signature" aria-hidden="true">TICTAC <span>AGENCY</span></div>
    </div>
  );
}
export default TicoLoader;

