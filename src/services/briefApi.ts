import { API_BASE_URL, authHeaders, requireSupabase } from './auth';
import type { TicoBrief } from '../../server/src/domain/ticoBrief';
export async function briefApi(path: string, body?: unknown) {
  const response = await fetch(`${API_BASE_URL}/brief/${path}`, { method: body === undefined ? 'GET' : 'POST', headers: await authHeaders(), body: body === undefined ? undefined : JSON.stringify(body) });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'No se pudo completar la solicitud.');
  return result;
}
export async function saveBriefPreferences(b: TicoBrief) {
  const db=requireSupabase();
  const prior=await db.from('tico_brief_preferences').select('last_assets').maybeSingle();
  const latest={brand:b.brief.businessProfile.brandName,connectionId:b.metaConnectionId,accountId:b.meta.adAccountId,pageId:b.meta.pageId,pixelId:b.meta.pixelId};
  const byBrand={...(prior.data?.last_assets?.byBrand||{})};if(latest.brand)byBrand[latest.brand]=latest;
  const { error } = await db.from('tico_brief_preferences').upsert({
    delegation: b.delegation, last_assets: {latest,byBrand} });
  if (error) throw new Error('No se pudieron guardar tus preferencias. Aplica la migración V2.');
}
