import type { ClientBriefing, GeneratedCampaignStrategy } from '../types';

import { API_BASE_URL, authHeaders } from './auth';

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

  try {
    const res = await fetch(
      `https://graph.facebook.com/v21.0/${formattedId}?fields=id,name,account_status,currency,amount_spent,business,promote_pages{id,name},adspixels{id,name},min_daily_budget&access_token=${encodeURIComponent(token.trim())}`
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
    const userRes = await fetch(`https://graph.facebook.com/v21.0/me?fields=id,name,email&access_token=${encodeURIComponent(cleanToken)}`);
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
        `https://graph.facebook.com/v21.0/debug_token?input_token=${encodeURIComponent(cleanToken)}&access_token=${encodeURIComponent(cleanToken)}`
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
            pagesReadEngagement: scopes.includes('pages_read_engagement') || scopes.includes('pages_show_list'),
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
        const permRes = await fetch(`https://graph.facebook.com/v21.0/me/permissions?access_token=${encodeURIComponent(cleanToken)}`);
        const permData = await permRes.json();
        if (permData.data && Array.isArray(permData.data)) {
          const granted = permData.data.filter((p: any) => p.status === 'granted').map((p: any) => p.permission);
          permissions = {
            adsManagement: granted.includes('ads_management'),
            pagesReadEngagement: granted.includes('pages_read_engagement') || granted.includes('pages_show_list'),
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
        `https://graph.facebook.com/v21.0/me/adaccounts?fields=id,name,account_id,account_status,currency,amount_spent,business,adspixels{id,name},promote_pages{id,name}&access_token=${encodeURIComponent(cleanToken)}`
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
      const bRes = await fetch(`https://graph.facebook.com/v21.0/me/businesses?fields=id,name&access_token=${encodeURIComponent(cleanToken)}`);
      const bData = await bRes.json();
      if (bData.data && Array.isArray(bData.data)) {
        businesses = bData.data.map((b: any) => ({ id: b.id, name: b.name }));
      }
    } catch {
      // Continuar
    }

    let pages: any[] = [];
    try {
      const pRes = await fetch(`https://graph.facebook.com/v21.0/me/accounts?fields=id,name&access_token=${encodeURIComponent(cleanToken)}`);
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

export async function testMetaCreationApi(adAccountId: string, token?: string, brandName?: string) {
  try {
    const res = await fetch(`${API_BASE_URL}/meta/test-creation`, {
      method: 'POST',
      headers: await authHeaders(),
      body: JSON.stringify({ adAccountId, token, brandName })
    });
    return await res.json();
  } catch (err: any) {
    return {
      success: false,
      error: `Error al probar creación en Meta: ${err.message}`
    };
  }
}
