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
  user?: {
    id: string;
    name: string;
    email?: string;
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
    business?: { id: string; name: string };
  }>;
  error?: string;
  rawError?: any;
}

const GRAPH_API_VERSION = 'v21.0';
const GRAPH_BASE_URL = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

/**
 * Valida un token de acceso contra Meta Graph API v21.0 en tiempo real.
 * Obtiene el usuario autenticado, sus permisos y sus cuentas publicitarias.
 */
export async function verifyMetaToken(token: string): Promise<MetaTokenDiagnostic> {
  if (!token || token.trim() === '' || token.includes('your_')) {
    return {
      valid: false,
      error: 'Token no proporcionado o es un valor de ejemplo.'
    };
  }

  try {
    // 1. Validar identidad del usuario o System User
    const userRes = await fetch(`${GRAPH_BASE_URL}/me?fields=id,name,email&access_token=${encodeURIComponent(token)}`);
    const userData = await userRes.json() as any;

    if (!userRes.ok || userData.error) {
      return {
        valid: false,
        error: userData.error?.message || 'Token de acceso inválido o expirado.',
        rawError: userData.error
      };
    }

    // 2. Comprobar permisos otorgados (Permissions endpoint)
    let permissions = {
      adsManagement: false,
      pagesReadEngagement: false,
      businessManagement: false,
      allGranted: [] as string[]
    };

    try {
      const permRes = await fetch(`${GRAPH_BASE_URL}/me/permissions?access_token=${encodeURIComponent(token)}`);
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
      // Si el endpoint de permisos falla (p.ej. System User Token), se evalúan en la llamada a cuentas
    }

    // 3. Obtener cuentas publicitarias asociadas
    let adAccounts: any[] = [];
    try {
      const adAccRes = await fetch(
        `${GRAPH_BASE_URL}/me/adaccounts?fields=id,name,account_id,account_status,currency,amount_spent,business&access_token=${encodeURIComponent(token)}`
      );
      const adAccData = await adAccRes.json() as any;

      if (adAccData.data && Array.isArray(adAccData.data)) {
        adAccounts = adAccData.data.map((acc: any) => {
          const statusLabels: Record<number, string> = {
            1: 'ACTIVA',
            2: 'DESHABILITADA',
            3: 'PAGO_PENDIENTE',
            7: 'EN_REVISION',
            9: 'EN_CIERRE'
          };
          return {
            id: acc.id,
            name: acc.name || `Cuenta ${acc.account_id}`,
            accountId: acc.account_id,
            status: acc.account_status,
            statusLabel: statusLabels[acc.account_status] || `ESTADO_${acc.account_status}`,
            currency: acc.currency || 'USD',
            business: acc.business ? { id: acc.business.id, name: acc.business.name } : undefined
          };
        });
      }
    } catch {
      // Continuar con lista vacía
    }

    return {
      valid: true,
      user: {
        id: userData.id,
        name: userData.name,
        email: userData.email
      },
      permissions,
      adAccounts
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
  const formattedId = rawAccountId.startsWith('act_') ? rawAccountId : `act_${rawAccountId}`;

  try {
    const res = await fetch(
      `${GRAPH_BASE_URL}/${formattedId}?fields=id,name,account_status,currency,amount_spent,business,min_daily_budget&access_token=${encodeURIComponent(token)}`
    );
    const data = await res.json() as any;

    if (!res.ok || data.error) {
      return {
        success: false,
        error: data.error?.message || `No se pudo acceder a la cuenta ${formattedId}.`,
        rawError: data.error
      };
    }

    return {
      success: true,
      account: {
        id: data.id,
        name: data.name,
        status: data.account_status,
        isActive: data.account_status === 1,
        currency: data.currency,
        business: data.business ? { id: data.business.id, name: data.business.name } : null
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
export async function deployMetaCampaign(
  payload: MetaCampaignPayload, 
  customToken?: string, 
  customAccountId?: string
) {
  const token = customToken || process.env.META_ACCESS_TOKEN;
  const rawAccountId = customAccountId || process.env.META_AD_ACCOUNT_ID;

  // Si no hay credenciales reales en .env ni enviadas en la petición, modo sandbox explícito
  if (!token || !rawAccountId || token.includes('your_') || rawAccountId.includes('your_')) {
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
    // Llamada REAL a Meta Graph API para crear la campaña en estado PAUSED
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
