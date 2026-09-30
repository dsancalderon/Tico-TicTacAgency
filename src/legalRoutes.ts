import { Terms } from './pages/Terms';
import { Privacy } from './pages/Privacy';
import { DataDeletion } from './pages/DataDeletion';
import { legalRoutePath } from './legalPaths';

export const legalRoutes = {
  '/terms': {
    component: Terms,
    title: 'Términos y Condiciones | Tico – TicTac Agency',
    description: 'Consulte los términos de uso, cuentas, integraciones publicitarias, contenido generado por IA y suscripciones de Tico.'
  },
  '/privacy': {
    component: Privacy,
    title: 'Política de Privacidad | Tico – TicTac Agency',
    description: 'Conozca qué datos trata Tico, con qué finalidades, durante cuánto tiempo y cómo ejercer sus derechos de privacidad.'
  },
  '/data-deletion': {
    component: DataDeletion,
    title: 'Eliminación de datos | Tico – TicTac Agency',
    description: 'Aprenda a solicitar la eliminación de los datos de su cuenta de Tico y de sus integraciones con plataformas publicitarias.'
  }
} as const;

export function getLegalRoute(pathname: string) {
  const normalized = legalRoutePath(pathname).replace(/\.html$/, '').replace(/\/+$/, '') || '/';
  return legalRoutes[normalized as keyof typeof legalRoutes];
}
