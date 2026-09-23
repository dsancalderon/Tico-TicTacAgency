import React from 'react';
import metaLogoUrl from '../assets/meta-logo-transparent.png';
import ticoCoinUrl from '../assets/tico-coin.png';

export interface BrandLogoProps {
  className?: string;
  size?: number;
  style?: React.CSSProperties;
  title?: string;
}

/**
 * Logotipo / Símbolo oficial de Créditos TICO (Moneda Dorada 3D)
 */
export const TicoCoinIcon: React.FC<BrandLogoProps> = ({
  className = 'w-5 h-5',
  size,
  style,
  title = 'Créditos TICO',
  ...props
}) => {
  return (
    <img
      src={ticoCoinUrl}
      alt={title}
      title={title}
      className={`object-contain inline-block shrink-0 select-none ${className}`}
      style={{
        ...(size ? { width: size, height: size } : {}),
        ...style
      }}
      loading="eager"
      onError={(e) => {
        const target = e.currentTarget;
        if (!target.src.includes('tico-coin.png')) {
          target.src = '/tico-coin.png';
        }
      }}
      {...(props as any)}
    />
  );
};

/**
 * Logotipo oficial de Meta exactamente igual al provisto por el usuario
 */
export const MetaBrandLogo: React.FC<BrandLogoProps> = ({
  className = 'w-5 h-5',
  size,
  style,
  title,
  ...props
}) => {
  return (
    <img
      src={metaLogoUrl}
      alt={title || 'Meta'}
      title={title}
      className={`object-contain inline-block shrink-0 select-none ${className}`}
      style={{
        ...(size ? { width: size, height: size } : {}),
        ...style
      }}
      loading="eager"
      onError={(e) => {
        const target = e.currentTarget;
        if (!target.src.includes('meta-logo-transparent.png')) {
          target.src = '/meta-logo-transparent.png';
        } else if (!target.src.includes('meta-logo.png')) {
          target.src = '/meta-logo.png';
        }
      }}
      {...(props as any)}
    />
  );
};

/**
 * Logotipo oficial de Google (G multicolor)
 */
export const GoogleBrandLogo: React.FC<BrandLogoProps> = ({
  className = 'w-5 h-5',
  size = 20,
  style,
  title,
  ...props
}) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={style}
      {...(props as any)}
    >
      {title && <title>{title}</title>}
      <path
        d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
        fill="#4285F4"
      />
      <path
        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
        fill="#34A853"
      />
      <path
        d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.14-1.55.38-2.27V6.58H1.25C.45 8.16 0 9.94 0 12s.45 3.84 1.25 5.42l4.03-3.15z"
        fill="#FBBC05"
      />
      <path
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
        fill="#EA4335"
      />
    </svg>
  );
};

/**
 * Logotipo oficial de Google Ads (emblema con barra azul, barra amarilla y círculo verde)
 */
export const GoogleAdsBrandLogo: React.FC<BrandLogoProps> = ({
  className = 'w-10 h-10',
  size,
  style,
  title = 'Google Ads',
  ...props
}) => {
  return (
    <svg
      viewBox="0 0 251 226"
      className={`object-contain shrink-0 select-none ${className}`}
      style={{
        ...(size ? { width: size, height: size } : {}),
        ...style
      }}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...(props as any)}
    >
      {title && <title>{title}</title>}
      {/* Barra Azul Derecha */}
      <path
        d="M85.9 28.6c2.4-6.3 5.7-12.1 10.6-16.8 19.6-19.1 52-14.3 65.3 9.7 10 18.2 20.6 36 30.9 54 17.2 29.9 34.6 59.8 51.6 89.8 14.3 25.1-1.2 56.8-29.6 61.1-17.4 2.6-33.7-5.4-42.7-21-15.1-26.3-30.3-52.6-45.4-78.8-0.3-0.6-0.7-1.1-1.1-1.6-1.6-1.3-2.3-3.2-3.3-4.9-6.7-11.8-13.6-23.5-20.3-35.2-4.3-7.6-8.8-15.1-13.1-22.7-3.9-6.8-5.7-14.2-5.5-22 0-3.8 0.5-7.8 2.3-11.4z"
        fill="#3C8BD9"
      />
      {/* Barra Amarilla Izquierda */}
      <path
        d="M85.9 28.6c-0.9 3.6-1.7 7.2-1.9 11-0.3 8.4 1.8 16.2 6 23.5 11 18.9 22 37.9 32.9 56.9 1 1.7 1.8 3.4 2.8 5-6 10.4-12 20.7-18.1 31.1-8.4 14.5-16.8 29.1-25.3 43.6-0.4 0-0.5-0.2-0.6-0.5-0.1-0.8 0.2-1.5 0.4-2.3 4.1-15 0.7-28.3-9.6-39.7-6.3-6.9-14.3-10.8-23.5-12.1-12-1.7-22.6 1.4-32.1 8.9-1.7 1.3-2.8 3.2-4.8 4.2-0.4 0-0.6-0.2-0.7-0.5 4.8-8.3 9.5-16.6 14.3-24.9 16.4-28.4 36.2-62.8 56.1-97.1 0.2-0.4 0.5-0.7 0.7-1.1z"
        fill="#FABC04"
      />
      {/* Círculo Verde Inferior */}
      <path
        d="M11.8 158c1.9-1.7 3.7-3.5 5.7-5.1 24.3-19.2 60.8-5.3 66.1 25.1 1.3 7.3 0.6 14.3-1.6 21.3-0.1 0.6-0.2 1.1-0.4 1.7-0.9 1.6-1.7 3.3-2.7 4.9-8.9 14.7-22 22-39.2 20.9-19.7-1.5-35.2-16.3-37.9-35.9-1.3-9.5 0.6-18.4 5.5-26.6 1-1.8 2.2-3.4 3.3-5.2 0.8-0.9 0.6-1.7 1.5-1.7z"
        fill="#34A852"
      />
    </svg>
  );
};

