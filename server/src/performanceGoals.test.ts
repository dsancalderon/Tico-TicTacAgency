import test from 'node:test';
import assert from 'node:assert/strict';
import { emptyBrief } from './domain/ticoBrief.js';
import { forecastInputKey, forecastMonths, goalPeriod, type GoalForecast } from './domain/performanceGoals.js';
import { assertForecastCurrent, createManualForecast, generateGoalForecast, signForecast, validateProjectionResponse, verifyForecast } from './services/performanceGoals.js';
import { normalizeGoalInsights, readGoalInsights } from './services/goalInsights.js';
import { deploymentGoal, goalToken } from './routes/goals.js';

const now = new Date('2026-09-28T15:00:00Z');
const expiry = '2026-10-16T05:00:00Z';
function brief() {
  const b = emptyBrief(); b.meta.currency = 'COP'; b.meta.timezone = 'America/Bogota'; b.meta.adAccountId = 'act_123'; b.metaConnectionId = 'connection'; b.meta.budgetType = 'CBO'; b.brief.dailyBudget = 30000; b.brief.goal = 'leads'; b.meta.destinationType = 'ON_AD'; b.goalPlan = { days: 30 };
  return b;
}
function response() { return { explanation: 'Estimación orientativa sin historial.', assumptions: ['Entrega continua y presupuesto constante.'], metrics: ['impressions', 'reach', 'link_clicks', 'leads'].map((key, i) => ({ key, conservative: 1000 - i * 200, expected: 1500 - i * 300, optimistic: 2000 - i * 400, assumption: 'Supuesto del modelo, no promedio observado.' })) }; }
function forecast(b = brief()): GoalForecast {
  return { version: 1, id: 'forecast', source: 'gemini', createdAt: now.toISOString(), model: 'gemini-3.6-flash', inputKey: forecastInputKey(b), period: goalPeriod(b, expiry, now), currency: b.meta.currency, timezone: b.meta.timezone, metrics: validateProjectionResponse(response(), b), explanation: 'Estimación', assumptions: ['Sin historial'] };
}
test('goals stop at subscription, campaign end or 30 days and split calendar months exactly', () => {
  const b = brief(); const f = forecast(b);
  assert.deepEqual(f.period, { since: '2026-09-28', until: '2026-10-15', days: 18, budget: 540000, subscriptionUntil: '2026-10-15' });
  const months = forecastMonths(f);
  assert.deepEqual(months.map(m => m.days), [3, 15]);
  for (const metric of f.metrics) assert.equal(months.reduce((sum, m) => sum + m.targets[metric.key]!, 0), metric.expected);
  assert.equal(months.reduce((sum, m) => sum + m.budget, 0), f.period.budget);
  assert.equal(goalPeriod(b, null, now).days, 30);
  b.brief.endDate = '2026-09-30'; assert.equal(goalPeriod(b, expiry, now).days, 3);
  b.goalPlan!.days = 31; assert.throws(() => goalPeriod(b, expiry, now), /30/);
});
test('account timezone and exclusive midnight subscription boundary prevent an extra day', () => {
  const b = brief(); const localNight = new Date('2026-09-29T02:00:00Z');
  assert.equal(goalPeriod(b, '2026-09-30T05:00:00Z', localNight).since, '2026-09-28');
  assert.equal(goalPeriod(b, '2026-09-30T05:00:00Z', localNight).until, '2026-09-29');
  b.meta.startDate = '2026-10-20'; assert.throws(() => goalPeriod(b, expiry, now), /días disponibles/);
});
test('ABO uses the sum once; lifetime prorates duration and single ad requires explicit budget share', () => {
  const b = brief(); b.meta.budgetType = 'ABO'; b.meta.adSets = [{ budgetAmount: 12000 }, { budgetAmount: 18000 }] as any;
  assert.equal(goalPeriod(b, expiry, now).budget, 540000);
  b.meta.budgetPeriod = 'lifetime'; b.meta.startDate = '2026-09-28'; b.brief.endDate = '2026-10-27';
  assert.equal(goalPeriod(b, expiry, now).budget, 18000);
  b.creationMode = 'single_ad'; assert.throws(() => goalPeriod(b, expiry, now), /porcentaje/);
  b.goalPlan!.singleAdBudgetShare = 25; assert.equal(goalPeriod(b, expiry, now).budget, 4500);
});
test('qualified leads require explicit criteria/rate and never replace raw leads', () => {
  const b = brief(); b.goalPlan!.qualificationRate = 25;
  assert.throws(() => goalPeriod(b, expiry, now), /criterios/);
  b.goalPlan!.qualificationCriteria = 'Contacto válido y dentro de Bogotá';
  const values = validateProjectionResponse(response(), b);
  assert.equal(values.find(m => m.key === 'qualified_leads')!.expected, values.find(m => m.key === 'leads')!.expected * .25);
  assert.equal(normalizeGoalInsights({ actions: [{ action_type: 'lead', value: '40' }] }, b).qualified_leads, null);
});
test('Gemini-free mode saves user targets with transparent scenarios and no subscription row', () => {
  const b = brief(); b.testMode = true;
  const expected = { impressions: 1000, reach: 700, link_clicks: 50, leads: 12 };
  const f = createManualForecast(b, null, expected, now);
  assert.equal(f.source, 'manual'); assert.equal(f.period.days, 30);
  assert.deepEqual(f.metrics.find(m => m.key === 'leads'), { key: 'leads', conservative: 10, expected: 12, optimistic: 14, assumption: 'Meta esperada indicada por el usuario; escenarios conservador y optimista calculados al 80 % y 120 %.' });
  assert.doesNotThrow(() => assertForecastCurrent(f, b, null, now));
  assert.throws(() => createManualForecast(b, null, { ...expected, reach: 1200 }, now), /alcance/);
  assert.throws(() => createManualForecast(b, null, { ...expected, leads: null }, now), /entera/);
  b.brief.dailyBudget += 1; assert.throws(() => assertForecastCurrent(f, b, null, now), /cambiaron/);
});
test('invalid, incomplete, negative, unordered and duplicate model responses are rejected', () => {
  for (const mutate of [
    (r: any) => { r.metrics.pop(); }, (r: any) => { r.metrics[0].expected = -1; },
    (r: any) => { r.metrics[0].conservative = 99999; }, (r: any) => { r.metrics[1].key = 'impressions'; },
    (r: any) => { r.metrics[0].expected = '1500'; }, (r: any) => { r.metrics[1].optimistic = 3000; },
  ]) { const r = response(); mutate(r); assert.throws(() => validateProjectionResponse(r, brief())); }
});
test('Gemini receives the final configuration and provider errors never create synthetic goals', async t => {
  process.env.GEMINI_API_KEY = 'fixture-key'; const b = brief(); b.brief.businessProfile.offerSummary = 'Oferta final';
  t.mock.method(globalThis, 'fetch', async (input: Parameters<typeof fetch>[0], init?: Parameters<typeof fetch>[1]) => {
    assert.match(String(input), /gemini-3\.6-flash/);
    const body = JSON.parse(String(init?.body)); assert.match(JSON.stringify(body), /Oferta final/); assert.match(JSON.stringify(body), /540000/);
    return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify(response()) }] } }] }));
  });
  const generated = await generateGoalForecast(b, expiry, now); assert.equal(generated.source, 'gemini'); assert.equal(generated.metrics.length, 4);
  t.mock.method(globalThis, 'fetch', async () => new Response(JSON.stringify({ error: { message: 'Quota exceeded' } }), { status: 429 }));
  await assert.rejects(() => generateGoalForecast(b, expiry, now), /429|Quota/);
});
test('saved goals reject altered configuration, new day, renewal and unsigned or cross-user data', () => {
  process.env.TICO_DEPLOYMENT_SECRET = 'test-performance-secret-at-least-32-chars';
  const b = brief(); const f = forecast(b); const signature = signForecast(f, 'owner', 'job', '{}');
  assert.equal(verifyForecast({ id: 'job', forecast: f, signature, resolved_key: '{}' }, 'owner').id, 'forecast');
  assert.throws(() => verifyForecast({ id: 'job', forecast: f, signature, resolved_key: '{}' }, 'other'), /verificación/);
  assertForecastCurrent(f, b, expiry, now);
  assert.throws(() => assertForecastCurrent(f, b, null, now), /suscripción/);
  assert.throws(() => assertForecastCurrent(f, b, expiry, new Date('2026-09-29T15:00:00Z')), /cambiaron/);
  assert.throws(() => assertForecastCurrent(f, b, '2026-10-18T05:00:00Z', now), /cambiaron/);
  b.brief.dailyBudget = 35000; assert.throws(() => assertForecastCurrent(f, b, expiry, now), /cambiaron/);
  f.metrics[0].expected++; assert.throws(() => verifyForecast({ id: 'job', forecast: f, signature, resolved_key: '{}' }, 'owner'), /verificación/);
});
test('manual goal stays signed and deployable without billing or Gemini', async () => {
  process.env.TICO_DEPLOYMENT_SECRET = 'test-performance-secret-at-least-32-chars';
  const b = brief(); b.testMode = true;
  const f = createManualForecast(b, null, { impressions: 1000, reach: 700, link_clicks: 50, leads: 12 });
  const row = { id: 'job', forecast: f, resolved_key: '{}', signature: signForecast(f, 'owner', 'job', '{}') };
  const db = { from: (table: string) => table === 'campaign_performance_goals'
    ? { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: row, error: null }) }) }) }
    : { select: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) } };
  assert.equal((await deploymentGoal(db, 'owner', 'job', b, {})).forecast.source, 'manual');
});
test('Meta mappings do not add aggregate actions and their subtypes or substitute all clicks', () => {
  const b = brief(); const normalized = normalizeGoalInsights({ spend: '15', clicks: '999', inline_link_clicks: '12', actions: [{ action_type: 'lead', value: '10' }, { action_type: 'onsite_conversion.lead_grouped', value: '8' }, { action_type: 'post_engagement', value: '20' }, { action_type: 'like', value: '15' }] }, b);
  assert.equal(normalized.leads, 8); assert.equal(normalized.link_clicks, 12); assert.equal(normalized.engagements, 20);
  assert.equal(normalizeGoalInsights({}, b).leads, null);
});
test('live reads query campaign/ad ID and each month independently, preserving unique reach', async t => {
  const b = brief(); const f = forecast(b); const calls: URL[] = [];
  t.mock.method(globalThis, 'fetch', async (input: Parameters<typeof fetch>[0]) => {
    const url = new URL(String(input)); calls.push(url);
    if (!url.pathname.endsWith('/insights')) return new Response(JSON.stringify({ account_id: '123', effective_status: 'ACTIVE' }));
    return new Response(JSON.stringify({ data: [{ account_currency: 'COP', reach: '100', impressions: '120', inline_link_clicks: '5', spend: '4000', actions: [] }] }));
  });
  const result = await readGoalInsights('token', '456', f, b, new Date('2026-10-16T15:00:00Z'));
  assert.equal(result.total.actual?.reach, 100); assert.equal(result.months.length, 2); assert.equal(calls.length, 4);
  assert.ok(calls.every(c => c.pathname.startsWith('/v21.0/456')));
  assert.equal(calls[1].searchParams.get('action_report_time'), 'impression');
});
test('missing delivery is distinct from zero and currency/account mismatch fails closed', async t => {
  const b = brief(); const f = forecast(b);
  t.mock.method(globalThis, 'fetch', async (input: Parameters<typeof fetch>[0]) => new Response(JSON.stringify(String(input).includes('/insights') ? { data: [] } : { account_id: '123' })));
  assert.equal((await readGoalInsights('token', '456', f, b, now)).total.state, 'no_delivery');
  t.mock.method(globalThis, 'fetch', async (input: Parameters<typeof fetch>[0]) => new Response(JSON.stringify(String(input).includes('/insights') ? { data: [{ account_currency: 'USD' }] } : { account_id: '123' })));
  await assert.rejects(() => readGoalInsights('token', '456', f, b, now), /moneda/);
  t.mock.method(globalThis, 'fetch', async () => new Response(JSON.stringify({ account_id: '999' })));
  await assert.rejects(() => readGoalInsights('token', '456', f, b, now), /cuenta/);
});
test('goal connections do not fall back to unrelated tokens and absent goals block deployment', async () => {
  let calls = 0;
  await assert.rejects(() => goalToken({ rpc: async () => { calls++; return { error: true }; } }, 'named'), /Reconecta/); assert.equal(calls, 1);
  const db = { from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null }) }) }) }) };
  await assert.rejects(() => deploymentGoal(db, 'owner', 'job', brief(), {}), /No hay una meta/);
});

