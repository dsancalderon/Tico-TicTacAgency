export interface StrategyRequest {
  brandName: string;
  websiteUrl: string;
  industry: string;
  targetAudience: string;
  objective: string;
  budgetTotal: number;
  currency: string;
  startDate: string;
  endDate: string;
  preferredPlatforms: 'meta' | 'google' | 'both';
  additionalNotes?: string;
}

export async function generateStrategyFromBrief(brief: StrategyRequest) {
  const apiKey = process.env.GEMINI_API_KEY;
  console.log('[TICO-AI] Generando estrategia para:', brief.brandName, '| GEMINI_API_KEY:', apiKey ? `Presente (${apiKey.slice(0, 6)}...)` : 'NO configurada');
  const includeMeta = brief.preferredPlatforms === 'meta' || brief.preferredPlatforms === 'both';
  const includeGoogle = brief.preferredPlatforms === 'google' || brief.preferredPlatforms === 'both';

  let metaShare = 0;
  let googleShare = 0;
  if (brief.preferredPlatforms === 'meta') {
    metaShare = 100;
  } else if (brief.preferredPlatforms === 'google') {
    googleShare = 100;
  } else {
    metaShare = brief.objective === 'lead_generation' || brief.objective === 'brand_awareness' ? 65 : 50;
    googleShare = 100 - metaShare;
  }

  const metaBudget = Math.round((brief.budgetTotal * metaShare) / 100);
  const googleBudget = Math.round((brief.budgetTotal * googleShare) / 100);

  // 1. Generación en tiempo real con Google Gemini 3.6 Flash
  if (apiKey && apiKey.trim() !== '' && !apiKey.includes('your_')) {
    try {
      const prompt = `Eres TICO, el agente senior de planeación y pauta publicitaria de TicTac Agency Performance. Con 6 años de experiencia en marketing de resultados, formulas estrategias reales, segmentación de audiencias y copys de alta conversión (fórmulas AIDA, PAS, ganchos emocionales) respetando las políticas de Meta Ads y Google Ads.

Analiza este briefing y genera la estrategia publicitaria en formato JSON:
- Marca: ${brief.brandName}
- Sitio Web: ${brief.websiteUrl || 'No especificado'}
- Industria / Categoría: ${brief.industry || 'General'}
- Audiencia Objetivo: ${brief.targetAudience || 'Compradores potenciales'}
- Objetivo de Negocio: ${brief.objective}
- Presupuesto Total: ${brief.budgetTotal} ${brief.currency}
- Plataformas Elegidas: ${brief.preferredPlatforms}
- Notas adicionales: ${brief.additionalNotes || 'Ninguna'}

Debes responder ÚNICAMENTE un objeto JSON válido con las siguientes propiedades:
{
  "strategySummary": "Resumen ejecutivo claro de la estrategia publicitaria, ángulos de venta y enfoque de crecimiento (1 a 2 párrafos concisos)",
  "metaAds": ${includeMeta ? `{
    "campaignName": "[TICO] ${brief.brandName} - Meta Ads (${brief.objective})",
    "objective": "${brief.objective === 'lead_generation' ? 'OUTCOME_LEADS' : 'OUTCOME_SALES'}",
    "placements": ["instagram_feed", "instagram_stories", "facebook_feed", "facebook_reels"],
    "interestsAndBehaviors": ["array de 4 a 6 intereses específicos y comportamientos recomendados en Meta Ads"],
    "primaryTexts": ["array de 2 a 3 textos persuasivos principales usando fórmulas de respuesta directa como AIDA o PAS"],
    "headlines": ["array de 3 titulares de alto gancho y CTR"],
    "callToAction": "${brief.objective === 'lead_generation' ? 'CONTACT_US' : 'LEARN_MORE'}"
  }` : 'null'},
  "googleAds": ${includeGoogle ? `{
    "campaignType": "SEARCH",
    "keywords": ["array de 4 a 6 palabras clave con concordancia de frase o exacta"],
    "headlines": ["array de 3 titulares de menos de 30 caracteres"],
    "descriptions": ["array de 2 descripciones de menos de 90 caracteres"],
    "targetLocations": ["Colombia", "Latinoamérica"]
  }` : 'null'}
}`;

      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${apiKey.trim()}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            responseMimeType: 'application/json',
            temperature: 0.7
          }
        })
      });

      if (res.ok) {
        const data = await res.json() as any;
        const rawJson = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (rawJson) {
          const parsed = JSON.parse(rawJson);
          return {
            briefingId: `brief_${Date.now()}`,
            brandName: brief.brandName,
            strategySummary: parsed.strategySummary || `Estrategia de performance generada por TICO para ${brief.brandName}.`,
            totalBudget: brief.budgetTotal,
            currency: brief.currency,
            createdAt: new Date().toISOString(),
            creditCost: 5,
            status: 'awaiting_approval',
            complianceChecked: true,
            creatives: [],
            metaAds: includeMeta && parsed.metaAds ? {
              ...parsed.metaAds,
              budgetSharePercentage: metaShare,
              budgetAmount: metaBudget,
              dailyBudget: Math.round(metaBudget / 30)
            } : undefined,
            googleAds: includeGoogle && parsed.googleAds ? {
              ...parsed.googleAds,
              budgetSharePercentage: googleShare,
              budgetAmount: googleBudget
            } : undefined
          };
        }
      } else {
        console.warn('Gemini API returned error status, falling back to deterministic template:', await res.text());
      }
    } catch (err) {
      console.error('Error invoking Gemini 3.6 Flash for strategy generation:', err);
    }
  }

  // 2. Fallback estructurado si no hay clave o si ocurre un fallo de red
  return {
    briefingId: `brief_${Date.now()}`,
    brandName: brief.brandName,
    strategySummary: `Estrategia formulada por el Agente TICO para ${brief.brandName} (${brief.industry || 'General'}). Enfoque en ${brief.objective} con distribución presupuestal en ${brief.preferredPlatforms.toUpperCase()}. Creación de entidades sujeta a aprobación humana en estado PAUSED.`,
    totalBudget: brief.budgetTotal,
    currency: brief.currency,
    createdAt: new Date().toISOString(),
    creditCost: 5,
    status: 'awaiting_approval',
    complianceChecked: true,
    creatives: [],
    metaAds: includeMeta ? {
      campaignName: `[TICO] ${brief.brandName} - Meta Ads`,
      objective: brief.objective === 'lead_generation' ? 'OUTCOME_LEADS' : 'OUTCOME_SALES',
      placements: ['instagram_feed', 'instagram_stories', 'facebook_feed', 'facebook_reels'],
      interestsAndBehaviors: [
        brief.industry || 'Comercio Digital',
        `Audiencia afín a ${brief.targetAudience || 'compradores activos'}`,
        'Interés en servicios profesionales y productos recomendados',
        'Usuarios con alta interacción en anuncios de Instagram y Facebook'
      ],
      primaryTexts: [
        `Descubre la calidad y el rendimiento que ${brief.brandName} tiene para ti. Soluciones adaptadas a ${brief.targetAudience || 'tus metas'}.`,
        `Multiplica tus resultados con ${brief.brandName}. Conoce nuestra propuesta exclusiva y obtén asesoría directa.`
      ],
      headlines: [
        `${brief.brandName} Oficial`,
        `Soluciones de Rendimiento`,
        `Conoce Nuestra Propuesta`
      ],
      callToAction: brief.objective === 'lead_generation' ? 'CONTACT_US' : 'LEARN_MORE',
      budgetSharePercentage: metaShare,
      budgetAmount: metaBudget,
      dailyBudget: Math.round(metaBudget / 30)
    } : undefined,
    googleAds: includeGoogle ? {
      campaignType: 'SEARCH',
      keywords: [
        `[${brief.brandName.toLowerCase()}]`,
        `"${brief.brandName.toLowerCase()} ${brief.industry?.toLowerCase() || 'servicios'}"`,
        `"mejores proveedores ${brief.industry?.toLowerCase() || 'mercado'}"`
      ],
      headlines: [
        `${brief.brandName} Oficial`,
        `Especialistas en ${brief.industry || 'Soluciones'}`,
        'Asesoría y Calidad'
      ],
      descriptions: [
        `Encuentra con ${brief.brandName} la mejor atención y calidad. Conoce nuestros servicios hoy.`,
        `Líderes en ${brief.industry || 'nuestro sector'}. Diseñado a la medida de tus expectativas.`
      ],
      targetLocations: ['Colombia', 'Latinoamérica'],
      budgetSharePercentage: googleShare,
      budgetAmount: googleBudget
    } : undefined
  };
}
