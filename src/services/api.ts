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

async function verifyMetaTokenClientDirect(token: string) {
  try {
    const userRes = await fetch(`https://graph.facebook.com/v21.0/me?fields=id,name,email&access_token=${encodeURIComponent(token)}`);
    const userData = await userRes.json();
    if (!userRes.ok || userData.error) {
      return {
        success: false,
        error: userData.error?.message || 'Token de acceso inválido o expirado en Meta.'
      };
    }

    let permissions = {
      adsManagement: false,
      pagesReadEngagement: false,
      businessManagement: false,
      allGranted: [] as string[]
    };

    try {
      const permRes = await fetch(`https://graph.facebook.com/v21.0/me/permissions?access_token=${encodeURIComponent(token)}`);
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

    let adAccounts: any[] = [];
    try {
      const adAccRes = await fetch(
        `https://graph.facebook.com/v21.0/me/adaccounts?fields=id,name,account_id,account_status,currency,amount_spent,business&access_token=${encodeURIComponent(token)}`
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
          business: acc.business ? { id: acc.business.id, name: acc.business.name } : undefined
        }));
      }
    } catch {
      // Ignorar error al leer cuentas
    }

    return {
      success: true,
      diagnostic: {
        valid: true,
        user: { id: userData.id, name: userData.name, email: userData.email },
        permissions,
        adAccounts
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
    return await res.json();
  } catch (err: any) {
    return {
      success: false,
      error: `Error al verificar la cuenta: ${err.message}`
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
