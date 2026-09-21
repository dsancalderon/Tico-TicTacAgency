import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { requireAuth, getProfile } from './auth.js';
import { campaignsRouter } from './routes/campaigns.js';
import { metaRouter } from './routes/meta.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env'), override: false });

export const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || origin.includes('localhost') || origin.endsWith('.vercel.app') || origin === process.env.CLIENT_ORIGIN) {
      callback(null, true);
    } else {
      callback(null, false);
    }
  },
  credentials: true
}));

app.use(express.json());

// Ruta de comprobación de estado (Healthcheck)
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'Tico - TicTac Agency Performance API',
    timestamp: new Date().toISOString()
  });
});

app.use('/api', requireAuth);
app.get('/api/auth/me', getProfile);
// Advertising credentials are not tenant-scoped yet: keep these routes closed in phase 1.
app.use(['/api/campaigns', '/api/meta'], (_req, res, next) => {
  if (process.env.ENABLE_ADVERTISING_API !== 'true') {
    res.status(403).json({ error: 'Integraciones publicitarias pendientes de habilitación por cliente' }); return;
  }
  next();
});

// Rutas del agente de campañas
app.use('/api/campaigns', campaignsRouter);

// Rutas de conexión y diagnóstico de Meta Ads
app.use('/api/meta', metaRouter);

if (!process.env.VERCEL) app.listen(PORT, () => {
  console.log(`🚀 Servidor Tico backend activo en http://localhost:${PORT}`);
});

export default app;
