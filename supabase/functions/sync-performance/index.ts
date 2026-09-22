import { createClient } from 'npm:@supabase/supabase-js@2.116.0';

const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
Deno.serve(async (request: Request) => {
  if (request.method === 'OPTIONS') return new Response(null, { headers: cors });
  const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
  if (request.method !== 'POST') return reply({ error: 'Method not allowed' }, 405);
  const authorization = request.headers.get('Authorization') || '';
  if (!/^Bearer \S+$/i.test(authorization)) return reply({ error: 'Sesión requerida.' }, 401);
  try {
  const client = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: authorization } }, auth: { persistSession: false } });
  const { data: auth, error: authError } = await client.auth.getUser(authorization.replace(/^Bearer /i, ''));
  if (authError || !auth.user?.email_confirmed_at || auth.user.is_anonymous) return reply({ error: 'Inicia sesión con un correo confirmado.' }, 401);
    let body: Record<string, unknown>;
    try { body = await request.json(); } catch { return reply({ error: 'JSON inválido.' }, 400); }
    const { since, until } = body || {};
    const validDate = (date: unknown): date is string => typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date) && Number.isFinite(Date.parse(date)) && new Date(date).toISOString().slice(0, 10) === date;
    if (!validDate(since) || !validDate(until) || since > until || Date.parse(until) - Date.parse(since) >= 93 * 86400000) return reply({ error: 'Periodo inválido; máximo 93 días.' }, 400);
    const { data: connection, error: connectionError } = await client.from('ad_connections').select('settings').eq('user_id', auth.user.id).eq('platform', 'meta').single();
    const { data: token, error: tokenError } = await client.rpc('load_ad_token', { p_platform: 'meta' });
    if (connectionError || tokenError || typeof token !== 'string' || !token || !connection?.settings?.isRealToken) return reply({ error: 'Conecta una cuenta real de Meta antes de sincronizar.' }, 400);
    const account = String(connection.settings.adAccountId || '');
    if (!/^(act_)?\d+$/.test(account)) return reply({ error: 'Cuenta de Meta inválida.' }, 400);
    const accountId = account.startsWith('act_') ? account : `act_${account}`;
    const firstUrl = new URL(`https://graph.facebook.com/v21.0/${accountId}/insights`);
    firstUrl.searchParams.set('fields', 'date_start,account_currency,spend,impressions,clicks');
    firstUrl.searchParams.set('time_range', JSON.stringify({ since, until }));
    firstUrl.searchParams.set('time_increment', '1'); firstUrl.searchParams.set('limit', '100');
    let next: string | null = firstUrl.href;
    const rows: Record<string, unknown>[] = [];
    let pages = 0;
    while (next) {
      if (++pages > 10 || new URL(next).origin !== 'https://graph.facebook.com') throw new Error('Incomplete response');
      const response = await fetch(next, { headers: { Authorization: `Bearer ${token}` }, redirect: 'error', signal: AbortSignal.timeout(15000) });
      const result = await response.json();
      if (!response.ok || result.error) return reply({ error: 'Meta no permitió consultar resultados. Revisa los permisos ads_read o ads_management y la vigencia del token.' }, 502);
      if (!Array.isArray(result.data)) throw new Error('Invalid response');
      for (const row of result.data) {
        if (!/^[A-Z]{3}$/.test(row.account_currency) || !validDate(row.date_start) || row.date_start < since || row.date_start > until || [row.spend, row.impressions, row.clicks].some(value => value == null || value === '' || !Number.isFinite(Number(value)) || Number(value) < 0)) throw new Error('Invalid metrics');
        rows.push({ user_id: auth.user.id, platform: 'meta', account_id: account, date: row.date_start, currency: row.account_currency, spend: Number(row.spend), impressions: Number(row.impressions), clicks: Number(row.clicks), synced_at: new Date().toISOString() });
      }
      // Never follow provider URLs or redirects with a credential. Rebuild our fixed endpoint.
      next = null;
      if (result.paging?.next) {
        const cursor = result.paging?.cursors?.after;
        if (typeof cursor !== 'string' || !cursor || cursor.length > 4096) throw new Error('Invalid cursor');
        const pageUrl = new URL(firstUrl);
        pageUrl.searchParams.set('after', cursor);
        next = pageUrl.href;
      }
    }
    if (rows.length) {
      const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
      const { error } = await admin.from('performance_daily').upsert(rows, { onConflict: 'user_id,platform,account_id,date' });
      if (error) throw error;
    }
    return reply({ success: true, days: rows.length });
  } catch { return reply({ error: 'No se pudo guardar la sincronización. Inténtalo de nuevo.' }, 503); }
});
