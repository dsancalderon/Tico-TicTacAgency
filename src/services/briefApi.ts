import { API_BASE_URL, authHeaders } from './auth';
import type { TicoBrief } from '../../server/src/domain/ticoBrief';
export async function briefApi(path: string, body?: unknown) {
  const response = await fetch(`${API_BASE_URL}/brief/${path}`, { method: body === undefined ? 'GET' : 'POST', headers: await authHeaders(), body: body === undefined ? undefined : JSON.stringify(body) });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'No se pudo completar la solicitud.');
  return result;
}
export async function saveBriefPreferences(b: TicoBrief) {
  try {
    const priorRaw = localStorage.getItem('tico_brief_preferences');
    const prior = priorRaw ? JSON.parse(priorRaw) : {};
    const latest = { brand: b.brief.businessProfile.brandName, connectionId: b.metaConnectionId, accountId: b.meta.adAccountId, pageId: b.meta.pageId, pixelId: b.meta.pixelId };
    const byBrand = { ...(prior.last_assets?.byBrand || {}) };
    if (latest.brand) byBrand[latest.brand] = latest;
    localStorage.setItem('tico_brief_preferences', JSON.stringify({
      delegation: b.delegation,
      last_assets: { latest, byBrand }
    }));
  } catch {}
}
