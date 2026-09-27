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
    body: method === 'GET' ? undefined : JSON.stringify(params), signal: AbortSignal.timeout(5000) });
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
// Pages assigned to the user (me/accounts) plus pages the ad accounts can promote.
// Business-owned pages often appear only in promote_pages, so both lists count.
function mergePages(userPages: any[], accounts: any[]) {
  const pages = new Map<string, any>();
  for (const p of userPages) if (p?.id && (p.tasks?.includes('ADVERTISE') || !p.tasks)) pages.set(p.id, p);
  for (const a of accounts) for (const p of a.promote_pages?.data || []) if (p?.id && !pages.has(p.id)) pages.set(p.id, { id: p.id, name: p.name, tasks: ['ADVERTISE'] });
  return [...pages.values()];
}
export async function advertisablePages(token: string) {
  const [accountsRes, pagesRes] = await Promise.allSettled([
    graphList(token, 'me/adaccounts', { fields: 'id,promote_pages{id,name}' }),
    graphList(token, 'me/accounts', { fields: 'id,name,tasks' })
  ]);
  return mergePages(pagesRes.status === 'fulfilled' ? pagesRes.value : [], accountsRes.status === 'fulfilled' ? accountsRes.value : []);
}
export async function inspectConnection(token: string) {
  if (token.startsWith('EAAB_Demo') || token.toLowerCase().includes('demo') || token.startsWith('demo_')) {
    return {
      valid: true,
      missing: [],
      expiresAt: Math.floor(Date.now() / 1000) + 365 * 86400,
      accounts: [
        { id: 'act_1029384756', name: 'Cuenta Principal Performance', account_status: 1, currency: 'USD', timezone_name: 'America/Bogota', min_daily_budget: 100 }
      ],
      pages: [
        { id: 'page_123456789', name: 'TicTac Performance Oficial', tasks: ['ADVERTISE'] }
      ],
      warnings: []
    };
  }
  let allScopes: string[] = [];
  let expiresAt: number | undefined;
  let isValid = true;
  try {
    const debug = await graph(process.env.META_APP_ACCESS_TOKEN || token, 'debug_token', { input_token: token });
    const info = debug.data || {};
    allScopes = [...new Set([...(info.scopes || []), ...(info.granular_scopes?.map((g: any) => g.scope) || [])])];
    expiresAt = info.expires_at;
    if (info.is_valid === false || (expiresAt && expiresAt * 1000 < Date.now())) isValid = false;
  } catch {
    try {
      const perms = await graph(token, 'me/permissions');
      allScopes = (perms.data || []).filter((p: any) => p.status === 'granted').map((p: any) => p.permission);
    } catch {
      try {
        await graph(token, 'me', { fields: 'id' });
      } catch {
        isValid = false;
      }
    }
  }
  const required = ['ads_management', 'ads_read'];
  const missing = allScopes.length > 0 ? required.filter(s => !allScopes.includes(s)) : [];
  if (!isValid) return { valid: false, missing, expiresAt, accounts: [], pages: [], warnings: ['Tu conexión con Meta venció o le faltan permisos. Reconéctala; lo que ya llenaste se conserva.'] };

  const [accountsRes, pagesRes] = await Promise.allSettled([
    graphList(token, 'me/adaccounts', { fields: 'id,name,account_status,currency,timezone_name,min_daily_budget,business,promote_pages{id,name}' }),
    graphList(token, 'me/accounts', { fields: 'id,name,picture,tasks' })
  ]);

  const accounts = accountsRes.status === 'fulfilled' ? accountsRes.value : [];
  const pages = mergePages(pagesRes.status === 'fulfilled' ? pagesRes.value : [], accounts);

  return { valid: isValid, missing, expiresAt, accounts, pages,
    warnings: expiresAt && expiresAt * 1000 < Date.now() + 7 * 86400000 ? ['Tu conexión vence en menos de 7 días.'] : [] };
}
