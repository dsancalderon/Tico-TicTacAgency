import { StrictMode } from 'react'
import { createRoot, hydrateRoot } from 'react-dom/client'
import './index.css'
import { getLegalRoute } from './legalRoutes'

const previewLoader = new URLSearchParams(window.location.search).get('preview') === 'loader';
const previewStrategy = new URLSearchParams(window.location.search).get('preview') === 'strategy-loader';
const legalRoute = getLegalRoute(window.location.pathname);
const root = document.getElementById('root')!;

if (legalRoute) {
  document.title = legalRoute.title;
  document.querySelector('meta[name="description"]')?.setAttribute('content', legalRoute.description);
  const LegalPage = legalRoute.component;
  const page = <StrictMode><LegalPage /></StrictMode>;
  if (root.hasChildNodes()) hydrateRoot(root, page);
  else createRoot(root).render(page);
} else {
  if (previewStrategy) {
    void import('./components/TicoLoader/TicoStrategyLoader').then(({ TicoStrategyLoader }) => {
      createRoot(root).render(<StrictMode><TicoStrategyLoader /></StrictMode>);
    });
  } else if (previewLoader) {
    void import('./components/TicoLoader').then(({ TicoLoader }) => {
      createRoot(root).render(<StrictMode><TicoLoader isLoaded={false} forceMotion /></StrictMode>);
    });
  } else {
    void import('./App.tsx').then(({ default: App }) => {
      createRoot(root).render(<StrictMode><App /></StrictMode>);
    });
  }
}

