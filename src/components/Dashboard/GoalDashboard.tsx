import { useEffect, useState } from 'react';
import { Target, RefreshCw } from 'lucide-react';
import { briefApi, briefConnectionToken } from '../../services/briefApi';
import { dayInZone, daysBetween, forecastMonths, metricLabels, type GoalForecast, type GoalInsights } from '../../../server/src/domain/performanceGoals';

export interface SavedGoal { id: string; brand: string; accountId: string; connectionId: string; mode: string; forecast: GoalForecast }
type Insights = GoalInsights;
export function GoalResults({ goal, insights, stale = false }: { goal: SavedGoal; insights: Insights | null; stale?: boolean }) {
  const [month, setMonth] = useState('all');
  const forecast = goal.forecast;
  const months = forecastMonths(forecast);
  const slice = months.find(m => m.month === month);
  const period = slice || forecast.period;
  const result = slice ? insights?.months.find(m => m.month === slice.month) : insights?.total;
  const actual = result?.actual;
  const measuredDay = insights ? dayInZone(new Date(insights.fetchedAt), forecast.timezone) : period.since;
  const elapsed = Math.max(0, Math.min(period.days, daysBetween(period.since, measuredDay)));
  const paused = /PAUSED/.test(insights?.effectiveStatus || '');
  const money = (n: number) => `${n.toLocaleString('es-CO', { maximumFractionDigits: 2 })} ${forecast.currency}`;
  return <div className="space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-3"><p className="text-xs text-slate-500">{goal.accountId} · {goal.mode === 'single_ad' ? 'Solo el anuncio creado' : 'Campaña completa'} · {forecast.timezone}</p><select aria-label="Mes de cumplimiento" className="border rounded-xl p-2 text-sm" value={month} onChange={e => setMonth(e.target.value)}><option value="all">Todo el periodo</option>{months.map(m => <option key={m.month} value={m.month}>{m.month}</option>)}</select></div>
    <p className="text-sm text-slate-600">Meta original: {period.since} → {period.until} · {period.days} días · Presupuesto del periodo: <strong>{money(period.budget)}</strong></p>
    <div className="flex flex-wrap gap-3 text-xs"><span className="rounded-full bg-indigo-50 text-indigo-800 px-3 py-2">{forecast.source==='manual'?'Meta manual esperada':'Escenario esperado'} · {new Date(forecast.createdAt).toLocaleDateString('es-CO')}</span>{insights && <span className="rounded-full bg-slate-100 px-3 py-2">Meta: {insights.effectiveStatus || 'Estado no informado'}</span>}<span className="rounded-full bg-slate-100 px-3 py-2">Inversión real: {actual?.spend != null ? money(actual.spend) : 'Sin datos'}</span></div>
    {paused && <p className="text-sm text-amber-800">La campaña o el anuncio está en pausa. La meta supone entrega durante el periodo indicado; la pausa no cambia la meta original.</p>}
    {result?.state === 'scheduled' && <p className="text-sm text-slate-600">Este periodo todavía no empieza.</p>}
    {result?.state === 'no_delivery' && <p className="text-sm text-slate-600">Meta no devolvió datos de entrega para este periodo. No se interpreta como cero resultados confirmado.</p>}
    {stale && <p role="status" className="text-sm text-amber-800">No se pudo actualizar. Se conserva la última lectura; los porcentajes pueden estar desactualizados.</p>}
    <div className="overflow-x-auto"><table className="text-sm w-full text-left"><thead><tr className="border-b border-slate-200">{['Métrica', 'Meta esperada', 'Referencia a la fecha', 'Resultado Meta', 'Cumplimiento'].map(s => <th key={s} className="p-3 whitespace-nowrap">{s}</th>)}</tr></thead><tbody>{forecast.metrics.map(metric => {
      const target = slice ? slice.targets[metric.key]! : metric.expected;
      const value = actual?.[metric.key];
      const ratio = value != null && target > 0 ? value / target * 100 : null;
      return <tr key={metric.key} className="border-b border-slate-100"><th className="p-3 font-medium text-slate-800">{metricLabels[metric.key]}</th><td className="p-3">{target.toLocaleString('es-CO')}</td><td className="p-3 text-slate-500">{Math.round(target * elapsed / period.days).toLocaleString('es-CO')}</td><td className="p-3">{value == null ? metric.key === 'qualified_leads' ? 'Pendiente de calificación' : metric.key === 'profile_visits' ? 'Métrica de Meta por validar' : 'Sin datos' : value.toLocaleString('es-CO')}</td><td className="p-3 min-w-32">{ratio == null ? target === 0 ? 'Sin meta evaluable' : '—' : <><span className="font-semibold">{ratio.toFixed(1)}%</span><div className="h-1.5 rounded-full bg-slate-100 mt-2" aria-hidden="true"><div className="h-full rounded-full bg-indigo-500" style={{ width: `${Math.min(100, ratio)}%` }} /></div></>}</td></tr>;
    })}</tbody></table></div>
    <p className="text-xs text-slate-500">La referencia a la fecha reparte la meta de forma lineal hasta el día de la lectura; no predice la entrega diaria. Alcance se consulta por periodo, nunca sumando personas entre meses. Los leads calificados requieren confirmación comercial.</p>
    {!paused && actual && elapsed >= 3 && <p className="text-sm text-slate-700 rounded-xl bg-slate-50 p-4">Para optimizar, compara primero la inversión ejecutada con el presupuesto del periodo. Si el gasto avanza y el resultado principal queda bajo la referencia, revisa oferta, creativos y segmentación antes de aumentar el presupuesto.</p>}
    {insights && <p className="text-xs text-slate-500">Última consulta: {new Date(insights.fetchedAt).toLocaleString('es-CO')} · {insights.attribution}</p>}
  </div>;
}
export function GoalDashboard({ api = briefApi }: { api?: typeof briefApi }) {
  const [goals, setGoals] = useState<SavedGoal[]>([]);
  const [selected, setSelected] = useState('');
  const [listError, setListError] = useState('');
  const [listLoading, setListLoading] = useState(true);
  const [listVersion, setListVersion] = useState(0);
  const [insights, setInsights] = useState<Insights | null>(null);
  const [insightGoal, setInsightGoal] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const goal = goals.find(g => g.id === selected);
  useEffect(() => {
    let active = true;
    void api('goals').then(data => { if (active) { setGoals(data.goals); setSelected(previous => data.goals.some((g: SavedGoal) => g.id === previous) ? previous : data.goals[0]?.id || ''); } }).catch(e => { if (active) setListError(e.message); }).finally(() => { if (active) setListLoading(false); });
    return () => { active = false; };
  }, [api, listVersion]);
  useEffect(() => {
    if (!goal) return;
    let active = true; let timer: ReturnType<typeof setTimeout>;
    async function read() {
      if (document.visibilityState === 'hidden') { timer = setTimeout(() => void read(), 60000); return; }
      setLoading(true); setError('');
      try {
        const data = await api('goals/insights', { jobId: goal!.id, token: briefConnectionToken(goal!.connectionId) });
        if (active) { setInsights(data); setInsightGoal(goal!.id); }
      } catch (e) { if (active) setError((e as Error).message); }
      finally { if (active) { setLoading(false); timer = setTimeout(() => void read(), 60000); } }
    }
    void read();
    return () => { active = false; clearTimeout(timer); };
  }, [api, goal, refresh]);
  return <section className="rounded-3xl border border-indigo-200 bg-white p-5 md:p-7 space-y-5" aria-label="Cumplimiento de metas">
    <div className="flex items-start gap-3"><Target className="text-indigo-600 shrink-0" /><div><h2 className="text-xl font-bold text-slate-900">Cumplimiento de metas</h2><p className="text-sm text-slate-600 mt-1">Compara el escenario esperado con los resultados de cada campaña o anuncio creado con Tico.</p></div></div>
    <div className="flex flex-wrap gap-3 items-center"><select aria-label="Campaña con meta" value={selected} onChange={e => setSelected(e.target.value)} className="border rounded-xl p-3 text-sm max-w-full" disabled={!goals.length}><option value="">Selecciona una campaña</option>{goals.map(g => <option key={g.id} value={g.id}>{g.brand} · {g.mode === 'single_ad' ? 'Anuncio' : 'Campaña'} · {g.forecast.period.since} · {g.id.slice(0, 8)}</option>)}</select><button type="button" disabled={loading || listLoading} onClick={() => { setListError(''); setListLoading(true); setListVersion(n => n + 1); if (listError) setRefresh(n => n + 1); }} className="border rounded-full px-4 py-2 text-sm flex items-center gap-2 disabled:opacity-40"><RefreshCw size={15} />{loading || listLoading ? 'Consultando…' : 'Actualizar desde Meta'}</button></div>
    <p className="text-xs text-slate-500">Consulta automática cada 60 segundos mientras este dashboard esté visible. Se muestra la información disponible en Meta; no es una transmisión instantánea.</p>
    {(listError || error) && <p role="alert" className="text-sm text-rose-700">{listError || error}</p>}
    {!listLoading && !listError && !goals.length && <div className="rounded-2xl bg-slate-50 p-6 text-sm text-slate-600">Aún no hay metas desplegadas. Genera los tres escenarios al revisar tu estrategia: el esperado aparecerá aquí cuando el despliegue termine.</div>}
    {goal && <GoalResults key={goal.id} goal={goal} insights={insightGoal === goal.id ? insights : null} stale={!!error && !!insights && insightGoal === goal.id} />}
  </section>;
}
