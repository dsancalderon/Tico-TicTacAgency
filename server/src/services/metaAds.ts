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
    // PASO 1: Crear Campaña en PAUSED (Objetivo de Tráfico para máxima compatibilidad)
    const campaignPayload = {
      name: `[TICO-TEST] ${brandName} - Verificación de Conexión (PAUSED)`,
      objective: 'OUTCOME_TRAFFIC',
      status: 'PAUSED',
      special_ad_categories: ['NONE'],
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
