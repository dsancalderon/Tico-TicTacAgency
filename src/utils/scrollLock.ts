import { useEffect } from 'react';

let lockCount = 0;
let originalOverflow = '';
let originalPaddingRight = '';

/**
 * Bloquea el scroll del documento usando conteo de referencias.
 * Previene que múltiples modales/loaders se pisen entre sí o bloqueen el scroll indefinidamente.
 */
export function lockScroll(): void {
  if (typeof document === 'undefined') return;

  if (lockCount === 0) {
    const currentInlineOverflow = document.body.style.overflow;
    // Si ya estuviese en hidden por alguna anomalía previa, no guardamos 'hidden' para no perpetuar el bloqueo
    originalOverflow = currentInlineOverflow === 'hidden' ? '' : currentInlineOverflow;
    originalPaddingRight = document.body.style.paddingRight || '';

    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = 'hidden';
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }
  }

  lockCount++;
}

/**
 * Libera un bloqueo de scroll registrado. Cuando el conteo llega a 0,
 * restaura los estilos originales del body.
 */
export function unlockScroll(): void {
  if (typeof document === 'undefined') return;

  lockCount = Math.max(0, lockCount - 1);

  if (lockCount === 0) {
    document.body.style.overflow = originalOverflow === 'hidden' ? '' : originalOverflow;
    document.body.style.paddingRight = originalPaddingRight;
  }
}

/**
 * Fuerza el desbloqueo total e inmediato del scroll en document.body
 * útil en cambios de rutas, montaje de dashboard o transiciones de sesión.
 */
export function forceResetScroll(): void {
  if (typeof document === 'undefined') return;

  lockCount = 0;
  originalOverflow = '';
  originalPaddingRight = '';
  document.body.style.overflow = '';
  document.body.style.paddingRight = '';
}

/**
 * Hook de React para bloquear el scroll mientras el componente o condición esté activa.
 */
export function useScrollLock(active: boolean = true): void {
  useEffect(() => {
    if (!active) return;

    lockScroll();
    return () => {
      unlockScroll();
    };
  }, [active]);
}
