import { forwardRef, useId } from "react";
import type { ComponentPropsWithoutRef, CSSProperties } from "react";

/** Tamaño del lienzo (viewBox). Relación de aspecto ≈ 0.85 (ancho / alto). */
export const TICO_VIEWBOX = { width: 367, height: 432 } as const;

/** Centro y radio del anillo de la antena, en unidades del viewBox (útil para ondas o destellos). */
export const TICO_RING = { cx: 183.4, cy: 55.12, r: 37.25 } as const;

/** Shared canonical geometry, including animated variants of the mascot. */
export const TICO_PATHS = {
  head: 'M183.4 138.25C291.65 138.25 347.78 136.93 347.78 275.75C347.78 414.57 291.65 413.25 183.4 413.25C75.15 413.25 19.02 414.57 19.02 275.75C19.02 136.93 75.15 138.25 183.4 138.25Z',
  stem: 'M183.4 138.25V92.38',
  leftEye: 'M84.81 268.86A33.02 33.02 0 0 1 147.08 265.76',
  rightEye: 'M219.77 265.76A33.02 33.02 0 0 1 282.04 268.86',
  smile: 'M146.97 324.01A42.77 42.77 0 0 0 219.83 324.01',
} as const;

export interface TicoMascotProps extends ComponentPropsWithoutRef<"svg"> {
  /** Texto accesible. Si se omite, la mascota se trata como decorativa (aria-hidden). */
  title?: string;
}

/**
 * Cada pieza gira/escala sobre su propio centro (no sobre el del SVG completo).
 * Para otro pivote en una pieza concreta, sobrescribe con `!origin-bottom`, etc.
 */
const partStyle: CSSProperties = {
  transformBox: "fill-box",
  transformOrigin: "center",
};

/**
 * Tico en vectores reales (≈1.3 KB frente a 1.3 MB del SVG raster).
 *
 * Piezas animables, todas con `pathLength={1}` para dibujarlas con
 * `stroke-dasharray: 1` y `stroke-dashoffset: 1 → 0`:
 *  .tico-head          contorno de la cabeza (arranca arriba al centro, sentido horario)
 *  .tico-antenna-stem  tallo (se dibuja desde la cabeza hacia el anillo)
 *  .tico-antenna-ring  anillo de la antena
 *  .tico-eye-left / .tico-eye-right / .tico-smile
 */
export const TicoMascot = forwardRef<SVGSVGElement, TicoMascotProps>(
  function TicoMascot({ title, ...props }, ref) {
    // useId devuelve ":r1:"; se limpian los dos puntos para usarlo dentro de url(#...).
    const gradientId = `tico-grad-${useId().replace(/:/g, "")}`;

    return (
      <svg
        ref={ref}
        viewBox={`0 0 ${TICO_VIEWBOX.width} ${TICO_VIEWBOX.height}`}
        fill="none"
        overflow="visible"
        role={title ? "img" : undefined}
        aria-label={title}
        aria-hidden={title ? undefined : true}
        {...props}
      >
        <defs>
          <linearGradient
            id={gradientId}
            gradientUnits="userSpaceOnUse"
            x1="28.67"
            y1="166"
            x2="366.17"
            y2="330.81"
          >
            <stop offset="0" stopColor="#0082FE" />
            <stop offset="0.214" stopColor="#1278FF" />
            <stop offset="0.357" stopColor="#406EFE" />
            <stop offset="0.5" stopColor="#5B67FA" />
            <stop offset="0.643" stopColor="#6F60F7" />
            <stop offset="0.786" stopColor="#8959F3" />
            <stop offset="1" stopColor="#A751F1" />
          </linearGradient>
        </defs>

        <g
          stroke={`url(#${gradientId})`}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path
            className="tico-head"
            data-part="head"
            d={TICO_PATHS.head}
            strokeWidth={29.12}
            pathLength={1}
            style={partStyle}
          />
          <path
            className="tico-antenna-stem"
            data-part="antenna-stem"
            d={TICO_PATHS.stem}
            strokeWidth={30.5}
            strokeLinecap="butt"
            pathLength={1}
            style={partStyle}
          />
          <circle
            className="tico-antenna-ring"
            data-part="antenna-ring"
            cx={TICO_RING.cx}
            cy={TICO_RING.cy}
            r={TICO_RING.r}
            strokeWidth={27.75}
            pathLength={1}
            style={partStyle}
          />
          <path
            className="tico-eye-left"
            data-part="eye-left"
            d={TICO_PATHS.leftEye}
            strokeWidth={24.43}
            pathLength={1}
            style={partStyle}
          />
          <path
            className="tico-eye-right"
            data-part="eye-right"
            d={TICO_PATHS.rightEye}
            strokeWidth={24.43}
            pathLength={1}
            style={partStyle}
          />
          <path
            className="tico-smile"
            data-part="smile"
            d={TICO_PATHS.smile}
            strokeWidth={20.85}
            pathLength={1}
            style={partStyle}
          />
        </g>
      </svg>
    );
  },
);

export default TicoMascot;
