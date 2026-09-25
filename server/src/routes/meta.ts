import { Router, Request, Response } from 'express';
import { 
  verifyMetaToken, 
  verifyMetaAdAccount, 
  deployMetaCampaign, 
  deployMetaTestCampaign,
  fetchMetaCampaigns,
  fetchMetaAdSets,
  deployMetaBuilder
} from '../services/metaAds.js';

export const metaRouter = Router();

// Endpoint para verificar un token de acceso real de Meta Graph API
metaRouter.post('/verify-token', async (req: Request, res: Response) => {
  try {
    const token = req.body.token;
    if (!token) {
      return res.status(400).json({
        success: false,
        error: 'No se suministró ningún Access Token de Meta.'
      });
    }

    const result = await verifyMetaToken(token);
    return res.json({
      success: result.valid,
      diagnostic: result
    });
  } catch (error: any) {
    console.error('Error verifying Meta token:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

// Endpoint para verificar una cuenta publicitaria específica
metaRouter.post('/verify-account', async (req: Request, res: Response) => {
  try {
    const token = req.body.token;
    const adAccountId = req.body.adAccountId;

    if (!token) {
      return res.status(400).json({ success: false, error: 'Token de acceso no proporcionado.' });
    }
    if (!adAccountId) {
      return res.status(400).json({ success: false, error: 'ID de cuenta publicitaria no proporcionado.' });
    }

    const result = await verifyMetaAdAccount(token, adAccountId);
    return res.json(result);
  } catch (error: any) {
    console.error('Error verifying Meta ad account:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

// Endpoint para listar campañas existentes de una cuenta publicitaria
metaRouter.post('/campaigns-list', async (req: Request, res: Response) => {
  try {
    const token = req.body.token;
    const adAccountId = req.body.adAccountId;
    if (!token) {
      return res.status(400).json({ success: false, error: 'Token de acceso no proporcionado.' });
    }
    if (!adAccountId) {
      return res.status(400).json({ success: false, error: 'ID de cuenta publicitaria no proporcionado.' });
    }
    const result = await fetchMetaCampaigns(token, adAccountId);
    return res.json(result);
  } catch (error: any) {
    console.error('Error fetching Meta campaigns:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

// Endpoint para listar conjuntos de anuncios de una campaña
metaRouter.post('/adsets-list', async (req: Request, res: Response) => {
  try {
    const token = req.body.token;
    const adAccountId = req.body.adAccountId;
    const campaignId = req.body.campaignId;
    if (!token) {
      return res.status(400).json({ success: false, error: 'Token de acceso no proporcionado.' });
    }
    if (!adAccountId) {
      return res.status(400).json({ success: false, error: 'ID de cuenta publicitaria no proporcionado.' });
    }
    const result = await fetchMetaAdSets(token, adAccountId, campaignId);
    return res.json(result);
  } catch (error: any) {
    console.error('Error fetching Meta adsets:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

// Endpoint para desplegar la estructura de MetaAdBuilder (Campaña completa o Anuncio individual)
metaRouter.post('/deploy-builder', async (req: Request, res: Response) => {
  try {
    const { payload, token, adAccountId } = req.body;
    if (!payload) {
      return res.status(400).json({ success: false, error: 'Payload de configuración no suministrado.' });
    }
    if (!token) {
      return res.status(400).json({ success: false, error: 'Token de acceso no suministrado para el despliegue.' });
    }
    const result = await deployMetaBuilder(payload, token, adAccountId);
    return res.json(result);
  } catch (error: any) {
    console.error('Error deploying Meta builder:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

// Endpoint para realizar una prueba real de creación de campaña en PAUSED (sin consumo de IA)
metaRouter.post('/test-creation', async (req: Request, res: Response) => {
  try {
    const token = req.body.token;
    const adAccountId = req.body.adAccountId;
    const brandName = req.body.brandName || 'TicTac Performance';
    const pageId = req.body.pageId;

    if (!token) {
      return res.status(400).json({ success: false, error: 'Token de acceso no suministrado.' });
    }
    if (!adAccountId) {
      return res.status(400).json({ success: false, error: 'ID de cuenta publicitaria no suministrado.' });
    }

    const result = await deployMetaTestCampaign({
      token,
      adAccountId,
      pageId,
      brandName
    });

    return res.json(result);
  } catch (error: any) {
    console.error('Error executing test campaign creation:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

