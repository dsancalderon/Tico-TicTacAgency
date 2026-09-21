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

export function generateStrategyFromBrief(brief: StrategyRequest) {
  const includeMeta = brief.preferredPlatforms === 'meta' || brief.preferredPlatforms === 'both';
  const includeGoogle = brief.preferredPlatforms === 'google' || brief.preferredPlatforms === 'both';

  let metaShare = 0;
  let googleShare = 0;
  if (brief.preferredPlatforms === 'meta') {
    metaShare = 100;
  } else if (brief.preferredPlatforms === 'google') {
    googleShare = 100;
  } else {
    metaShare = brief.objective === 'lead_generation' ? 65 : 50;
    googleShare = 100 - metaShare;
  }

  const metaBudget = Math.round((brief.budgetTotal * metaShare) / 100);
  const googleBudget = Math.round((brief.budgetTotal * googleShare) / 100);

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
