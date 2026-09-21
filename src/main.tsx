import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { TicoLoader } from './components/TicoLoader'

const previewLoader = new URLSearchParams(window.location.search).get('preview') === 'loader';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {previewLoader ? <TicoLoader isLoaded={false} forceMotion /> : <App />}
  </StrictMode>,
)

