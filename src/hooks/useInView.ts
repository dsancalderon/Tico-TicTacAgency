import { useEffect, useRef, useState } from 'react';

export interface UseInViewOptions {
  threshold?: number | number[];
  rootMargin?: string;
  triggerOnce?: boolean;
}

export type UseInViewReturn<T extends HTMLElement> = [
  React.RefObject<T | null>,
  boolean
] & {
  ref: React.RefObject<T | null>;
  inView: boolean;
};

/**
 * Reusable IntersectionObserver hook for viewport entrance animations.
 * Safe for SSR and environments without IntersectionObserver support.
 */
export function useInView<T extends HTMLElement = HTMLDivElement>(
  options: UseInViewOptions = {}
): UseInViewReturn<T> {
  const { threshold = 0.2, rootMargin = '0px', triggerOnce = true } = options;
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    if (typeof IntersectionObserver === 'undefined') {
      setInView(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          if (triggerOnce) {
            observer.unobserve(element);
          }
        } else if (!triggerOnce) {
          setInView(false);
        }
      },
      {
        threshold,
        rootMargin,
      }
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [threshold, rootMargin, triggerOnce]);

  const result = [ref, inView] as UseInViewReturn<T>;
  result.ref = ref;
  result.inView = inView;
  return result;
}
