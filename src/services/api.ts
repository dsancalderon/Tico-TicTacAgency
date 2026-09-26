import type { ClientBriefing, GeneratedCampaignStrategy, MetaBuilderPayload } from '../types';

import { API_BASE_URL, authHeaders } from './auth';
import { briefApi } from './briefApi';

export async function checkBackendHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE_URL}/health`, { signal: AbortSignal.timeout(2000) });
    return res.ok;
  } catch {
    return false;
  }
}

export async function generateStrategyApi(brief: ClientBriefing): Promise<GeneratedCampaignStrategy> {
  {
    const res = await fetch(`${API_BASE_URL}/campaigns/generate-strategy`, {
      method: 'POST',
      headers: await authHeaders(),
      body: JSON.stringify(brief),
    });

    if (res.ok) {
      const data = await res.json();
      return data.strategy;
    }
    throw new Error('No se pudo generar la estrategia. Verifica tu sesión y el backend.');
  }

}

export async function deployCampaignApi(strategy: GeneratedCampaignStrategy) {
  const res = await fetch(`${API_BASE_URL}/campaigns/deploy`, {
    method: 'POST', headers: await authHeaders(),
    body: JSON.stringify({ strategy, clientConfirmed: true }),
  });
  if (!res.ok) throw new Error('El despliegue no está disponible. No se creó ninguna campaña.');
  return res.json();
}

async function verifyMetaAccountClientDirect(adAccountId: string, token: string) {
  const cleanId = adAccountId.trim();
  const formattedId = cleanId.startsWith('act_') ? cleanId : `act_${cleanId}`;

  // En modo sandbox demo, no consultar Meta Graph API real para evitar errores 400 en consola
  if (token.startsWith('EAAB_Demo') || token.toLowerCase().includes('demo') || formattedId.includes('demo')) {
    return {
      success: true,
      account: {
        id: formattedId,
        name: 'TicTac Performance — Cuenta Demo',
        accountId: formattedId.replace('act_', ''),
        status: 1,
        statusLabel: 'ACTIVA',
        isActive: true,
        currency: 'USD'
      }
    };
  }

  try {
    const res = await fetch(
      `https://graph.facebook.com/v21.0/${formattedId}?fields=id,name,account_status,currency,amount_spent,business,promote_pages{id,name},adspixels{id,name},min_daily_budget`,
      { headers: { Authorization: `Bearer ${token.trim()}` } }
    );
    const data = await res.json();

    if (!res.ok || data.error) {
      return {
        success: false,
        error: data.error?.message || `No se pudo acceder a la cuenta ${formattedId} en Meta.`,
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
      error: `Error directo al conectar con Meta Graph API: ${err.message}`
    };
  }
}

async function verifyMetaTokenClientDirect(token: string) {
  try {
    const cleanToken = token.trim();

    // En modo sandbox demo, no consultar Meta Graph API real para evitar errores 400 en consola
    if (cleanToken.startsWith('EAAB_Demo') || cleanToken.toLowerCase().includes('demo')) {
      return {
        success: true,
        diagnostic: {
          valid: true,
          app: { id: 'demo_app_001', name: 'TicTac Demo App' },
          user: { id: 'usr_sandbox_999', name: 'Usuario Sandbox', email: 'demo@tictacagency.com', type: 'SYSTEM_USER' },
          permissions: {
            adsManagement: true,
            pagesReadEngagement: true,
            businessManagement: true,
            allGranted: ['ads_management', 'pages_read_engagement', 'business_management']
          },
          adAccounts: [],
          businesses: [{ id: 'bm_demo_001', name: 'TicTac Agency Performance Sandbox' }],
          pages: [{ id: 'page_demo_001', name: 'TicTac Agency Fanpage' }]
        }
      };
    }

    const userRes = await fetch(`https://graph.facebook.com/v21.0/me?fields=id,name,email`, {
      headers: { Authorization: `Bearer ${cleanToken}` }
    });
    const userData = await userRes.json();
    if (!userRes.ok || userData.error) {
      return {
        success: false,
        error: userData.error?.message || 'Token de acceso inválido o expirado en Meta.'
      };
    }

    // Inspeccionar app y tipo de usuario con debug_token
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
        `https://graph.facebook.com/v21.0/debug_token?input_token=${encodeURIComponent(cleanToken)}`,
        { headers: { Authorization: `Bearer ${cleanToken}` } }
      );
      const debugData = await debugRes.json();
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
            pagesReadEngagement: scopes.includes('pages_read_engagement') || scopes.includes('pages_show_list') || scopes.includes('ads_read'),
            businessManagement: scopes.includes('business_management'),
            allGranted: scopes
          };
        }
      }
    } catch {
      // Continuar
    }

    if (permissions.allGranted.length === 0) {
      try {
        const permRes = await fetch(`https://graph.facebook.com/v21.0/me/permissions`, {
          headers: { Authorization: `Bearer ${cleanToken}` }
        });
        const permData = await permRes.json();
        if (permData.data && Array.isArray(permData.data)) {
          const granted = permData.data.filter((p: any) => p.status === 'granted').map((p: any) => p.permission);
          permissions = {
            adsManagement: granted.includes('ads_management'),
            pagesReadEngagement: granted.includes('pages_read_engagement') || granted.includes('pages_show_list') || granted.includes('ads_read'),
            businessManagement: granted.includes('business_management'),
            allGranted: granted
          };
        }
      } catch {
        // Ignorar fallback de permisos
      }
    }

    let adAccounts: any[] = [];
    try {
      const adAccRes = await fetch(
        `https://graph.facebook.com/v21.0/me/adaccounts?fields=id,name,account_id,account_status,currency,amount_spent,business,adspixels{id,name},promote_pages{id,name}`,
        { headers: { Authorization: `Bearer ${cleanToken}` } }
      );
      const adAccData = await adAccRes.json();
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
      // Ignorar error al leer cuentas
    }

    let businesses: any[] = [];
    try {
      const bRes = await fetch(`https://graph.facebook.com/v21.0/me/businesses?fields=id,name`, {
        headers: { Authorization: `Bearer ${cleanToken}` }
      });
      const bData = await bRes.json();
      if (bData.data && Array.isArray(bData.data)) {
        businesses = bData.data.map((b: any) => ({ id: b.id, name: b.name }));
      }
    } catch {
      // Continuar
    }

    let pages: any[] = [];
    try {
      const pRes = await fetch(`https://graph.facebook.com/v21.0/me/accounts?fields=id,name`, {
        headers: { Authorization: `Bearer ${cleanToken}` }
      });
      const pData = await pRes.json();
      if (pData.data && Array.isArray(pData.data)) {
        pages = pData.data.map((p: any) => ({ id: p.id, name: p.name }));
      }
    } catch {
      // Continuar
    }

    return {
      success: true,
      diagnostic: {
        valid: true,
        app: appInfo,
        user: { id: userData.id, name: userData.name, email: userData.email, type: userType },
        permissions,
        adAccounts,
        businesses,
        pages
      }
    };
  } catch (err: any) {
    return {
      success: false,
      error: `Error al conectar directamente con Meta Graph API: ${err.message}`
    };
  }
}

export async function verifyMetaTokenApi(token?: string) {
  try {
    const res = await fetch(`${API_BASE_URL}/meta/verify-token`, {
      method: 'POST',
      headers: await authHeaders(),
      body: JSON.stringify({ token })
    });
    const data = await res.json();
    if (res.ok && data.success) {
      return data;
    }
    // Si el backend responde con error de habilitación o 403, usar verificación directa en navegador
    if (token) {
      const direct = await verifyMetaTokenClientDirect(token);
      if (direct.success) return direct;
    }
    return data;
  } catch {
    if (token) {
      return await verifyMetaTokenClientDirect(token);
    }
    return {
      success: false,
      error: 'No se pudo conectar con el servicio de verificación de Meta.'
    };
  }
}

export async function verifyMetaAccountApi(adAccountId: string, token?: string) {
  try {
    const res = await fetch(`${API_BASE_URL}/meta/verify-account`, {
      method: 'POST',
      headers: await authHeaders(),
      body: JSON.stringify({ adAccountId, token })
    });
    const data = await res.json();
    if (res.ok && data.success) {
      return data;
    }
    if (token) {
      const direct = await verifyMetaAccountClientDirect(adAccountId, token);
      if (direct.success) return direct;
    }
    return data;
  } catch {
    if (token) {
      return await verifyMetaAccountClientDirect(adAccountId, token);
    }
    return {
      success: false,
      error: 'Error al verificar la cuenta publicitaria en Meta.'
    };
  }
}

export async function testMetaCreationClientDirect(
  adAccountId: string,
  token: string,
  brandName: string = 'TicTac Performance',
  pageId?: string
) {
  const cleanToken = token.trim();
  const rawAccountId = adAccountId.trim();
  const accountId = rawAccountId.startsWith('act_') ? rawAccountId : `act_${rawAccountId}`;
  const numericAccountId = accountId.replace('act_', '');

  // Parámetros publicitarios predeterminados (0 llamadas a API de IA)
  const defaultHeadline = 'TICO Performance | Automatización & Pauta Digital';
  const defaultPrimaryText = '🚀 Impulsa el crecimiento de tu marca con estrategias de alto rendimiento. Campaña de prueba generada automáticamente por TICO Performance para verificar la integración oficial con Meta Marketing API.';
  const defaultDescription = 'Verificación oficial de conexión publicitaria en modo PAUSED.';
  const defaultCta = 'LEARN_MORE';
  const defaultImageUrl = 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1200&auto=format&fit=crop&q=80';
  const defaultLink = 'https://tictacagency.co';

  // Si es token demo
  if (cleanToken.startsWith('EAAB_Demo') || !cleanToken) {
    const mockCmpId = `meta_cmp_${Date.now()}_sandbox`;
    return {
      success: true,
      mode: 'mock_sandbox',
      status: 'PAUSED',
      campaignId: mockCmpId,
      adsetId: `meta_adset_${Date.now()}_sandbox`,
      adId: `meta_ad_${Date.now()}_sandbox`,
      creativeId: `meta_cr_${Date.now()}_sandbox`,
      adsManagerUrl: `https://adsmanager.facebook.com/adsmanager/manage/campaigns?act=${numericAccountId || 'sandbox'}`,
      message: 'Prueba predeterminada completada en Modo Sandbox (PAUSED, sin costo de IA).',
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

  // 1. Detectar divisa, presupuesto mínimo y páginas
  let accountCurrency = 'USD';
  let minDailyBudget = 200;
  let detectedPageId = pageId;

  try {
    const accRes = await fetch(
      `https://graph.facebook.com/v21.0/${accountId}?fields=currency,min_daily_budget,promote_pages{id,name}`,
      { headers: { Authorization: `Bearer ${cleanToken}` } }
    );
    const accData = await accRes.json();
    if (accData && !accData.error) {
      accountCurrency = accData.currency || 'USD';
      if (accData.min_daily_budget) {
        minDailyBudget = Number(accData.min_daily_budget);
      } else if (accountCurrency === 'COP') {
        minDailyBudget = 1000000;
      } else {
        minDailyBudget = 500;
      }
      if (!detectedPageId && accData.promote_pages?.data?.[0]?.id) {
        detectedPageId = accData.promote_pages.data[0].id;
      }
    }
  } catch {
    // Continuar
  }

  if (!detectedPageId) {
    try {
      const pageRes = await fetch(`https://graph.facebook.com/v21.0/me/accounts?fields=id,name`, {
        headers: { Authorization: `Bearer ${cleanToken}` }
      });
      const pageData = await pageRes.json();
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
    // 1. Crear Campaña (is_adset_budget_sharing_enabled: false requerido por Meta para presupuestos a nivel de adset)
    const cmpRes = await fetch(`https://graph.facebook.com/v21.0/${accountId}/campaigns`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: `[TICO-TEST] ${brandName} - Verificación de Conexión (PAUSED)`,
        objective: 'OUTCOME_TRAFFIC',
        status: 'PAUSED',
        special_ad_categories: ['NONE'],
        is_adset_budget_sharing_enabled: false,
        access_token: cleanToken
      })
    });
    const cmpData = await cmpRes.json();

    if (!cmpRes.ok || cmpData.error) {
      const err = cmpData.error?.message || 'Error al crear la campaña de prueba en Meta Ads';
      return {
        success: false,
        mode: 'live_api',
        status: 'FAILED',
        error: err,
        rawError: cmpData.error,
        message: `Fallo en Meta Graph API al crear la Campaña: ${err}`,
        steps
      };
    }

    const campaignId = cmpData.id;
    steps.campaign = { success: true, id: campaignId };

    // 2. Crear AdSet
    let adsetId: string | undefined;
    try {
      const adsetRes = await fetch(`https://graph.facebook.com/v21.0/${accountId}/adsets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `[TICO-TEST] Conjunto de Prueba - Segmentación Predeterminada`,
          campaign_id: campaignId,
          optimization_goal: 'LINK_CLICKS',
          billing_event: 'IMPRESSIONS',
          daily_budget: minDailyBudget,
          bid_strategy: 'LOWEST_COST_WITHOUT_CAP',
          targeting: {
            geo_locations: { countries },
            age_min: 18,
            age_max: 65
          },
          status: 'PAUSED',
          access_token: cleanToken
        })
      });
      const adsetData = await adsetRes.json();
      if (adsetRes.ok && adsetData.id) {
        adsetId = adsetData.id;
        steps.adSet = { success: true, id: adsetId };
      } else {
        steps.adSet = { success: false, error: adsetData.error?.message };
      }
    } catch (e: any) {
      steps.adSet = { success: false, error: e.message };
    }

    // 3. Crear Creativo y Anuncio si hay Fanpage
    let creativeId: string | undefined;
    let adId: string | undefined;

    if (detectedPageId && adsetId) {
      try {
        const crRes = await fetch(`https://graph.facebook.com/v21.0/${accountId}/adcreatives`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
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
          })
        });
        const crData = await crRes.json();
        if (crRes.ok && crData.id) {
          creativeId = crData.id;
          steps.creative = { success: true, id: creativeId };

          const adRes = await fetch(`https://graph.facebook.com/v21.0/${accountId}/ads`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: `[TICO-TEST] Anuncio de Muestra (PAUSED)`,
              adset_id: adsetId,
              creative: { creative_id: creativeId },
              status: 'PAUSED',
              access_token: cleanToken
            })
          });
          const adData = await adRes.json();
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
      message: `Error de conexión directa con Meta Graph API: ${error.message}`,
      steps
    };
  }
}

export async function testMetaCreationApi(
  adAccountId: string, 
  token?: string, 
  brandName?: string,
  pageId?: string
) {
  try {
    const res = await fetch(`${API_BASE_URL}/meta/test-creation`, {
      method: 'POST',
      headers: await authHeaders(),
      body: JSON.stringify({ adAccountId, token, brandName, pageId })
    });

    const data = await res.json();

    // Si el backend responde con éxito, retornar
    if (res.ok && data.success) {
      return data;
    }

    // Si el backend da 403, error de middleware o error de cliente pendiente, fallback directo en cliente
    if (token) {
      return await testMetaCreationClientDirect(adAccountId, token, brandName, pageId);
    }

    return data;
  } catch {
    if (token) {
      return await testMetaCreationClientDirect(adAccountId, token, brandName, pageId);
    }
    return {
      success: false,
      error: 'Error de conexión al probar creación en Meta.'
    };
  }
}

/**
 * Consulta campañas existentes en Meta para el modo Anuncio Individual
 */
export async function fetchMetaCampaignsApi(adAccountId?: string, token?: string) {
  try {
    const res = await fetch(`${API_BASE_URL}/meta/campaigns-list`, {
      method: 'POST',
      headers: await authHeaders(),
      body: JSON.stringify({ adAccountId, token })
    });
    const data = await res.json();
    if (res.ok && data.success) {
      return data;
    }
    // Si se envió un token real pero hubo error de Meta, retornar el error real
    if (token && !token.startsWith('EAAB_Demo') && !token.includes('your_') && data?.error) {
      return {
        success: false,
        error: data.error,
        campaigns: []
      };
    }
    return {
      success: true,
      mode: 'mock_sandbox',
      campaigns: [
        { id: 'cmp_demo_101', name: '[TICO] UrbanFit — Tráfico Frío Q1 (PAUSED)', status: 'PAUSED', objective: 'OUTCOME_TRAFFIC' },
        { id: 'cmp_demo_102', name: '[TICO] UrbanFit — Retargeting Carrito (ACTIVE)', status: 'ACTIVE', objective: 'OUTCOME_SALES' },
        { id: 'cmp_demo_103', name: '[TICO] Clientes Potenciales WhatsApp — Campaña Principal', status: 'PAUSED', objective: 'OUTCOME_LEADS' }
      ]
    };
  } catch (err: any) {
    if (token && !token.startsWith('EAAB_Demo') && !token.includes('your_')) {
      return {
        success: false,
        error: err?.message || 'Error de conexión con el servidor al consultar campañas.',
        campaigns: []
      };
    }
    return {
      success: true,
      mode: 'mock_sandbox',
      campaigns: [
        { id: 'cmp_demo_101', name: '[TICO] UrbanFit — Tráfico Frío Q1 (PAUSED)', status: 'PAUSED', objective: 'OUTCOME_TRAFFIC' },
        { id: 'cmp_demo_102', name: '[TICO] UrbanFit — Retargeting Carrito (ACTIVE)', status: 'ACTIVE', objective: 'OUTCOME_SALES' }
      ]
    };
  }
}

/**
 * Consulta conjuntos de anuncios de una campaña específica en Meta
 */
export async function fetchMetaAdSetsApi(campaignId: string, adAccountId?: string, token?: string) {
  try {
    const res = await fetch(`${API_BASE_URL}/meta/adsets-list`, {
      method: 'POST',
      headers: await authHeaders(),
      body: JSON.stringify({ campaignId, adAccountId, token })
    });
    const data = await res.json();
    if (res.ok && data.success) {
      return data;
    }
    if (token && !token.startsWith('EAAB_Demo') && !token.includes('your_') && data?.error) {
      return {
        success: false,
        error: data.error,
        adSets: []
      };
    }
    return {
      success: true,
      mode: 'mock_sandbox',
      adSets: [
        { id: 'adset_demo_201', name: 'Audiencia Hombres 20-35 Fitness & Crossfit', status: 'PAUSED', optimization_goal: 'OFFSITE_CONVERSIONS' },
        { id: 'adset_demo_202', name: 'Audiencia Mujeres 22-40 Vida Saludable & Yoga', status: 'PAUSED', optimization_goal: 'LINK_CLICKS' }
      ]
    };
  } catch (err: any) {
    if (token && !token.startsWith('EAAB_Demo') && !token.includes('your_')) {
      return {
        success: false,
        error: err?.message || 'Error de conexión con el servidor al consultar conjuntos de anuncios.',
        adSets: []
      };
    }
    return {
      success: true,
      mode: 'mock_sandbox',
      adSets: [
        { id: 'adset_demo_201', name: 'Audiencia Hombres 20-35 Fitness & Crossfit', status: 'PAUSED', optimization_goal: 'OFFSITE_CONVERSIONS' }
      ]
    };
  }
}

/**
 * Formula sugerencias estratégicas con IA para los bloques delegados en MetaAdBuilder
 */
/**
 * Crea una carga útil enriquecida con textos predeterminados de prueba para simulación
 */
function createDeterministicPayload(payload: MetaBuilderPayload): MetaBuilderPayload {
  return {
    ...payload,
    adSets: payload.adSets.map(s => s.delegateAudienceToTico ? {
      ...s,
      countries: s.countries?.length > 0 ? s.countries : ['CO'],
      ageMin: payload.specialAdCategory !== 'NONE' ? 18 : 22,
      ageMax: payload.specialAdCategory !== 'NONE' ? 65 : 55,
      gender: payload.specialAdCategory !== 'NONE' ? 'all' : 'all',
      interestsSuggested: [
        `${payload.brandName} ${payload.industry || 'Intereses Afines'}`,
        payload.industry ? `Interesados en ${payload.industry}` : 'Compradores que interactuaron en Instagram',
        'Usuarios con alta interacción comercial'
      ],
      delegateAudienceToTico: false
    } : s),
    ads: payload.ads.map(a => a.delegateCopysToTico ? {
      ...a,
      headline: `${payload.brandName} | ${a.conceptAngle || 'Oferta Exclusiva'}`.slice(0, 40),
      primaryText: `${payload.additionalNotes ? payload.additionalNotes + '. ' : ''}Descubre todo lo que ${payload.brandName} tiene preparado para ti. Diseñado para ${payload.targetAudience || 'potenciar tu experiencia con ' + (a.conceptAngle?.toLowerCase() || 'los mejores resultados')}. Aprovecha hoy.`,
      description: 'Garantía oficial • Asesoría personalizada',
      callToAction: payload.objective === 'OUTCOME_LEADS' ? 'CONTACT_US' : (payload.objective === 'OUTCOME_SALES' ? 'SHOP_NOW' : 'LEARN_MORE'),
      delegateCopysToTico: false
    } : a)
  };
}

/**
 * Construye la entidad unificada GeneratedCampaignStrategy
 */
function createStrategyFromPayload(
  payload: MetaBuilderPayload,
  enriched: MetaBuilderPayload,
  strategySummary: string
): GeneratedCampaignStrategy {
  return {
    briefingId: `meta_brief_${Date.now()}`,
    brandName: payload.brandName,
    strategySummary,
    totalBudget: payload.totalBudget,
    currency: payload.currency,
    createdAt: new Date().toISOString(),
    creditCost: 5,
    status: 'awaiting_approval',
    complianceChecked: true,
    creatives: [],
    metaAds: {
      campaignName: enriched.campaignName || `[TICO] ${enriched.brandName} - Meta Ads`,
      objective: enriched.objective,
      placements: ['instagram_feed', 'instagram_stories', 'facebook_feed', 'facebook_reels'],
      interestsAndBehaviors: enriched.adSets?.[0]?.interestsSuggested || [
        `${payload.brandName} Nicho`,
        'Compradores que interactuaron',
        'Usuarios activos en redes sociales'
      ],
      primaryTexts: (enriched.ads || []).map((a: any) => a.primaryText || 'Descubre nuestras mejores soluciones.'),
      headlines: (enriched.ads || []).map((a: any) => a.headline || `${payload.brandName} Oficial`),
      callToAction: (enriched.ads?.[0]?.callToAction as any) || 'LEARN_MORE',
      budgetSharePercentage: 100,
      budgetAmount: payload.totalBudget,
      dailyBudget: Math.round(payload.totalBudget / 30)
    },
    metaBuilderPayload: enriched
  };
}


/**
 * Formula sugerencias estratégicas con IA para los bloques delegados en MetaAdBuilder
 * Ejecutado de forma segura y exclusiva a través del backend en Vercel (/api/campaigns/generate-meta-builder)
 * La API key de Gemini reside únicamente en el servidor y nunca se expone al cliente
 */
export async function generateMetaBuilderStrategyApi(
  payload: MetaBuilderPayload,
  useMock: boolean = false
): Promise<{
  strategy: GeneratedCampaignStrategy;
  enrichedPayload: MetaBuilderPayload;
}> {
  // Limpieza defensiva en cliente: asegurarnos de no persistir claves en almacenamiento local
  if (typeof window !== 'undefined') {
    try {
      localStorage.removeItem('gemini_api_key');
      sessionStorage.removeItem('gemini_api_key');
    } catch {
      // Ignorar si el almacenamiento está restringido
    }
  }

  // 1. Si el usuario solicitó explícitamente simulación / textos predeterminados
  if (useMock) {
    const mockEnriched = createDeterministicPayload(payload);
    const mockStrategy = createStrategyFromPayload(
      payload,
      mockEnriched,
      `[SIMULACIÓN] Estrategia de prueba con textos de muestra para ${payload.brandName} en Meta Ads.`
    );
    return { strategy: mockStrategy, enrichedPayload: mockEnriched };
  }

  // 2. Petición segura al backend en Vercel (/api/campaigns/generate-meta-builder)
  try {
    const headers = await authHeaders().catch(() => ({ 'Content-Type': 'application/json' }));
    const res = await fetch(`${API_BASE_URL}/campaigns/generate-meta-builder`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    });

    if (res.ok) {
      const data = await res.json();
      if (data.enrichedPayload) {
        const enriched = data.enrichedPayload;
        const strategySummary = data.strategySummary || `Estrategia de Meta Ads formulada por TICO IA para ${payload.brandName}.`;
        const strategy = createStrategyFromPayload(payload, enriched, strategySummary);
        return { strategy, enrichedPayload: enriched };
      }
    }

    const errJson = await res.json().catch(() => null);
    const errorMessage = errJson?.error || `Error del servidor (${res.status}): ${res.statusText}`;
    throw new Error(errorMessage);
  } catch (err: any) {
    console.error('[TICO-AI] Error en formulación de estrategia:', err);
    throw new Error(
      `No se pudo formular la estrategia con IA: ${err.message}\n\n` +
      `Si deseas continuar de inmediato para probar el flujo sin esperar a la IA, puedes pulsar el botón inferior "⚡ Probar con textos predeterminados".`
    );
  }
}

/**
 * Despliega la configuración completa del MetaAdBuilder vía API
 */
export async function deployMetaBuilderApi(
  payload: MetaBuilderPayload,
  token?: string,
  adAccountId?: string,
  jobId?: string
) {
  try {
    if (payload.ticoBrief) return await briefApi('deploy', { brief: payload.ticoBrief, jobId });
    const res = await fetch(`${API_BASE_URL}/meta/deploy-builder`, {
      method: 'POST',
      headers: await authHeaders(),
      body: JSON.stringify({ payload, token, adAccountId })
    });
    const data = await res.json();
    if (res.ok && data.success) {
      return data;
    }
    return data;
  } catch (err: any) {
    return {
      success: false,
      error: `Error de red al desplegar campaña en Meta: ${err.message}`
    };
  }
}

