import { Router, Request, Response } from 'express';
import { generateStrategyFromBrief, generateMetaBuilderStrategy } from '../services/aiStrategist.js';
import { deployMetaCampaign } from '../services/metaAds.js';
import { deployGoogleCampaign } from '../services/googleAds.js';

export const campaignsRouter = Router();

// Endpoint para generar estrategia con IA a partir del briefing del cliente
campaignsRouter.post('/generate-strategy', async (req: Request, res: Response) => {
  try {
    const brief = req.body;
    if (!brief.brandName || !brief.budgetTotal) {
      return res.status(400).json({ error: 'El nombre de marca y presupuesto son requeridos' });
    }

    const strategy = await generateStrategyFromBrief(brief);
    return res.json({
      success: true,
      strategy
    });
  } catch (error) {
    console.error('Error generating strategy:', error);
    return res.status(500).json({ error: 'Error al generar la estrategia publicitaria' });
  }
});

// Endpoint para procesar y enriquecer la configuración del MetaAdBuilder con IA
campaignsRouter.post('/generate-meta-builder', async (req: Request, res: Response) => {
  try {
    const payload = req.body;
    if (!payload || !payload.brandName) {
      return res.status(400).json({ error: 'El nombre de marca y la configuración son requeridos.' });
    }

    const result = await generateMetaBuilderStrategy(payload);
    return res.json({
      success: true,
      strategySummary: result.strategySummary,
      enrichedPayload: result.enrichedPayload
    });
  } catch (error: any) {
    console.error('Error generating Meta builder strategy:', error);
    return res.status(500).json({ error: error?.message || 'Error al procesar la estrategia de Meta Ads.' });
  }
});

// Endpoint diagnóstico para verificar el estado de la clave de Gemini en el servidor
campaignsRouter.get('/gemini-status', (_req: Request, res: Response) => {
  const key = (process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || '').trim();
  const configured = Boolean(key && !key.includes('your_'));
  return res.json({
    configured,
    provider: 'Google AI Studio',
    model: 'gemini-3.6-flash',
    prefix: configured ? `${key.slice(0, 4)}...${key.slice(-3)}` : null
  });
});


// Endpoint para desplegar la campaña aprobada a Meta y/o Google Ads
campaignsRouter.post('/deploy', async (req: Request, res: Response) => {
  try {
    const { strategy, clientConfirmed } = req.body;

    if (!clientConfirmed) {
      return res.status(400).json({ error: 'Se requiere confirmación explícita del cliente para publicar.' });
    }

    const results: Record<string, any> = {};

    // Despliegue en Meta si aplica
    if (strategy.metaAds) {
      results.meta = await deployMetaCampaign({
        name: `[TICO] ${strategy.brandName} - Meta`,
        objective: 'OUTCOME_LEADS',
        dailyBudget: strategy.metaAds.budgetSharePercentage,
        currency: strategy.currency,
        targeting: {
          interests: strategy.metaAds.interestsAndBehaviors
        },
        creative: {
          headline: strategy.metaAds.headlines[0] || strategy.brandName,
          primaryText: strategy.metaAds.primaryTexts[0] || '',
          callToAction: strategy.metaAds.callToAction
        }
      });
    }

    // Despliegue en Google Ads si aplica
    if (strategy.googleAds) {
      results.google = await deployGoogleCampaign({
        name: `[TICO] ${strategy.brandName} - Google Search`,
        advertisingChannelType: strategy.googleAds.campaignType,
        budgetAmount: strategy.googleAds.budgetSharePercentage,
        currency: strategy.currency,
        keywords: strategy.googleAds.keywords,
        headlines: strategy.googleAds.headlines,
        descriptions: strategy.googleAds.descriptions
      });
    }

    return res.json({
      success: true,
      deployedAt: new Date().toISOString(),
      results
    });
  } catch (error) {
    console.error('Error deploying campaigns:', error);
    return res.status(500).json({ error: 'Error al desplegar la campaña a las plataformas publicitarias' });
  }
});
