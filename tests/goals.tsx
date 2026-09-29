// Development fixture, deliberately excluded from the production entrypoint.
import { createRoot } from 'react-dom/client';
import { useState } from 'react';
import { GoalForecastPanel } from '../src/components/GoalForecastPanel';
import { GoalDashboard } from '../src/components/Dashboard/GoalDashboard';
import { emptyBrief } from '../server/src/domain/ticoBrief';
import { forecastInputKey, forecastMonths, goalPeriod, type GoalForecast } from '../server/src/domain/performanceGoals';
import { toLegacyPayload } from '../src/services/ticoBriefAdapter';
import type { GeneratedCampaignStrategy } from '../src/types';
import '../src/index.css';
const b = emptyBrief(); b.meta.currency = 'COP'; b.meta.timezone = 'America/Bogota'; b.meta.budgetType = 'CBO'; b.metaConnectionId = 'fixture'; b.meta.adAccountId = 'act_123'; b.brief.dailyBudget = 30000; b.brief.businessProfile.brandName = 'Casa del Pan'; b.brief.goal = 'leads'; b.goalPlan = { days: 30, qualificationRate: 25, qualificationCriteria: 'Contacto válido, ubicado en Bogotá y con intención de compra.' };
const ends = new Date(); ends.setDate(ends.getDate() + 18);
function makeForecast(brief = b): GoalForecast { return { id: 'fixture', version: 1, inputKey: forecastInputKey(brief), createdAt: new Date().toISOString(), source: 'gemini', model: 'gemini-3.6-flash', currency: 'COP', timezone: b.meta.timezone, period: goalPeriod(brief, ends.toISOString()), metrics: [
  { key: 'impressions', conservative: 30000, expected: 45000, optimistic: 60000, assumption: 'Datos ficticios de la prueba visual.' },
  { key: 'reach', conservative: 16000, expected: 23000, optimistic: 30000, assumption: 'Datos ficticios, sin sumar alcance diario.' },
  { key: 'link_clicks', conservative: 450, expected: 900, optimistic: 1400, assumption: 'Clics en enlace, no todos los clics.' },
  { key: 'leads', conservative: 22, expected: 45, optimistic: 70, assumption: 'Contactos recibidos, sin calificar.' },
  { key: 'qualified_leads', conservative: 6, expected: 11, optimistic: 18, assumption: 'Tasa ficticia de 25% para revisar la interfaz.' },
], explanation: 'Ejemplo visual de resultados previstos para una campaña local de clientes potenciales. Estas cifras son ficticias.', assumptions: ['Datos ficticios: no se contacta a Gemini, Meta ni Supabase.', 'La meta esperada se conserva para comparar resultados posteriores.'] }; }
const fixtureApi = async (path: string, body?: any) => {
  await new Promise(resolve => setTimeout(resolve, 300));
  if (path === 'goals/context') return { subscriptionEndsAt: ends.toISOString() };
  if (path === 'goals/forecast') return { brief: body.brief, forecast: makeForecast(body.brief), warnings: [] };
  if (path === 'goals/manual') return { brief: body.brief, forecast: { ...makeForecast(body.brief), source: 'manual', model: 'manual', period: goalPeriod(body.brief, null), metrics: ['impressions','reach','link_clicks','leads'].map(key => ({ key, conservative: Math.round(body.expected[key] * .8), expected: body.expected[key], optimistic: Math.round(body.expected[key] * 1.2), assumption: 'Meta manual ficticia: 80 % / 100 % / 120 %.' })) }, warnings: [] };
  const forecast = makeForecast();
  if (path === 'goals') return { goals: [{ id: 'fixture-campaign', forecast, brand: 'Casa del Pan · Ejemplo ficticio', accountId: 'act_123', connectionId: 'fixture', mode: 'full_campaign' }] };
  if (path === 'goals/insights') {
    const actual = { spend: 186000, impressions: 18200, reach: 12400, link_clicks: 320, leads: 17, qualified_leads: null };
    return { total: { ...forecast.period, actual, state: 'available' }, months: forecastMonths(forecast).map(m => ({ ...m, actual, state: 'available' })), effectiveStatus: 'ACTIVE', fetchedAt: new Date().toISOString(), attribution: 'Lectura ficticia para prueba local.' };
  }
  throw new Error('Ruta de prueba no prevista');
};
export function GoalFixture() {
  const [strategy, setStrategy] = useState<GeneratedCampaignStrategy>({ id: 'fixture', briefingId: 'fixture', brandName: 'Casa del Pan', strategySummary: '', totalBudget: 900000, currency: 'COP', createdAt: new Date().toISOString(), creditCost: 5, creatives: [], complianceChecked: false, status: 'draft', metaBuilderPayload: toLegacyPayload(b) });
  const [fail, setFail] = useState(false);
  const [manual, setManual] = useState(false);
  const [view, setView] = useState('forecast');
  const api = fail ? async (path: string, body?: unknown) => { if (path === 'goals/forecast') throw new Error('Gemini 429: cuota de prueba agotada.'); return fixtureApi(path, body); } : fixtureApi;
  return <main className="max-w-5xl mx-auto p-4 md:p-8 space-y-5"><div className="p-4 bg-amber-100 rounded-2xl text-sm font-semibold">PRUEBA LOCAL · Datos ficticios · Sin llamadas ni escrituras en Meta, Gemini o Supabase</div><div className="flex gap-3 flex-wrap"><button className="border bg-white rounded-xl p-3" onClick={() => setView('forecast')}>Ver proyección</button><button className="border bg-white rounded-xl p-3" onClick={() => setView('dashboard')}>Ver dashboard</button><label className="p-3 text-sm"><input type="checkbox" checked={manual} onChange={e=>{const enabled=e.target.checked;setManual(enabled);setStrategy(previous=>({...previous,metaBuilderPayload:{...previous.metaBuilderPayload!,ticoBrief:{...previous.metaBuilderPayload!.ticoBrief!,testMode:enabled},goalForecast:undefined}}));setView('forecast');}} /> Modo sin Gemini: metas manuales</label><label className="p-3 text-sm"><input type="checkbox" checked={fail} onChange={e => setFail(e.target.checked)} /> Simular cuota agotada</label></div>{view === 'forecast' ? <GoalForecastPanel key={manual?'manual':'gemini'} strategy={strategy} onChange={setStrategy} api={manual?async(path,body)=>path==='goals/context'?{subscriptionEndsAt:null}:fixtureApi(path,body):api} /> : <GoalDashboard api={fixtureApi} />}</main>;
}
const root = createRoot(document.getElementById('root')!);
root.render(<GoalFixture />);
if (import.meta.hot) import.meta.hot.dispose(() => root.unmount());
