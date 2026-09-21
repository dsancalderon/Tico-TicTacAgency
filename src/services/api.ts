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

export async function verifyMetaTokenApi(token?: string) {
  try {
    const res = await fetch(`${API_BASE_URL}/meta/verify-token`, {
      method: 'POST',
      headers: await authHeaders(),
      body: JSON.stringify({ token })
    });
    return await res.json();
  } catch (err: any) {
    return {
      success: false,
      error: `No se pudo conectar con el servidor: ${err.message}`
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
