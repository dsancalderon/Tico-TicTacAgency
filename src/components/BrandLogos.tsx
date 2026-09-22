import React, { useId } from 'react';

interface BrandLogoProps extends React.SVGProps<SVGSVGElement> {
  className?: string;
  size?: number;
}

/**
 * Logotipo oficial de Meta (Loop infinito con gradiente azul Meta)
 */
export const MetaBrandLogo: React.FC<BrandLogoProps> = ({
  className = 'w-5 h-5',
  size = 20,
  ...props
}) => {
  const rawId = useId().replace(/:/g, '');
  const gradId = `meta-brand-grad-${rawId}`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      <defs>
        <linearGradient
          id={gradId}
          x1="1"
          y1="3"
          x2="23"
          y2="21"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#0866FF" />
          <stop offset="45%" stopColor="#0081FB" />
          <stop offset="100%" stopColor="#0064E0" />
        </linearGradient>
      </defs>
      <path
        d="M12.001 7.427C9.79 3.96 6.804 2.5 4.341 2.5 1.706 2.5 0 4.417 0 7.502c0 4.148 3.01 8.847 6.447 11.516 1.848 1.433 3.868 2.188 5.554 2.232 1.686-.044 3.706-.799 5.554-2.232C20.99 16.349 24 11.65 24 7.502 24 4.417 22.294 2.5 19.659 2.5c-2.463 0-5.449 1.46-7.658 4.927zm0 8.093c-1.58-.337-3.056-1.282-4.328-2.73-2.158-2.456-3.52-5.748-3.52-7.55 0-1.464.717-2.247 1.847-2.247 1.616 0 3.626 1.432 5.097 4.095l.904 1.642.904-1.642c1.471-2.663 3.481-4.095 5.097-4.095 1.13 0 1.847.783 1.847 2.247 0 1.802-1.362 5.094-3.52 7.55-1.272 1.448-2.748 2.393-4.328 2.73z"
        fill={`url(#${gradId})`}
      />
    </svg>
  );
};

/**
 * Logotipo oficial de Google (G multicolor)
 */
export const GoogleBrandLogo: React.FC<BrandLogoProps> = ({
  className = 'w-5 h-5',
  size = 20,
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
      {...props}
    >
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
