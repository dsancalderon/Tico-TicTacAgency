import { useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { requireSupabase } from '../../services/auth';
import type { MetaConnectionState, GoogleConnectionState } from '../../types';

interface MetricDay { date: string; currency: string; spend: number; impressions: number; clicks: number; synced_at: string }
export function AssetDashboard({ metaState, googleState }: { metaState: MetaConnectionState; googleState?: GoogleConnectionState }) {
  const [platform, setPlatform] = useState<'meta' | 'google'>('meta');
  const [range, setRange] = useState('30d');
  const [rows, setRows] = useState<MetricDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refresh, setRefresh] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const account = platform === 'meta' ? metaState.adAccountId : googleState?.customerId;
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota' }).format(new Date());
  const start = new Date(`${today}T12:00:00Z`);
  if (range === 'month') start.setUTCDate(1);
  else start.setUTCDate(start.getUTCDate() - (range === '7d' ? 6 : 29));
  const since = start.toISOString().slice(0, 10);
  useEffect(() => {
    let active = true;
    setRows([]); setError(''); setLoading(true);
    if (!account) { setLoading(false); return; }
    void (async () => {
      try {
        const db = requireSupabase();
        const { data: session } = await db.auth.getSession();
        if (!session.session) throw new Error('Inicia sesión para ver tus métricas.');
        const { data, error } = await db.from('performance_daily').select('date,currency,spend,impressions,clicks,synced_at')
          .eq('user_id', session.session.user.id).eq('platform', platform).eq('account_id', account)
          .gte('date', since).lte('date', today).order('date');
        if (error) throw new Error('No se pudieron consultar las métricas guardadas.');
        if (active) setRows(data || []);
      } catch (err) { if (active) setError(err instanceof Error ? err.message : 'Error de consulta.'); }
      finally { if (active) setLoading(false); }
    })();
    return () => { active = false; };
  }, [account, platform, since, today, refresh]);
  async function sync() {
    setSyncing(true); setError('');
    try {
      const { data, error } = await requireSupabase().functions.invoke('sync-performance', { body: { since, until: today } });
      if (error || data?.error) throw new Error(data?.error || 'No se pudo sincronizar Meta. Revisa el token y sus permisos en Conexiones.');
      setRefresh(value => value + 1);
    } catch (err) { setError(err instanceof Error ? err.message : 'No se pudo sincronizar.'); }
    finally { setSyncing(false); }
  }
  const totals = rows.reduce((sum, row) => ({ spend: sum.spend + Number(row.spend), impressions: sum.impressions + Number(row.impressions), clicks: sum.clicks + Number(row.clicks) }), { spend: 0, impressions: 0, clicks: 0 });
  const currencies = new Set(rows.map(row => row.currency));
  const valid = rows.length > 0 && currencies.size === 1;
  const cards = [
    ['Inversión', valid ? `${totals.spend.toLocaleString('es-CO', { maximumFractionDigits: 2 })} ${rows[0]?.currency}` : '—'],
    ['Impresiones', valid ? totals.impressions.toLocaleString('es-CO') : '—'],
    ['Clics', valid ? totals.clicks.toLocaleString('es-CO') : '—'],
    ['CTR', valid && totals.impressions ? `${(100 * totals.clicks / totals.impressions).toFixed(2)}%` : '—'],
    ['CPC', valid && totals.clicks ? `${(totals.spend / totals.clicks).toFixed(2)} ${rows[0]?.currency}` : '—'],
  ];
  return <div className="space-y-6">
    <div className="bg-white rounded-3xl border border-slate-200 p-6 space-y-5">
      <div><h1 className="text-2xl font-extrabold text-slate-900">Dashboards de Rendimiento</h1><p className="text-sm text-slate-500 mt-1">Resultados guardados de tus cuentas publicitarias.</p></div>
      <div className="flex flex-wrap gap-3 items-center">
        <select aria-label="Plataforma" value={platform} onChange={event => setPlatform(event.target.value as 'meta' | 'google')} className="border rounded-xl p-2 text-sm"><option value="meta">Meta Ads</option><option value="google">Google Ads</option></select>
        <select aria-label="Periodo" value={range} onChange={event => setRange(event.target.value)} className="border rounded-xl p-2 text-sm"><option value="7d">7 días</option><option value="30d">30 días</option><option value="month">Este mes</option></select>
        <button onClick={() => setRefresh(value => value + 1)} disabled={loading} className="border rounded-xl px-3 py-2 text-sm flex gap-2 items-center"><RefreshCw size={15} />Actualizar</button>
        {platform === 'meta' && import.meta.env.VITE_ENABLE_METRICS_SYNC === 'true' && <button disabled={!metaState.isRealToken || !account || syncing} onClick={() => void sync()} className="bg-slate-950 text-white rounded-xl px-4 py-2 text-sm disabled:opacity-40">{syncing ? 'Sincronizando…' : 'Sincronizar Meta'}</button>}
      </div>
      <p className="text-xs text-slate-500">Cuenta: {account || 'Sin configurar'} · {since} — {today}</p>
      {platform === 'meta' && import.meta.env.VITE_ENABLE_METRICS_SYNC !== 'true' && <p className="text-xs text-slate-500">La sincronización con Meta todavía no está habilitada.</p>}
      {error && <p role="alert" className="text-sm text-rose-700">{error}</p>}
      <p role="status" className="text-sm text-slate-600">{loading ? 'Consultando datos…' : !rows.length ? 'Sin datos guardados para esta cuenta y periodo.' : `${rows.length} días con resultados. Última sincronización: ${new Date(rows.map(row => row.synced_at).sort().at(-1)!).toLocaleString('es-CO')}`}</p>
      {platform === 'google' && !rows.length && <p className="text-xs text-slate-500">La sincronización de Google Ads requiere completar su autorización. Aquí aparecerán sus resultados cuando estén disponibles.</p>}
      {currencies.size > 1 && <p role="alert">Las monedas del periodo no coinciden. No se sumaron los importes.</p>}
    </div>
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">{cards.map(([label, value]) => <div key={label} className="bg-white border border-slate-200 rounded-2xl p-5"><p className="text-xs text-slate-500">{label}</p><p className="text-xl font-bold mt-2">{value}</p></div>)}</div>
    {valid && <div className="bg-white rounded-2xl border border-slate-200 overflow-auto"><table className="w-full text-sm text-left"><thead><tr>{['Día','Inversión','Impresiones','Clics'].map(label => <th key={label} className="p-4">{label}</th>)}</tr></thead><tbody>{rows.map(row => <tr key={row.date} className="border-t border-slate-100"><td className="p-4">{row.date}</td><td className="p-4">{Number(row.spend).toFixed(2)} {row.currency}</td><td className="p-4">{row.impressions}</td><td className="p-4">{row.clicks}</td></tr>)}</tbody></table></div>}
  </div>;
}
