import { Router, Request, Response } from 'express';
import { verifyMetaToken, verifyMetaAdAccount, deployMetaCampaign, deployMetaTestCampaign } from '../services/metaAds.js';

export const metaRouter = Router();

// Endpoint para verificar un token de acceso real de Meta Graph API
metaRouter.post('/verify-token', async (req: Request, res: Response) => {
  try {
    const token = req.body.token || process.env.META_ACCESS_TOKEN;
    if (!token) {
      return res.status(400).json({
        success: false,
        error: 'No se suministró ningún Access Token de Meta y no está configurado en .env.'
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
    const token = req.body.token || process.env.META_ACCESS_TOKEN;
    const adAccountId = req.body.adAccountId || process.env.META_AD_ACCOUNT_ID;

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

// Endpoint para realizar una prueba real de creación de campaña en PAUSED (sin consumo de IA)
metaRouter.post('/test-creation', async (req: Request, res: Response) => {
  try {
    const token = req.body.token || process.env.META_ACCESS_TOKEN;
    const adAccountId = req.body.adAccountId || process.env.META_AD_ACCOUNT_ID;
    const brandName = req.body.brandName || 'TicTac Performance';
    const pageId = req.body.pageId;

    if (!token && !process.env.META_ACCESS_TOKEN) {
      return res.status(400).json({ success: false, error: 'Token de acceso no suministrado.' });
    }
    if (!adAccountId && !process.env.META_AD_ACCOUNT_ID) {
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
