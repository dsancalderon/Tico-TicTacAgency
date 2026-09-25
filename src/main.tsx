import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { TicoLoader } from './components/TicoLoader'
import { TicoStrategyLoader } from './components/TicoLoader/TicoStrategyLoader'

const previewLoader = new URLSearchParams(window.location.search).get('preview') === 'loader';
const previewStrategy = new URLSearchParams(window.location.search).get('preview') === 'strategy-loader';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {previewStrategy ? <TicoStrategyLoader /> : previewLoader ? <TicoLoader isLoaded={false} forceMotion /> : <App />}
  </StrictMode>,
)

