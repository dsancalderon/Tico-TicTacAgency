export interface MetaCampaignPayload {
  name: string;
  objective: string;
  dailyBudget: number;
  currency: string;
  targeting: {
    interests: string[];
  };
  creative: {
    headline: string;
    primaryText: string;
    callToAction: string;
  };
}

export interface MetaTokenDiagnostic {
  valid: boolean;
  app?: {
    id: string;
    name: string;
  };
  user?: {
    id: string;
    name: string;
    email?: string;
    type?: string;
  };
  permissions?: {
    adsManagement: boolean;
    pagesReadEngagement: boolean;
    businessManagement: boolean;
    allGranted: string[];
  };
  adAccounts?: Array<{
    id: string;
    name: string;
    accountId: string;
    status: number;
    statusLabel: string;
    currency: string;
    amountSpent?: string;
    business?: { id: string; name: string };
    pixel?: { id: string; name: string };
    page?: { id: string; name: string };
  }>;
  businesses?: Array<{ id: string; name: string }>;
  pages?: Array<{ id: string; name: string }>;
  error?: string;
  rawError?: any;
}

const GRAPH_API_VERSION = 'v21.0';
const GRAPH_BASE_URL = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

/**
 * Valida un token de acceso contra Meta Graph API v21.0 en tiempo real.
 * Obtiene la App asociada, identidad del usuario/System User, permisos reales, cuentas publicitarias, píxeles y páginas.
 */
export async function verifyMetaToken(token: string): Promise<MetaTokenDiagnostic> {
  if (!token || token.trim() === '' || token.includes('your_')) {
    return {
      valid: false,
      error: 'Token no proporcionado o es un valor de ejemplo.'
    };
  }

  try {
    const cleanToken = token.trim();

    // 1. Validar identidad con /me
    const userRes = await fetch(`${GRAPH_BASE_URL}/me?fields=id,name,email&access_token=${encodeURIComponent(cleanToken)}`);
    const userData = await userRes.json() as any;

    if (!userRes.ok || userData.error) {
      return {
        valid: false,
        error: userData.error?.message || 'Token de acceso inválido o expirado.',
        rawError: userData.error
      };
    }

    // 2. Inspeccionar token con /debug_token para extraer App oficial, scopes y tipo de usuario
    let appInfo: { id: string; name: string } | undefined;
    let userType: string = 'USER';
    let permissions = {
      adsManagement: false,
      pagesReadEngagement: false,
      businessManagement: false,
      allGranted: [] as string[]
    };

    try {
      const debugRes = await fetch(
        `${GRAPH_BASE_URL}/debug_token?input_token=${encodeURIComponent(cleanToken)}&access_token=${encodeURIComponent(cleanToken)}`
      );
      const debugData = await debugRes.json() as any;

      if (debugData.data) {
        if (debugData.data.app_id || debugData.data.application) {
          appInfo = {
            id: String(debugData.data.app_id || ''),
            name: debugData.data.application || `App ${debugData.data.app_id}`
          };
        }
        if (debugData.data.type) {
          userType = debugData.data.type;
        }
        if (Array.isArray(debugData.data.scopes)) {
          const scopes = debugData.data.scopes;
          permissions = {
            adsManagement: scopes.includes('ads_management'),
            pagesReadEngagement: scopes.includes('pages_read_engagement') || scopes.includes('pages_show_list'),
            businessManagement: scopes.includes('business_management'),
            allGranted: scopes
          };
        }
      }
    } catch {
      // Ignorar error de debug_token si no está disponible
    }

    // 3. Si debug_token no aportó permisos, consultar /me/permissions
    if (permissions.allGranted.length === 0) {
      try {
        const permRes = await fetch(`${GRAPH_BASE_URL}/me/permissions?access_token=${encodeURIComponent(cleanToken)}`);
        const permData = await permRes.json() as any;

        if (permData.data && Array.isArray(permData.data)) {
          const granted = permData.data
            .filter((p: any) => p.status === 'granted')
            .map((p: any) => p.permission);

          permissions = {
            adsManagement: granted.includes('ads_management'),
            pagesReadEngagement: granted.includes('pages_read_engagement') || granted.includes('pages_show_list'),
            businessManagement: granted.includes('business_management'),
            allGranted: granted
          };
        }
      } catch {
        // Continuar
      }
    }

    // 4. Obtener cuentas publicitarias asociadas reales con sus píxeles y páginas
    let adAccounts: any[] = [];
    try {
      const adAccRes = await fetch(
        `${GRAPH_BASE_URL}/me/adaccounts?fields=id,name,account_id,account_status,currency,amount_spent,business,adspixels{id,name},promote_pages{id,name}&access_token=${encodeURIComponent(cleanToken)}`
      );
      const adAccData = await adAccRes.json() as any;

      if (adAccData.data && Array.isArray(adAccData.data)) {
        const statusLabels: Record<number, string> = {
          1: 'ACTIVA',
          2: 'DESHABILITADA',
          3: 'PAGO_PENDIENTE',
          7: 'EN_REVISION',
          9: 'EN_CIERRE'
        };
        adAccounts = adAccData.data.map((acc: any) => ({
          id: acc.id,
          name: acc.name || `Cuenta ${acc.account_id}`,
          accountId: acc.account_id,
          status: acc.account_status,
          statusLabel: statusLabels[acc.account_status] || `ESTADO_${acc.account_status}`,
          currency: acc.currency || 'USD',
          amountSpent: acc.amount_spent,
          business: acc.business ? { id: acc.business.id, name: acc.business.name } : undefined,
          pixel: acc.adspixels?.data?.[0] ? { id: acc.adspixels.data[0].id, name: acc.adspixels.data[0].name } : undefined,
          page: acc.promote_pages?.data?.[0] ? { id: acc.promote_pages.data[0].id, name: acc.promote_pages.data[0].name } : undefined
        }));
      }
    } catch {
      // Continuar con lista vacía
    }

    // 5. Obtener Businesses y Páginas del usuario/token
    let businesses: any[] = [];
    try {
      const bRes = await fetch(`${GRAPH_BASE_URL}/me/businesses?fields=id,name&access_token=${encodeURIComponent(cleanToken)}`);
      const bData = await bRes.json() as any;
      if (bData.data && Array.isArray(bData.data)) {
        businesses = bData.data.map((b: any) => ({ id: b.id, name: b.name }));
      }
    } catch {
      // Continuar
    }

    let pages: any[] = [];
    try {
      const pRes = await fetch(`${GRAPH_BASE_URL}/me/accounts?fields=id,name&access_token=${encodeURIComponent(cleanToken)}`);
      const pData = await pRes.json() as any;
      if (pData.data && Array.isArray(pData.data)) {
        pages = pData.data.map((p: any) => ({ id: p.id, name: p.name }));
      }
    } catch {
      // Continuar
    }

    return {
      valid: true,
      app: appInfo,
      user: {
        id: userData.id,
        name: userData.name,
        email: userData.email,
        type: userType
      },
      permissions,
      adAccounts,
      businesses,
      pages
    };
  } catch (err: any) {
    return {
      valid: false,
      error: `Error de red al conectar con Meta Graph API: ${err.message}`
    };
  }
}

/**
 * Verifica el estado y permisos de una cuenta publicitaria específica en Meta Ads
 */
export async function verifyMetaAdAccount(token: string, rawAccountId: string) {
  const cleanId = rawAccountId.trim();
  const formattedId = cleanId.startsWith('act_') ? cleanId : `act_${cleanId}`;

  try {
    const res = await fetch(
      `${GRAPH_BASE_URL}/${formattedId}?fields=id,name,account_status,currency,amount_spent,business,promote_pages{id,name},adspixels{id,name},min_daily_budget&access_token=${encodeURIComponent(token)}`
    );
    const data = await res.json() as any;

    if (!res.ok || data.error) {
      return {
        success: false,
        error: data.error?.message || `No se pudo acceder a la cuenta ${formattedId}.`,
        rawError: data.error
      };
    }

    const statusLabels: Record<number, string> = {
      1: 'ACTIVA',
      2: 'DESHABILITADA',
      3: 'PAGO_PENDIENTE',
      7: 'EN_REVISION',
      9: 'EN_CIERRE'
    };

    return {
      success: true,
      account: {
        id: data.id,
        name: data.name || `Cuenta ${data.id}`,
        accountId: data.account_id || data.id.replace('act_', ''),
        status: data.account_status,
        statusLabel: statusLabels[data.account_status] || `ESTADO_${data.account_status}`,
        isActive: data.account_status === 1,
        currency: data.currency || 'USD',
        amountSpent: data.amount_spent,
        business: data.business ? { id: data.business.id, name: data.business.name } : undefined,
        pixel: data.adspixels?.data?.[0] ? { id: data.adspixels.data[0].id, name: data.adspixels.data[0].name } : undefined,
        page: data.promote_pages?.data?.[0] ? { id: data.promote_pages.data[0].id, name: data.promote_pages.data[0].name } : undefined
      }
    };
  } catch (err: any) {
    return {
      success: false,
      error: `Error al consultar la cuenta publicitaria en Meta: ${err.message}`
    };
  }
}

/**
 * Despliega una campaña a Meta Ads mediante Graph API oficial.
 * Si cuenta con credenciales reales, crea la entidad real en estado PAUSED.
 * Si está en desarrollo sin token, emite un resultado sandbox transparente.
 */
/**
 * Ejecuta una prueba predeterminada en Meta Ads (Campaña, AdSet y opcionalmente Anuncio con Creativo)
 * en estado PAUSED para validar la conectividad sin invocar la API del Agente IA (0 costo de tokens).
 */
export async function deployMetaTestCampaign(params: {
  token?: string;
  adAccountId: string;
  pageId?: string;
  brandName?: string;
}) {
  const token = params.token || process.env.META_ACCESS_TOKEN;
  const rawAccountId = params.adAccountId || process.env.META_AD_ACCOUNT_ID;
  const brandName = params.brandName || 'TicTac Performance';

  // Parámetros publicitarios predeterminados (Activos fijos, 0 llamadas a IA)
  const defaultHeadline = 'TICO Performance | Automatización & Pauta Digital';
  const defaultPrimaryText = '🚀 Impulsa el crecimiento de tu marca con estrategias de alto rendimiento. Campaña de prueba generada automáticamente por TICO Performance para verificar la integración oficial con Meta Marketing API.';
  const defaultDescription = 'Verificación oficial de conexión publicitaria en modo PAUSED.';
  const defaultCta = 'LEARN_MORE';
  const defaultImageUrl = 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1200&auto=format&fit=crop&q=80';
  const defaultLink = 'https://tictacagency.co';

  // Si no hay credenciales reales, simulación sandbox transparente
  if (!token || !rawAccountId || token.includes('your_') || rawAccountId.includes('your_') || token.startsWith('EAAB_Demo')) {
    const mockCmpId = `meta_cmp_${Date.now()}_sandbox`;
    return {
      success: true,
      mode: 'mock_sandbox',
      status: 'PAUSED',
      campaignId: mockCmpId,
      adsetId: `meta_adset_${Date.now()}_sandbox`,
      adId: `meta_ad_${Date.now()}_sandbox`,
      creativeId: `meta_cr_${Date.now()}_sandbox`,
      adsManagerUrl: `https://adsmanager.facebook.com/adsmanager/manage/campaigns?act=${rawAccountId?.replace('act_', '') || 'sandbox'}`,
      message: 'Prueba predeterminada completada en Modo Sandbox (Campaña, Conjunto y Anuncio simulados en PAUSED sin costo de IA).',
      steps: {
        campaign: { success: true, id: mockCmpId },
        adSet: { success: true, id: `meta_adset_${Date.now()}_sandbox` },
        creative: { success: true, id: `meta_cr_${Date.now()}_sandbox` },
        ad: { success: true, id: `meta_ad_${Date.now()}_sandbox` }
      },
      details: {
        brandName,
        objective: 'OUTCOME_TRAFFIC',
        headline: defaultHeadline,
        primaryText: defaultPrimaryText,
        callToAction: defaultCta,
        imageUrl: defaultImageUrl,
        targeting: { countries: ['CO'], ageRange: '18 - 65' },
        budget: '$5.00 USD / Diario (PAUSED)'
      }
    };
  }

  const accountId = rawAccountId.startsWith('act_') ? rawAccountId : `act_${rawAccountId}`;
  const numericAccountId = accountId.replace('act_', '');
  const cleanToken = token.trim();

  // 1. Consultar metadatos de la cuenta para detectar divisa, presupuesto mínimo y posibles páginas
  let accountCurrency = 'USD';
  let minDailyBudget = 200; // 2.00 USD en centavos por defecto
  let detectedPageId = params.pageId;

  try {
    const accRes = await fetch(
      `${GRAPH_BASE_URL}/${accountId}?fields=currency,min_daily_budget,promote_pages{id,name}&access_token=${encodeURIComponent(cleanToken)}`
    );
    const accData = await accRes.json() as any;
    if (accData && !accData.error) {
      accountCurrency = accData.currency || 'USD';
      if (accData.min_daily_budget) {
        minDailyBudget = Number(accData.min_daily_budget);
      } else if (accountCurrency === 'COP') {
        minDailyBudget = 1000000; // 10.000 COP
      } else {
        minDailyBudget = 500; // 5.00 USD
      }

      if (!detectedPageId && accData.promote_pages?.data?.[0]?.id) {
        detectedPageId = accData.promote_pages.data[0].id;
      }
    }
  } catch {
    // Continuar con valores por defecto si falla la consulta preliminar
  }

  // Si aún no hay página, intentar consultar /me/accounts
  if (!detectedPageId) {
    try {
      const pageRes = await fetch(`${GRAPH_BASE_URL}/me/accounts?fields=id,name&access_token=${encodeURIComponent(cleanToken)}`);
      const pageData = await pageRes.json() as any;
      if (pageData?.data?.[0]?.id) {
        detectedPageId = pageData.data[0].id;
      }
    } catch {
      // Continuar
    }
  }

  const steps: {
    campaign: { success: boolean; id?: string; error?: string };
    adSet: { success: boolean; id?: string; error?: string };
    creative: { success: boolean; id?: string; error?: string };
    ad: { success: boolean; id?: string; error?: string };
  } = {
    campaign: { success: false },
    adSet: { success: false },
    creative: { success: false },
    ad: { success: false }
  };

  const countries = accountCurrency === 'COP' ? ['CO'] : (accountCurrency === 'MXN' ? ['MX'] : ['CO', 'US']);

  try {
    // PASO 1: Crear Campaña en PAUSED (is_adset_budget_sharing_enabled: false requerido por Meta)
    const campaignPayload = {
      name: `[TICO-TEST] ${brandName} - Verificación de Conexión (PAUSED)`,
      objective: 'OUTCOME_TRAFFIC',
      status: 'PAUSED',
      special_ad_categories: ['NONE'],
      is_adset_budget_sharing_enabled: false,
      access_token: cleanToken
    };

    const cmpRes = await fetch(`${GRAPH_BASE_URL}/${accountId}/campaigns`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(campaignPayload)
    });
    const cmpData = await cmpRes.json() as any;

    if (!cmpRes.ok || cmpData.error) {
      const errMessage = cmpData.error?.message || 'Error al crear la campaña de prueba en Meta Ads';
      return {
        success: false,
        mode: 'live_api',
        status: 'FAILED',
        error: errMessage,
        rawError: cmpData.error,
        message: `Fallo en Meta Graph API al crear la Campaña: ${errMessage}`,
        steps
      };
    }

    const campaignId = cmpData.id;
    steps.campaign = { success: true, id: campaignId };

    // PASO 2: Crear Conjunto de Anuncios (AdSet) con segmentación predeterminada en PAUSED
    let adsetId: string | undefined;
    try {
      const adsetPayload = {
        name: `[TICO-TEST] Conjunto de Prueba - Segmentación Predeterminada`,
        campaign_id: campaignId,
        optimization_goal: 'LINK_CLICKS',
        billing_event: 'IMPRESSIONS',
        daily_budget: minDailyBudget,
        bid_strategy: 'LOWEST_COST_WITHOUT_CAP',
        targeting: {
          geo_locations: {
            countries
          },
          age_min: 18,
          age_max: 65
        },
        status: 'PAUSED',
        access_token: cleanToken
      };

      const adsetRes = await fetch(`${GRAPH_BASE_URL}/${accountId}/adsets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(adsetPayload)
      });
      const adsetData = await adsetRes.json() as any;

      if (adsetRes.ok && adsetData.id) {
        adsetId = adsetData.id;
        steps.adSet = { success: true, id: adsetId };
      } else {
        steps.adSet = { success: false, error: adsetData.error?.message };
      }
    } catch (e: any) {
      steps.adSet = { success: false, error: e.message };
    }

    // PASO 3: Si se cuenta con Fanpage (Página de Facebook), crear Creativo con Imagen y Anuncio en PAUSED
    let creativeId: string | undefined;
    let adId: string | undefined;

    if (detectedPageId && adsetId) {
      try {
        const creativePayload = {
          name: `[TICO-TEST] Creativo de Muestra - ${brandName}`,
          object_story_spec: {
            page_id: detectedPageId,
            link_data: {
              message: defaultPrimaryText,
              link: defaultLink,
              name: defaultHeadline,
              description: defaultDescription,
              picture: defaultImageUrl,
              call_to_action: {
                type: defaultCta,
                value: { link: defaultLink }
              }
            }
          },
          access_token: cleanToken
        };

        const crRes = await fetch(`${GRAPH_BASE_URL}/${accountId}/adcreatives`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(creativePayload)
        });
        const crData = await crRes.json() as any;

        if (crRes.ok && crData.id) {
          creativeId = crData.id;
          steps.creative = { success: true, id: creativeId };

          // Crear el anuncio
          const adPayload = {
            name: `[TICO-TEST] Anuncio de Muestra (PAUSED)`,
            adset_id: adsetId,
            creative: { creative_id: creativeId },
            status: 'PAUSED',
            access_token: cleanToken
          };

          const adRes = await fetch(`${GRAPH_BASE_URL}/${accountId}/ads`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(adPayload)
          });
          const adData = await adRes.json() as any;

          if (adRes.ok && adData.id) {
            adId = adData.id;
            steps.ad = { success: true, id: adId };
          } else {
            steps.ad = { success: false, error: adData.error?.message };
          }
        } else {
          steps.creative = { success: false, error: crData.error?.message };
        }
      } catch (e: any) {
        steps.creative = { success: false, error: e.message };
      }
    } else if (!detectedPageId) {
      steps.creative = {
        success: false,
        error: 'Sin Fanpage asociada: Para crear anuncios con creativos visuales, vincula una Página de Facebook en Meta Business Suite.'
      };
    }

    const adsManagerUrl = `https://adsmanager.facebook.com/adsmanager/manage/campaigns?act=${numericAccountId}`;

    let successMsg = `¡Prueba oficial exitosa en Meta Ads! Campaña creada (ID: ${campaignId}) en estado PAUSED.`;
    if (adsetId && adId) {
      successMsg = `¡Estructura publicitaria completa creada en Meta Ads (Campaña, Conjunto y Anuncio con creativo)! Todo en estado PAUSED (0 gasto).`;
    } else if (adsetId) {
      successMsg = `¡Campaña y Conjunto de anuncios creados en Meta Ads (PAUSED)! Para adjuntar el anuncio visual final, asigna una Página de Facebook a tu usuario en Meta Business Suite.`;
    }

    return {
      success: true,
      mode: 'live_api',
      status: 'PAUSED',
      campaignId,
      adsetId,
      creativeId,
      adId,
      pageId: detectedPageId,
      adsManagerUrl,
      message: successMsg,
      steps,
      details: {
        brandName,
        objective: 'OUTCOME_TRAFFIC',
        headline: defaultHeadline,
        primaryText: defaultPrimaryText,
        callToAction: defaultCta,
        imageUrl: defaultImageUrl,
        targeting: { countries, ageRange: '18 - 65', objective: 'Clics en el enlace' },
        budget: `${minDailyBudget / 100} ${accountCurrency} / Diario (En PAUSED, sin gasto)`
      }
    };
  } catch (error: any) {
    return {
      success: false,
      mode: 'live_api',
      status: 'FAILED',
      error: error.message,
      message: `Error de conexión con Meta Graph API: ${error.message}`,
      steps
    };
  }
}

/**
 * Despliega una campaña a Meta Ads mediante Graph API oficial.
 * Si cuenta con credenciales reales, crea la entidad real en estado PAUSED.
 * Si está en desarrollo sin token, emite un resultado sandbox transparente.
 */
export async function deployMetaCampaign(
  payload: MetaCampaignPayload, 
  customToken?: string, 
  customAccountId?: string
) {
  const token = customToken || process.env.META_ACCESS_TOKEN;
  const rawAccountId = customAccountId || process.env.META_AD_ACCOUNT_ID;

  // Si no hay credenciales reales en .env ni enviadas en la petición, modo sandbox explícito
  if (!token || !rawAccountId || token.includes('your_') || rawAccountId.includes('your_') || token.startsWith('EAAB_Demo')) {
    return {
      success: true,
      mode: 'mock_sandbox',
      campaignId: `meta_cmp_${Date.now()}_sandbox`,
      status: 'PAUSED',
      message: 'Campaña registrada en modo sandbox (sin token real de Meta vinculado).'
    };
  }

  const accountId = rawAccountId.startsWith('act_') ? rawAccountId : `act_${rawAccountId}`;

  try {
    const response = await fetch(`${GRAPH_BASE_URL}/${accountId}/campaigns`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: payload.name,
        objective: payload.objective || 'OUTCOME_LEADS',
        status: 'PAUSED',
        special_ad_categories: ['NONE'],
        is_adset_budget_sharing_enabled: false,
        access_token: token
      })
    });

    const data = await response.json() as any;

    if (!response.ok || data.error) {
      return {
        success: false,
        mode: 'live_api',
        error: data.error?.message || 'Error al crear la campaña en Meta Ads',
        rawError: data.error,
        status: 'FAILED',
        message: `Fallo en Meta Graph API: ${data.error?.message}`
      };
    }

    return {
      success: true,
      mode: 'live_api',
      campaignId: data.id,
      status: 'PAUSED',
      message: `Campaña creada exitosamente en Meta Ads (ID: ${data.id}) en estado PAUSED para activación humana.`
    };
  } catch (error: any) {
    return {
      success: false,
      mode: 'live_api',
      error: error.message,
      status: 'FAILED',
      message: `Error de conexión con Meta Graph API: ${error.message}`
    };
  }
}

/**
 * Consulta campañas existentes en una cuenta publicitaria de Meta
 */
export async function fetchMetaCampaigns(token?: string, rawAccountId?: string) {
  const cleanToken = token || process.env.META_ACCESS_TOKEN;
  const rawId = rawAccountId || process.env.META_AD_ACCOUNT_ID;

  if (!cleanToken || !rawId || cleanToken.includes('your_') || rawId.includes('your_') || cleanToken.startsWith('EAAB_Demo')) {
    // Retorno demo sandbox
    return {
      success: true,
      mode: 'mock_sandbox',
      campaigns: [
        { id: 'cmp_demo_101', name: '[TICO] UrbanFit — Tráfico Frío Q1 (PAUSED)', status: 'PAUSED', objective: 'OUTCOME_TRAFFIC' },
        { id: 'cmp_demo_102', name: '[TICO] UrbanFit — Retargeting Carrito Abandonado (ACTIVE)', status: 'ACTIVE', objective: 'OUTCOME_SALES' },
        { id: 'cmp_demo_103', name: '[TICO] Clientes Potenciales WhatsApp — Campaña Principal', status: 'PAUSED', objective: 'OUTCOME_LEADS' }
      ]
    };
  }

  const accountId = rawId.startsWith('act_') ? rawId : `act_${rawId}`;

  try {
    // 1. Intentar consultar con filtro de estados activos y pausados con JSON string URL-encoded
    const encodedStatus = encodeURIComponent('["ACTIVE","PAUSED"]');
    let res = await fetch(
      `${GRAPH_BASE_URL}/${accountId}/campaigns?fields=id,name,status,objective,effective_status&effective_status=${encodedStatus}&limit=100&access_token=${encodeURIComponent(cleanToken.trim())}`
    );
    let data = await res.json() as any;

    // 2. Si hubo error en el filtro de effective_status, intentar sin filtro para traer todas las campañas
    if (!res.ok || data.error) {
      const fallbackRes = await fetch(
        `${GRAPH_BASE_URL}/${accountId}/campaigns?fields=id,name,status,objective,effective_status&limit=100&access_token=${encodeURIComponent(cleanToken.trim())}`
      );
      const fallbackData = await fallbackRes.json() as any;
      if (fallbackRes.ok && !fallbackData.error) {
        res = fallbackRes;
        data = fallbackData;
      }
    }

    if (!res.ok || data.error) {
      return {
        success: false,
        error: data.error?.message || 'Error al consultar campañas de Meta Ads.',
        campaigns: []
      };
    }

    return {
      success: true,
      mode: 'live_api',
      campaigns: (data.data || []).map((c: any) => ({
        id: c.id,
        name: c.name,
        status: c.status,
        objective: c.objective
      }))
    };
  } catch (err: any) {
    return {
      success: false,
      error: `Error de red al consultar campañas: ${err.message}`,
      campaigns: []
    };
  }
}

/**
 * Consulta conjuntos de anuncios de una campaña específica en Meta Ads
 */
export async function fetchMetaAdSets(token?: string, rawAccountId?: string, campaignId?: string) {
  const cleanToken = token || process.env.META_ACCESS_TOKEN;
  const rawId = rawAccountId || process.env.META_AD_ACCOUNT_ID;

  if (!cleanToken || !rawId || cleanToken.includes('your_') || rawId.includes('your_') || cleanToken.startsWith('EAAB_Demo')) {
    // Retorno demo sandbox
    return {
      success: true,
      mode: 'mock_sandbox',
      adSets: [
        { id: 'adset_demo_201', name: 'Audiencia Hombres 20-35 Fitness & Crossfit', status: 'PAUSED', optimization_goal: 'OFFSITE_CONVERSIONS' },
        { id: 'adset_demo_202', name: 'Audiencia Mujeres 22-40 Vida Saludable & Yoga', status: 'PAUSED', optimization_goal: 'LINK_CLICKS' },
        { id: 'adset_demo_203', name: 'Público Amplio (Broad) Advantage+ Colombia', status: 'ACTIVE', optimization_goal: 'OUTCOME_LEADS' }
      ]
    };
  }

  const accountId = rawId.startsWith('act_') ? rawId : `act_${rawId}`;
  if (!campaignId) {
    return { success: false, error: 'Se requiere el ID de la campaña para listar sus conjuntos de anuncios.', adSets: [] };
  }

  try {
    // 1. Endpoint canónico de Meta Graph API para los adsets de una campaña
    let res = await fetch(
      `${GRAPH_BASE_URL}/${encodeURIComponent(campaignId)}/adsets?fields=id,name,status,optimization_goal,daily_budget,lifetime_budget&limit=100&access_token=${encodeURIComponent(cleanToken.trim())}`
    );
    let data = await res.json() as any;

    // 2. Si falla directo en /{campaignId}/adsets, intentar vía /{accountId}/adsets con filtro de campaña
    if (!res.ok || data.error) {
      const filterParam = encodeURIComponent(JSON.stringify([{ field: 'campaign.id', operator: 'EQUAL', value: campaignId }]));
      const altRes = await fetch(
        `${GRAPH_BASE_URL}/${accountId}/adsets?filtering=${filterParam}&fields=id,name,status,optimization_goal,daily_budget,lifetime_budget&limit=100&access_token=${encodeURIComponent(cleanToken.trim())}`
      );
      const altData = await altRes.json() as any;
      if (altRes.ok && !altData.error) {
        res = altRes;
        data = altData;
      }
    }

    if (!res.ok || data.error) {
      return {
        success: false,
        error: data.error?.message || 'Error al consultar conjuntos de anuncios de Meta.',
        adSets: []
      };
    }

    return {
      success: true,
      mode: 'live_api',
      adSets: (data.data || []).map((a: any) => ({
        id: a.id,
        name: a.name,
        status: a.status,
        optimization_goal: a.optimization_goal
      }))
    };
  } catch (err: any) {
    return {
      success: false,
      error: `Error de red al consultar adsets: ${err.message}`,
      adSets: []
    };
  }
}

/**
 * Despliega una estructura avanzada (Campaña Completa o Anuncio Individual) creada con MetaAdBuilder
 */
export async function deployMetaBuilder(
  payload: any,
  customToken?: string,
  customAccountId?: string
) {
  const token = customToken || process.env.META_ACCESS_TOKEN;
  const rawAccountId = customAccountId || payload.adAccountId || process.env.META_AD_ACCOUNT_ID;
  const isSingleAd = payload.mode === 'single_ad';

  if (isSingleAd) {
    if (!payload.existingCampaignId || !payload.existingAdSetId) {
      return {
        success: false,
        error: 'Se requiere seleccionar la Campaña y el Conjunto de Anuncios existentes donde se insertará el anuncio individual.'
      };
    }
  }

  // Si no hay credenciales reales, simulación sandbox transparente
  if (
    !token ||
    !rawAccountId ||
    token.includes('your_') ||
    rawAccountId.includes('your_') ||
    token.startsWith('EAAB_Demo') ||
    token.includes('test') ||
    token.includes('simul') ||
    token.includes('mock')
  ) {
    const mockCmpId = isSingleAd ? payload.existingCampaignId : `meta_cmp_${Date.now()}_builder`;
    const mockAdSetId = isSingleAd ? payload.existingAdSetId : `meta_adset_${Date.now()}_builder`;
    const createdAds = (payload.ads || [{ id: 'ad_1', name: 'Anuncio 1' }]).map((a: any, i: number) => ({
      id: `meta_ad_${Date.now()}_${i}`,
      name: a.name || `Anuncio ${i + 1}`,
      creativeId: `meta_cr_${Date.now()}_${i}`
    }));

    return {
      success: true,
      mode: 'mock_sandbox',
      status: 'PAUSED',
      campaignId: mockCmpId,
      adSets: isSingleAd ? [{ id: mockAdSetId }] : (payload.adSets || []).map((s: any, idx: number) => ({ id: `meta_adset_${Date.now()}_${idx}`, name: s.name })),
      ads: createdAds,
      adsManagerUrl: `https://adsmanager.facebook.com/adsmanager/manage/campaigns?act=${rawAccountId?.replace('act_', '') || 'sandbox'}`,
      message: isSingleAd 
        ? `¡Anuncio registrado en modo sandbox (PAUSED) dentro del conjunto ${mockAdSetId}!`
        : `¡Estructura completa de campaña (${payload.adSets?.length || 1} AdSet(s), ${payload.ads?.length || 1} Anuncio(s)) creada en modo sandbox (PAUSED)!`
    };
  }

  const accountId = rawAccountId.startsWith('act_') ? rawAccountId : `act_${rawAccountId}`;
  const cleanToken = token.trim();
  const numericAccountId = accountId.replace('act_', '');

  try {
    // 1. Detectar Fanpage si no viene en payload
    let pageId = payload.pageId;
    if (!pageId) {
      try {
        const pRes = await fetch(`${GRAPH_BASE_URL}/me/accounts?fields=id,name&access_token=${encodeURIComponent(cleanToken)}`);
        const pData = await pRes.json() as any;
        if (pData?.data?.[0]?.id) {
          pageId = pData.data[0].id;
        }
      } catch {
        // Ignorar
      }
    }

    if (!pageId) {
      return {
        success: false,
        error: 'No se detectó una Fanpage (Página de Facebook) asociada. Meta exige una Fanpage para crear los creativos publicitarios.'
      };
    }

    const defaultImageUrl = 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1200&auto=format&fit=crop&q=80';

    // ==========================================
    // CASO A: MODO ANUNCIO INDIVIDUAL
    // ==========================================
    if (isSingleAd) {
      const targetAdSetId = payload.existingAdSetId;
      if (!targetAdSetId) {
        return { success: false, error: 'Se requiere el ID del Conjunto de Anuncios destino para publicar el anuncio individual.' };
      }

      const targetAd = payload.ads?.[0] || {
        name: 'Anuncio Individual Tico',
        conceptAngle: 'Oferta Directa',
        destinationUrl: 'https://tictacagency.co',
        primaryText: 'Descubre las mejores soluciones para tu marca.',
        headline: 'Oferta Exclusiva',
        callToAction: 'LEARN_MORE'
      };

      const creativePayload = {
        name: `[TICO-CR] ${targetAd.name}`,
        object_story_spec: {
          page_id: pageId,
          link_data: {
            message: targetAd.primaryText || 'Conoce nuestra propuesta.',
            link: targetAd.destinationUrl || 'https://tictacagency.co',
            name: targetAd.headline || targetAd.name,
            description: targetAd.description || '',
            picture: targetAd.creativeAsset?.url || defaultImageUrl,
            call_to_action: {
              type: targetAd.callToAction || 'LEARN_MORE',
              value: { link: targetAd.destinationUrl || 'https://tictacagency.co' }
            }
          }
        },
        access_token: cleanToken
      };

      const crRes = await fetch(`${GRAPH_BASE_URL}/${accountId}/adcreatives`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(creativePayload)
      });
      const crData = await crRes.json() as any;

      if (!crRes.ok || crData.error) {
        return { success: false, error: `Error al crear AdCreative en Meta: ${crData.error?.message || crRes.statusText}` };
      }

      const creativeId = crData.id;

      const adPayload = {
        name: `[TICO] ${targetAd.name}`,
        adset_id: targetAdSetId,
        creative: { creative_id: creativeId },
        status: 'PAUSED',
        access_token: cleanToken
      };

      const adRes = await fetch(`${GRAPH_BASE_URL}/${accountId}/ads`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(adPayload)
      });
      const adData = await adRes.json() as any;

      if (!adRes.ok || adData.error) {
        return { success: false, error: `Error al crear el Ad en Meta: ${adData.error?.message || adRes.statusText}` };
      }

      return {
        success: true,
        mode: 'live_api',
        status: 'PAUSED',
        campaignId: payload.existingCampaignId,
        adSetId: targetAdSetId,
        creativeId,
        adId: adData.id,
        adsManagerUrl: `https://adsmanager.facebook.com/adsmanager/manage/campaigns?act=${numericAccountId}`,
        message: `¡Anuncio individual (${targetAd.name}) creado exitosamente en estado PAUSED dentro de tu conjunto existente!`
      };
    }

    // ==========================================
    // CASO B: MODO CAMPAÑA COMPLETA
    // ==========================================
    const isCBO = payload.budgetType === 'CBO';
    const totalDailyBudgetInCents = payload.totalBudget ? Math.max(200, Math.round(payload.totalBudget * 100)) : 1000;

    // 1. Crear Campaña
    const campaignBody: any = {
      name: `[TICO] ${payload.campaignName || payload.brandName + ' - Campaña'}`,
      objective: payload.objective || 'OUTCOME_LEADS',
      status: 'PAUSED',
      special_ad_categories: [payload.specialAdCategory || 'NONE'],
      is_adset_budget_sharing_enabled: isCBO,
      access_token: cleanToken
    };

    if (isCBO) {
      campaignBody.daily_budget = totalDailyBudgetInCents;
    }

    const cmpRes = await fetch(`${GRAPH_BASE_URL}/${accountId}/campaigns`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(campaignBody)
    });
    const cmpData = await cmpRes.json() as any;

    if (!cmpRes.ok || cmpData.error) {
      return { success: false, error: `Error al crear Campaña en Meta: ${cmpData.error?.message || cmpRes.statusText}` };
    }

    const campaignId = cmpData.id;

    // 2. Crear AdSets
    const createdAdSets: Array<{ formId: string; metaId: string; name: string }> = [];
    const adSetsToCreate = (payload.adSets && payload.adSets.length > 0) ? payload.adSets : [
      { id: 'adset_default', name: 'Conjunto Principal - Audiencia Sugerida', countries: ['CO'], ageMin: 18, ageMax: 65, gender: 'all' }
    ];
    let lastAdSetError = '';

    for (const adset of adSetsToCreate) {
      const isSpecialCat = payload.specialAdCategory && payload.specialAdCategory !== 'NONE';
      const ageMin = isSpecialCat ? 18 : (adset.ageMin || 18);
      const ageMax = isSpecialCat ? 65 : (adset.ageMax || 65);
      const countries = (adset.countries && adset.countries.length > 0) ? adset.countries : ['CO'];

      const targeting: any = {
        geo_locations: { countries },
        age_min: ageMin,
        age_max: ageMax
      };

      if (!isSpecialCat && adset.gender && adset.gender !== 'all') {
        targeting.genders = adset.gender === 'men' ? [1] : [2];
      }

      let optGoal = adset.optimizationGoal || 'LINK_CLICKS';
      const promotedObject: any = {};

      if (payload.objective === 'OUTCOME_LEADS') {
        if (payload.pixelId) {
          optGoal = 'OFFSITE_CONVERSIONS';
          promotedObject.pixel_id = payload.pixelId;
          promotedObject.custom_event_type = 'LEAD';
        } else if (pageId) {
          optGoal = 'LEAD_GENERATION';
          promotedObject.page_id = pageId;
        } else {
          optGoal = 'LINK_CLICKS';
        }
      } else if (payload.objective === 'OUTCOME_SALES') {
        if (payload.pixelId) {
          optGoal = 'OFFSITE_CONVERSIONS';
          promotedObject.pixel_id = payload.pixelId;
          promotedObject.custom_event_type = 'PURCHASE';
        } else {
          optGoal = 'LINK_CLICKS';
        }
      } else if (payload.objective === 'OUTCOME_TRAFFIC') {
        optGoal = 'LINK_CLICKS';
      }

      const adsetBody: any = {
        name: `[TICO-SET] ${adset.name || 'Conjunto de Anuncios'}`,
        campaign_id: campaignId,
        optimization_goal: optGoal,
        billing_event: 'IMPRESSIONS',
        bid_strategy: payload.bidStrategy || 'LOWEST_COST_WITHOUT_CAP',
        targeting,
        status: 'PAUSED',
        access_token: cleanToken
      };

      if (Object.keys(promotedObject).length > 0) {
        adsetBody.promoted_object = promotedObject;
      }

      // Si es ABO, se asigna presupuesto individual al conjunto
      if (!isCBO) {
        const adsetBudget = adset.budgetAmount ? Math.max(200, Math.round(adset.budgetAmount * 100)) : Math.round(totalDailyBudgetInCents / adSetsToCreate.length);
        adsetBody.daily_budget = adsetBudget;
      }

      const adsetRes = await fetch(`${GRAPH_BASE_URL}/${accountId}/adsets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(adsetBody)
      });
      const adsetData = await adsetRes.json() as any;

      if (adsetRes.ok && adsetData.id) {
        createdAdSets.push({ formId: adset.id, metaId: adsetData.id, name: adset.name });
      } else {
        lastAdSetError = adsetData.error?.message || adsetRes.statusText;
        console.warn(`Error creating adset ${adset.name}:`, adsetData.error);
      }
    }

    if (createdAdSets.length === 0) {
      return {
        success: false,
        error: `La campaña fue creada en Meta (ID: ${campaignId}) pero falló la creación de los conjuntos de anuncios: ${lastAdSetError || 'Revisa segmentación y presupuesto.'}`
      };
    }

    // 3. Crear Creativos y Anuncios
    const createdAds: Array<{ name: string; metaId: string; creativeId: string }> = [];
    const adsToCreate = (payload.ads && payload.ads.length > 0) ? payload.ads : [
      { id: 'ad_1', adSetId: createdAdSets[0].formId, name: 'Anuncio Principal', headline: 'Propuesta de Valor', primaryText: 'Descubre nuestros servicios.' }
    ];
    let lastAdError = '';

    for (const ad of adsToCreate) {
      // Buscar adset destino correspondiente
      const matchedAdSet = createdAdSets.find(s => s.formId === ad.adSetId) || createdAdSets[0];
      const imageUrl = ad.creativeAsset?.url || defaultImageUrl;
      const destinationLink = ad.destinationUrl || 'https://tictacagency.co';

      // 3.1 Crear AdCreative
      const creativeBody = {
        name: `[TICO-CR] ${ad.name || 'Creativo de Anuncio'}`,
        object_story_spec: {
          page_id: pageId,
          link_data: {
            message: ad.primaryText || 'Conoce nuestra propuesta exclusiva.',
            link: destinationLink,
            name: ad.headline || ad.name || 'Solución Destacada',
            description: ad.description || '',
            picture: imageUrl,
            call_to_action: {
              type: ad.callToAction || 'LEARN_MORE',
              value: { link: destinationLink }
            }
          }
        },
        access_token: cleanToken
      };

      const crRes = await fetch(`${GRAPH_BASE_URL}/${accountId}/adcreatives`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(creativeBody)
      });
      const crData = await crRes.json() as any;

      if (crRes.ok && crData.id) {
        const creativeId = crData.id;

        // 3.2 Crear Ad
        const adBody = {
          name: `[TICO] ${ad.name || 'Anuncio'}`,
          adset_id: matchedAdSet.metaId,
          creative: { creative_id: creativeId },
          status: 'PAUSED',
          access_token: cleanToken
        };

        const adRes = await fetch(`${GRAPH_BASE_URL}/${accountId}/ads`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(adBody)
        });
        const adData = await adRes.json() as any;

        if (adRes.ok && adData.id) {
          createdAds.push({ name: ad.name, metaId: adData.id, creativeId });
        } else {
          lastAdError = adData.error?.message || adRes.statusText;
        }
      } else {
        lastAdError = crData.error?.message || crRes.statusText;
      }
    }

    if (createdAds.length === 0 && adsToCreate.length > 0) {
      return {
        success: false,
        error: `La campaña y conjuntos fueron creados en Meta (Campaña ID: ${campaignId}), pero falló la creación de los anuncios: ${lastAdError || 'Error de creative o permiso sobre la Fanpage.'}`
      };
    }

    const adsManagerUrl = `https://adsmanager.facebook.com/adsmanager/manage/campaigns?act=${numericAccountId}&selected_campaign_ids=${campaignId}`;

    return {
      success: true,
      mode: 'live_api',
      status: 'PAUSED',
      campaignId,
      adSets: createdAdSets,
      ads: createdAds,
      adsManagerUrl,
      message: `¡Campaña completa orquestada con éxito en Meta Ads! Creados: 1 Campaña, ${createdAdSets.length} Conjunto(s) y ${createdAds.length} Anuncio(s). Todo en estado PAUSED (0 gasto imprevisto).`
    };
  } catch (error: any) {
    return {
      success: false,
      mode: 'live_api',
      status: 'FAILED',
      error: error.message,
      message: `Fallo durante el despliegue con Meta Marketing API: ${error.message}`
    };
  }
}

