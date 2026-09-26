export const GRAPH_VERSION = 'v21.0';
export const GRAPH_ORIGIN = `https://graph.facebook.com/${GRAPH_VERSION}`;
export class MetaError extends Error {
  constructor(message: string, public code?: number, public trace?: string) { super(message); }
}
export async function graph(token: string, path: string, params: Record<string, unknown> = {}, method = 'GET'): Promise<any> {
  if (!/^[a-zA-Z0-9_/-]+$/.test(path)) throw new Error('Ruta de Meta inválida.');
  const url = new URL(`${GRAPH_ORIGIN}/${path}`);
  if (method === 'GET') for (const [k, v] of Object.entries(params)) if (v !== undefined) url.searchParams.set(k, String(v));
  const response = await fetch(url, { method, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: method === 'GET' ? undefined : JSON.stringify(params), signal: AbortSignal.timeout(20000) });
  const data = await response.json() as any;
  if (!response.ok || data.error) {
    const e = data.error || {};
    console.error('[Meta brief]', { code: e.code, fbtrace_id: e.fbtrace_id });
    throw new MetaError(e.code === 190 ? 'Tu conexión con Meta venció. Reconéctala en un clic; lo que ya llenaste se conserva.' : (e.error_user_msg || e.message || 'Meta no pudo completar la solicitud.'), e.code, e.fbtrace_id);
  }
  return data;
}
export async function graphList(token: string, path: string, params: Record<string, unknown> = {}) {
  const items: any[] = []; let after: string | undefined;
  for (let i = 0; i < 20; i++) {
    const result = await graph(token, path, { ...params, limit: 100, after });
    items.push(...(result.data || []));
    if (!result.paging?.next) return items;
    after = result.paging?.cursors?.after;
    if (!after) throw new Error('No se pudo completar el listado de activos.');
  }
  throw new Error('Demasiados activos para esta consulta.');
}
export async function inspectConnection(token: string) {
  const debug = await graph(process.env.META_APP_ACCESS_TOKEN || token, 'debug_token', { input_token: token });
  const info = debug.data || {};
  const required = ['ads_management','ads_read','pages_show_list','pages_read_engagement','business_management'];
  const missing = required.filter(s => !info.scopes?.includes(s));
  const valid = info.is_valid === true && (!info.expires_at || info.expires_at * 1000 > Date.now()) && missing.length === 0;
  if (!valid) return { valid, missing, expiresAt: info.expires_at, accounts: [], pages: [], warnings: ['Tu conexión con Meta venció o le faltan permisos. Reconéctala; lo que ya llenaste se conserva.'] };
  const [accounts, pages] = await Promise.all([
    graphList(token, 'me/adaccounts', { fields: 'id,name,account_status,currency,timezone_name,min_daily_budget,business' }),
    graphList(token, 'me/accounts', { fields: 'id,name,picture,tasks' }),
  ]);
  return { valid, missing, expiresAt: info.expires_at, accounts, pages: pages.filter(p => p.tasks?.includes('ADVERTISE')),
    warnings: info.expires_at && info.expires_at * 1000 < Date.now() + 7 * 86400000 ? ['Tu conexión vence en menos de 7 días.'] : [] };
}
