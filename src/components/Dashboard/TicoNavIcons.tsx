import React from 'react';

interface IconProps extends React.SVGProps<SVGSVGElement> {
  className?: string;
  size?: number;
}

/**
 * Icono Minimalista Squircle Tico: Inicio
 * Marco squircle con nodo central de hogar y bienvenida.
 */
export const TicoIconHome: React.FC<IconProps> = ({
  className = 'w-6 h-6',
  size = 24,
  ...props
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    {...props}
  >
    {/* Squircle exterior Tico */}
    <rect
      x="3"
      y="3"
      width="18"
      height="18"
      rx="6"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    {/* Silueta interior minimalista de Casa / Nodo */}
    <path
      d="M8.5 11.5L12 8.5L15.5 11.5V15.5C15.5 16.0523 15.0523 16.5 14.5 16.5H9.5C8.94772 16.5 8.5 16.0523 8.5 15.5V11.5Z"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M11 16.5V13.5H13V16.5"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

/**
 * Icono Minimalista Squircle Tico: Tico Agent (IA)
 * Cabeza squircle de Tico con su antena icónica, anillo y mirada amigable.
 */
export const TicoIconAgent: React.FC<IconProps> = ({
  className = 'w-6 h-6',
  size = 24,
  ...props
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    {...props}
  >
    {/* Anillo de la antena Tico */}
    <circle
      cx="12"
      cy="3.25"
      r="1.5"
      stroke="currentColor"
      strokeWidth="1.5"
    />
    {/* Tallo de la antena */}
    <path
      d="M12 4.75V7"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
    />
    {/* Cabeza Squircle Tico */}
    <rect
      x="3.5"
      y="7"
      width="17"
      height="14"
      rx="5.5"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    {/* Ojos Tico */}
    <circle cx="8.75" cy="13" r="1" fill="currentColor" />
    <circle cx="15.25" cy="13" r="1" fill="currentColor" />
    {/* Sonrisa Tico */}
    <path
      d="M10.25 16C10.8 16.8 13.2 16.8 13.75 16"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
  </svg>
);

/**
 * Icono Minimalista Squircle Tico: Conexiones (Meta + Google)
 * Dos squircles interconectados con puente de datos.
 */
export const TicoIconConnections: React.FC<IconProps> = ({
  className = 'w-6 h-6',
  size = 24,
  ...props
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    {...props}
  >
    {/* Squircle A (ej. Meta) */}
    <rect
      x="2.75"
      y="4.5"
      width="10.5"
      height="10.5"
      rx="3.5"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    {/* Squircle B (ej. Google) */}
    <rect
      x="10.75"
      y="9"
      width="10.5"
      height="10.5"
      rx="3.5"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    {/* Nodo / Conector de enlace central */}
    <circle cx="8" cy="9.75" r="1.25" fill="currentColor" />
    <circle cx="16" cy="14.25" r="1.25" fill="currentColor" />
    <path
      d="M9.5 11.25L14.5 12.75"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
  </svg>
);

/**
 * Icono Minimalista Squircle Tico: Campañas
 * Squircles apilados en perspectiva representando campañas y conjuntos de anuncios.
 */
export const TicoIconCampaigns: React.FC<IconProps> = ({
  className = 'w-6 h-6',
  size = 24,
  ...props
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    {...props}
  >
    {/* Capa trasera de campaña */}
    <rect
      x="6"
      y="3"
      width="15"
      height="13.5"
      rx="4.5"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeOpacity="0.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    {/* Capa delantera principal */}
    <rect
      x="3"
      y="7.5"
      width="15"
      height="13.5"
      rx="4.5"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    {/* Líneas de campaña en estado PAUSED / estructura */}
    <path
      d="M7 12H13.5"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
    />
    <path
      d="M7 15.5H11"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
    />
  </svg>
);

/**
 * Icono Minimalista Squircle Tico: Dashboards
 * Squircle con barras de telemetría y métricas de rendimiento en tiempo real.
 */
export const TicoIconDashboards: React.FC<IconProps> = ({
  className = 'w-6 h-6',
  size = 24,
  ...props
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    {...props}
  >
    {/* Marco Squircle Tico */}
    <rect
      x="3"
      y="3"
      width="18"
      height="18"
      rx="6"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    {/* Barras métricas internas */}
    <path
      d="M7.5 16.5V13"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
    />
    <path
      d="M12 16.5V8.5"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
    />
    <path
      d="M16.5 16.5V11"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
    />
    {/* Punto de pico de rendimiento */}
    <circle cx="12" cy="8.5" r="0.75" fill="currentColor" />
  </svg>
);
