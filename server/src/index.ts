import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { requireAuth, getProfile } from './auth.js';
import { campaignsRouter } from './routes/campaigns.js';
import { metaRouter } from './routes/meta.js';
import { briefRouter } from './routes/brief.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env'), override: true });
dotenv.config({ path: path.resolve(__dirname, '../.env'), override: true });
dotenv.config({ path: path.resolve(process.cwd(), '.env'), override: true });
dotenv.config({ path: path.resolve(__dirname, '../../.env.local'), override: false });

export const app = express();
const PORT = process.env.PORT || 4000;

// Configuración de lista blanca estricta para CORS
const allowedOrigins = new Set([
  process.env.CLIENT_ORIGIN,
  'https://tico-tic-tac-agency.vercel.app',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:4173',
  'http://127.0.0.1:4173',
  ...(process.env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim())
].filter(Boolean));

app.use(cors({
  origin: (origin, callback) => {
    // Permitir peticiones sin origen (same-origin, herramientas de servidor, healthchecks)
    if (!origin) return callback(null, true);
    if (allowedOrigins.has(origin)) {
      return callback(null, true);
    }
    // Si se despliega en Vercel y se especifica el prefijo oficial de la app
    const officialVercelHost = process.env.VERCEL_PROJECT_PRODUCTION_URL;
    if (officialVercelHost && origin === `https://${officialVercelHost}`) {
      return callback(null, true);
    }
    return callback(new Error(`CORS no permitido para el origen: ${origin}`));
  },
  credentials: true
}));

// Cabeceras de seguridad HTTP estándar (Defensa en profundidad)
app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

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
app.use('/api/brief', briefRouter);
// Las rutas de formulación de estrategia con IA (Gemini), diagnóstico de cuentas y listado de campañas/adsets
// deben estar siempre habilitadas para los usuarios autenticados.
const allowedPaths = [
  '/generate-strategy',
  '/generate-meta-builder',
  '/gemini-status',
  '/verify-token',
  '/verify-account',
  '/campaigns-list',
  '/adsets-list',
  '/test-creation',
  '/deploy-builder'
];

app.use(['/api/campaigns', '/api/meta'], (req, res, next) => {
  if (allowedPaths.includes(req.path)) {
    return next();
  }
  if (process.env.ENABLE_ADVERTISING_API !== 'true' && !req.body?.token && !req.body?.userAccessToken) {
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
