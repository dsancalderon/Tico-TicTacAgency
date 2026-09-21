import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { campaignsRouter } from './routes/campaigns.js';
import { metaRouter } from './routes/meta.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors({
  origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
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

// Rutas del agente de campañas
app.use('/api/campaigns', campaignsRouter);

// Rutas de conexión y diagnóstico de Meta Ads
app.use('/api/meta', metaRouter);

app.listen(PORT, () => {
  console.log(`🚀 Servidor Tico backend activo en http://localhost:${PORT}`);
});
