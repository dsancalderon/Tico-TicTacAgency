import { Router } from 'express';
import { forecastInputKey, stableJson } from '../domain/performanceGoals.js';
import type { TicoBrief } from '../domain/ticoBrief.js';
import { validateDeployment, verifyLedger } from '../services/briefDeployment.js';
import { assertForecastCurrent, createManualForecast, generateGoalForecast, signForecast, subscriptionEnd, verifyForecast } from '../services/performanceGoals.js';
import { readGoalInsights } from '../services/goalInsights.js';

export const goalsRouter = Router();
export async function goalToken(db: any, id: string, explicitToken?: string): Promise<string> {
  // Never silently substitute another saved connection or a server-wide token.
  if (typeof explicitToken === 'string' && explicitToken.length > 10) return explicitToken;
  const { data, error } = await db.rpc(id === 'legacy' ? 'load_ad_token' : 'load_meta_brief_token', id === 'legacy' ? { p_platform: 'meta' } : { p_id: id });
  if (error || typeof data !== 'string' || !data) throw new Error('Reconecta la conexión de Meta usada por esta campaña.');
  return data;
}
goalsRouter.get('/context', async (_req, res) => {
  try { res.json({ subscriptionEndsAt: await subscriptionEnd(res.locals.supabase) }); }
  catch (error) { res.status(400).json({ error: (error as Error).message }); }
});
goalsRouter.post('/forecast', async (req, res) => {
  try {
    const { jobId, brief } = req.body;
    if (!/^[0-9a-f-]{36}$/i.test(jobId || '')) throw new Error('Guarda el borrador antes de generar sus metas.');
    const db = res.locals.supabase;
    const job = await db.from('tico_brief_deployments').select('id').eq('id', jobId).maybeSingle();
    if (job.error) throw new Error('No pude verificar el estado del despliegue.');
    if (job.data) throw new Error('La meta de un despliegue iniciado está congelada. Crea un nuevo borrador para cambiarla.');
    const token = await goalToken(db, brief?.metaConnectionId, req.body.token);
    if (/demo/i.test(token)) throw new Error('Una conexión de demostración no genera metas reales.');
    const input = structuredClone(brief);
    input.goalPlan ||= { days: 30 };
    const validation = await validateDeployment(input, token);
    if (!validation.valid) throw new Error(validation.errors.join(' '));
    const forecast = await generateGoalForecast(validation.brief, await subscriptionEnd(db));
    const resolvedKey = stableJson(validation.interests);
    const signature = signForecast(forecast, res.locals.authUser.id, jobId, resolvedKey);
    const saved = await db.from('campaign_performance_goals').upsert({ id: jobId, forecast, resolved_key: resolvedKey, signature });
    if (saved.error) throw new Error('No pude guardar la meta. Revisa la migración o si ya comenzó el despliegue.');
    res.json({ forecast, brief: validation.brief, warnings: validation.warnings });
  } catch (error) { res.status(400).json({ error: (error as Error).message }); }
});

goalsRouter.post('/manual', async (req, res) => {
  try {
    const { jobId, brief, expected } = req.body;
    if (!brief?.testMode) throw new Error('Activa el modo de prueba sin Gemini para definir metas manuales.');
    if (!/^[0-9a-f-]{36}$/i.test(jobId || '')) throw new Error('Guarda el borrador antes de definir sus metas.');
    const db = res.locals.supabase;
    const job = await db.from('tico_brief_deployments').select('id').eq('id', jobId).maybeSingle();
    if (job.error || job.data) throw new Error('No se puede cambiar la meta de un despliegue iniciado.');
    const token = await goalToken(db, brief.metaConnectionId, req.body.token);
    if (/demo/i.test(token)) throw new Error('Una conexión de demostración no permite guardar metas reales.');
    const input = structuredClone(brief);
    input.goalPlan ||= { days: 30 };
    const validation = await validateDeployment(input, token);
    if (!validation.valid) throw new Error(validation.errors.join(' '));
    const forecast = createManualForecast(validation.brief, await subscriptionEnd(db), expected);
    const resolvedKey = stableJson(validation.interests);
    const signature = signForecast(forecast, res.locals.authUser.id, jobId, resolvedKey);
    const saved = await db.from('campaign_performance_goals').upsert({ id: jobId, forecast, resolved_key: resolvedKey, signature });
    if (saved.error) throw new Error('No pude guardar la meta manual. Revisa la migración o si ya comenzó el despliegue.');
    res.json({ forecast, brief: validation.brief, warnings: validation.warnings });
  } catch (error) { res.status(400).json({ error: (error as Error).message }); }
});

export async function deploymentGoal(db: any, owner: string, id: string, b: TicoBrief, interests: unknown) {
  const { data, error } = await db.from('campaign_performance_goals').select('*').eq('id', id).maybeSingle();
  if (error) throw new Error('No pude leer la meta guardada. Verifica la migración de metas.');
  const forecast = verifyForecast(data, owner);
  assertForecastCurrent(forecast, b, await subscriptionEnd(db));
  if (data.resolved_key !== stableJson(interests)) throw new Error('La segmentación disponible cambió. Vuelve a generar la proyección.');
  return { forecast, signature: data.signature };
}

goalsRouter.get('/', async (_req, res) => {
  try {
    const db = res.locals.supabase; const owner = res.locals.authUser.id;
    const [goals, jobs] = await Promise.all([db.from('campaign_performance_goals').select('*').order('created_at', { ascending: false }), db.from('tico_brief_deployments').select('*')]);
    if (goals.error || jobs.error) throw new Error('No pude cargar las metas guardadas. Verifica la migración de metas.');
    const result = [];
    for (const row of goals.data || []) {
      const job = jobs.data?.find((j: any) => j.id === row.id);
      if (!job?.ledger?.completed || job.ledger.rolledBack) continue;
      if (!verifyLedger(job.ledger, job.signature, owner, job.id, job.brief_hash)) throw new Error('Un despliegue no pasó la verificación.');
      const forecast = verifyForecast(row, owner);
      if (job.ledger.goalForecastId !== forecast.id) throw new Error('La meta no corresponde al despliegue.');
      const b = JSON.parse(forecast.inputKey) as TicoBrief;
      result.push({ id: row.id, forecast, brand: b.brief.businessProfile.brandName, accountId: b.meta.adAccountId, connectionId: b.metaConnectionId, mode: b.creationMode });
    }
    res.json({ goals: result });
  } catch (error) { res.status(400).json({ error: (error as Error).message }); }
});
goalsRouter.post('/insights', async (req, res) => {
  try {
    const db = res.locals.supabase; const owner = res.locals.authUser.id; const id = req.body.jobId;
    const [row, job] = await Promise.all([db.from('campaign_performance_goals').select('*').eq('id', id).single(), db.from('tico_brief_deployments').select('*').eq('id', id).single()]);
    if (row.error || job.error || !job.data?.ledger?.completed || job.data.ledger.rolledBack) throw new Error('No hay un despliegue completado para esta meta.');
    if (!verifyLedger(job.data.ledger, job.data.signature, owner, id, job.data.brief_hash)) throw new Error('Despliegue inválido.');
    const forecast = verifyForecast(row.data, owner);
    if (job.data.ledger.goalForecastId !== forecast.id) throw new Error('La meta no corresponde al despliegue.');
    const b = JSON.parse(forecast.inputKey) as TicoBrief;
    if (forecastInputKey(b) !== forecast.inputKey) throw new Error('Configuración guardada inválida.');
    const kind = b.creationMode === 'single_ad' ? 'ad' : 'campaign';
    const target = job.data.ledger.items.find((i: any) => i.kind === kind && !i.deleted);
    if (!target) throw new Error('No hay un recurso real de Meta asociado a esta meta.');
    const token = await goalToken(db, b.metaConnectionId, req.body.token);
    res.json(await readGoalInsights(token, target.id, forecast, b));
  } catch (error) { res.status(400).json({ error: (error as Error).message }); }
});
