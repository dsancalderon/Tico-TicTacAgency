import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Target, RefreshCw } from 'lucide-react';
import type { GeneratedCampaignStrategy } from '../types';
import { briefApi, briefConnectionToken } from '../services/briefApi';
import { forecastInputKey, forecastMonths, goalMetricKeys, goalPeriod, metricLabels, type GoalPlan } from '../../server/src/domain/performanceGoals';

export function GoalForecastPanel({ strategy, onChange, disabled = false, api = briefApi }: {
  strategy: GeneratedCampaignStrategy; onChange: (value: GeneratedCampaignStrategy) => void;
  disabled?: boolean; api?: typeof briefApi;
}) {
  const b = strategy.metaBuilderPayload!.ticoBrief!;
  const manual = Boolean(b.testMode);
  const forecast = strategy.metaBuilderPayload?.goalForecast;
  const plan = b.goalPlan || { days: 30 };
  const [subscription, setSubscription] = useState<string | null>(null);
  const [contextError, setContextError] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [expected, setExpected] = useState<Record<string, string>>(() => Object.fromEntries(forecast?.metrics.map(m => [m.key, String(m.expected)]) || []));
  const [contextReady, setContextReady] = useState(false);
  const latest = useRef(strategy);
  useLayoutEffect(() => { latest.current = strategy; }, [strategy]);
  useEffect(() => {
    let active = true;
    void api('goals/context').then(result => { if (active) { setSubscription(result.subscriptionEndsAt); setContextReady(true); } }).catch(e => { if (active) setContextError(e.message); });
    return () => { active = false; };
  }, [api]);
  let period: ReturnType<typeof goalPeriod> | undefined; let periodError = '';
  try { period = goalPeriod(b, subscription); } catch (e) { periodError = (e as Error).message; }
  const stale = !!forecast && (forecast.inputKey !== forecastInputKey(b) || !period || JSON.stringify(forecast.period) !== JSON.stringify(period));
  function updatePlan(next: Partial<GoalPlan>) {
    onChange({ ...strategy, metaBuilderPayload: { ...strategy.metaBuilderPayload!, ticoBrief: { ...b, goalPlan: { ...plan, ...next } } } });
  }
  async function generate() {
    const snapshot = latest.current;
    const brief = { ...snapshot.metaBuilderPayload!.ticoBrief!, goalPlan: plan };
    const input = forecastInputKey(snapshot.metaBuilderPayload!.ticoBrief!);
    setBusy(true); setError('');
    try {
      const result = await api(manual ? 'goals/manual' : 'goals/forecast', { jobId: snapshot.id, brief, expected: Object.fromEntries(Object.entries(expected).map(([key, value]) => [key, value === '' ? null : Number(value)])), token: briefConnectionToken(brief.metaConnectionId) });
      if (forecastInputKey(latest.current.metaBuilderPayload!.ticoBrief!) !== input) { setError('La configuración cambió durante el cálculo. Genera de nuevo la proyección.'); return; }
      const current = latest.current;
      onChange({ ...current, totalBudget: result.forecast.period.budget, currency: result.forecast.currency,
        metaAds: current.metaAds ? { ...current.metaAds, budgetAmount: result.forecast.period.budget, dailyBudget: result.forecast.period.budget / result.forecast.period.days } : undefined,
        metaBuilderPayload: { ...current.metaBuilderPayload!, totalBudget: result.brief.brief.dailyBudget, currency: result.brief.meta.currency, ticoBrief: result.brief, goalForecast: result.forecast } });
    } catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  }
  return <section aria-label="Proyección y metas" className="rounded-3xl border border-indigo-200 bg-white p-5 md:p-8 space-y-5">
    <div className="flex items-start gap-3"><Target className="text-indigo-600 shrink-0 mt-1" /><div><h3 className="text-xl font-bold text-slate-900">Proyección y metas</h3><p className="text-sm text-slate-600 mt-1">{manual?'Introduce tus metas esperadas para el periodo. Tico calculará escenarios al 80 % y 120 % de cada valor, sin consultar Gemini.':'Revisa el alcance de tu inversión antes de desplegar. El escenario esperado se guardará como la meta del dashboard.'}</p></div></div>
    <div className="grid sm:grid-cols-2 gap-4">
      <label className="text-sm font-medium text-slate-700">Días de proyección (máximo 30)<input type="number" min="1" max="30" value={plan.days} disabled={disabled || busy} onChange={e => updatePlan({ days: Number(e.target.value) })} className="block mt-2 w-full border border-slate-300 rounded-xl p-3" /></label>
      <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600"><strong className="text-slate-900">Vigencia de la suscripción</strong><p className="mt-1">{subscription ? new Date(subscription).toLocaleString('es-CO') : contextReady ? manual?'Sin vigencia cargada; se usará el límite de 30 días o el fin de campaña.':'Pendiente de conectar la vigencia del plan.' : 'Consultando…'}</p><p className="text-xs mt-1">La meta termina al vencer el plan o la campaña, lo que ocurra primero. Este límite no apaga anuncios en Meta.</p></div>
    </div>
    {b.creationMode === 'single_ad' && <label className="block text-sm text-slate-700">Porcentaje estimado del presupuesto compartido para este anuncio<input type="number" min="0.01" max="100" step="0.01" value={plan.singleAdBudgetShare ?? ''} disabled={disabled || busy} onChange={e => updatePlan({ singleAdBudgetShare: e.target.value ? Number(e.target.value) : undefined })} className="block mt-2 border rounded-xl p-3 w-full" /><span className="block mt-2 text-xs text-slate-500">Es un supuesto para la proyección: Meta distribuye el presupuesto entre anuncios. El cálculo final leerá el presupuesto vigente del conjunto o campaña.</span></label>}
    {b.brief.goal === 'leads' && <details className="rounded-xl border border-slate-200 p-4"><summary className="cursor-pointer font-semibold text-sm">Definir leads calificados (opcional)</summary><p className="text-xs text-slate-600 my-3">Recomendación: contacto válido, dentro de tu zona de atención, con necesidad del servicio y condiciones de compra compatibles. La calificación debe confirmarse comercialmente.</p><label className="block text-sm">Criterios de tu negocio<textarea value={plan.qualificationCriteria || ''} maxLength={1000} disabled={disabled || busy} onChange={e => updatePlan({ qualificationCriteria: e.target.value })} className="block border rounded-xl p-3 mt-2 w-full" /></label><label className="block mt-3 text-sm">Porcentaje que esperas calificar, según tu experiencia<input type="number" min="0" max="100" value={plan.qualificationRate ?? ''} disabled={disabled || busy} onChange={e => updatePlan({ qualificationRate: e.target.value === '' ? undefined : Number(e.target.value) })} className="block border rounded-xl p-3 mt-2 w-full" /></label><p className="text-xs text-slate-500 mt-2">Sin una tasa declarada, la meta de leads calificados queda por validar. El resultado real requiere un registro comercial o CRM.</p></details>}
    {period && <p className="text-sm text-slate-700">{period.since} → {period.until} · {period.days} días · Inversión prevista: <strong>{period.budget.toLocaleString('es-CO')} {b.meta.currency}</strong></p>}
    {b.brief.goal === 'ig_profile' && <p className="text-xs text-amber-800">Podemos estimar visitas al perfil. La lectura de esa métrica en Meta todavía está por validar; no se reemplazará por clics al evaluar cumplimiento.</p>}
    {!subscription && contextReady && !manual && <p className="text-sm text-amber-800">Puedes preparar una estimación provisional. Para desplegar con una meta hay que confirmar primero la vigencia de la suscripción.</p>}
    {(contextError || periodError) && <p role="alert" className="text-sm text-amber-800">{contextError || periodError}</p>}
    {stale && <p role="alert" className="text-sm text-amber-800">Esta proyección está desactualizada. Recalcula para guardar una meta que corresponda a la configuración final.</p>}
    {manual&&<div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">{goalMetricKeys(b).map(key => <label className="text-sm font-medium text-slate-700" key={key}>{metricLabels[key]} · meta esperada<input type="number" min="0" step="1" required value={expected[key]??''} disabled={disabled||busy} onChange={e=>setExpected(previous=>({...previous,[key]:e.target.value}))} className="block mt-2 w-full border border-slate-300 rounded-xl p-3" /></label>)}</div>}
    <button type="button" disabled={disabled || busy || !contextReady || !!periodError} onClick={() => void generate()} className="inline-flex items-center gap-2 rounded-full bg-indigo-600 text-white px-5 py-3 font-semibold text-sm disabled:opacity-40"><RefreshCw size={16} className={busy ? 'animate-spin' : ''} />{busy ? 'Calculando escenarios…' : manual ? forecast ? 'Actualizar metas manuales' : 'Guardar metas manuales' : forecast ? 'Recalcular con Gemini' : 'Calcular escenarios con Gemini'}</button>
    {error && <p role="alert" className="text-sm text-rose-700">{error} No se creó una meta nueva. El borrador se conserva.</p>}
    {!forecast && <div className="grid sm:grid-cols-3 gap-3">{['Conservador', 'Esperado · meta', 'Optimista'].map(label => <div key={label} className="border border-dashed rounded-2xl p-5 bg-slate-50"><p className="font-semibold text-sm">{label}</p><p className="text-2xl text-slate-400 my-2">—</p><p className="text-xs text-slate-500">{manual?'Pendiente de metas manuales':'Pendiente de estimación con Gemini'}</p></div>)}</div>}
    {forecast && <div className={stale ? 'opacity-60 space-y-4' : 'space-y-4'}>
      <p className="text-sm text-slate-600">{forecast.explanation}</p>
      <div className="overflow-x-auto"><table className="w-full text-sm text-left"><thead><tr className="border-b"><th className="p-3">Resultado</th><th className="p-3">Conservador</th><th className="p-3 bg-indigo-50 text-indigo-800">Esperado · meta</th><th className="p-3">Optimista</th></tr></thead><tbody>{forecast.metrics.map(m => <tr key={m.key} className="border-b border-slate-100"><th className="p-3 font-medium" title={m.assumption}>{metricLabels[m.key]}</th><td className="p-3">{m.conservative.toLocaleString('es-CO')}</td><td className="p-3 font-bold text-indigo-800 bg-indigo-50">{m.expected.toLocaleString('es-CO')}</td><td className="p-3">{m.optimistic.toLocaleString('es-CO')}</td></tr>)}</tbody></table></div>
      <details><summary className="text-sm font-semibold cursor-pointer">Desglose mensual de la meta esperada</summary><div className="grid sm:grid-cols-2 gap-3 mt-3">{forecastMonths(forecast).map(month => <div key={month.month} className="border rounded-xl p-4 text-sm"><strong>{month.month} · {month.days} días</strong><p>{month.since} → {month.until}</p><p>{month.budget.toLocaleString('es-CO')} {forecast.currency}</p>{forecast.metrics.map(m => <p key={m.key} className="text-slate-600 mt-1">{metricLabels[m.key]}: {month.targets[m.key]?.toLocaleString('es-CO')}</p>)}</div>)}</div><p className="text-xs text-slate-500 mt-2">Reparto proporcional para planear, no una predicción de cada día. El alcance mensual real no se suma: una persona puede aparecer en varios meses.</p></details>
      <details><summary className="text-sm font-semibold cursor-pointer">Supuestos y método</summary><ul className="list-disc pl-5 text-xs text-slate-600 space-y-2 mt-3">{forecast.assumptions.map((a, i) => <li key={i}>{a}</li>)}{forecast.metrics.map(m => <li key={m.key}>{metricLabels[m.key]}: {m.assumption}</li>)}</ul></details>
      <p className="text-xs text-slate-500">{forecast.source==='manual'?'Metas introducidas por el usuario':'Estimación orientativa de Gemini'} · {new Date(forecast.createdAt).toLocaleString('es-CO')} · No garantiza resultados. Se conserva la meta original aunque Meta reporte cambios.</p>
    </div>}
  </section>;
}
