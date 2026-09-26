import { Router } from 'express';
import { graph, graphList, inspectConnection } from '../services/briefMeta.js';
import { analyzeBusinessSource } from '../services/aiStrategist.js';
import { readPublicUrl } from '../services/businessSource.js';

export const briefRouter = Router();
briefRouter.use((_req, res, next) => {
  res.setHeader('Cache-Control', 'no-store');
  if (process.env.TICO_FORM_V2 !== 'true') { res.status(404).json({ error: 'El formulario V2 no está habilitado.' }); return; }
  next();
});
export async function connectionToken(db: any, id: string): Promise<string> {
  const result = id === 'legacy' ? await db.rpc('load_ad_token', { p_platform: 'meta' }) : await db.rpc('load_meta_brief_token', { p_id: id });
  if (result.error || !result.data) throw new Error('Reconecta tu cuenta de Meta para continuar.');
  return result.data;
}
briefRouter.post('/analyze', async (req, res) => {
  try {
    const token = await connectionToken(res.locals.supabase, req.body.connectionId);
    res.json(await analyzeBusinessSource(req.body.source, { token, pageId: req.body.pageId, db: res.locals.supabase, userId: res.locals.authUser.id }));
  } catch (error) { res.status(400).json({ error: (error as Error).message }); }
});
briefRouter.post('/import-image', async (req,res) => {
  try {
    const image=await readPublicUrl(req.body.url,12*1024*1024);
    const mime=image.contentType.split(';')[0]; if(!['image/jpeg','image/png'].includes(mime))throw new Error('Elige una imagen JPG o PNG.');
    const path=`${res.locals.authUser.id}/${crypto.randomUUID()}/fuente.${mime==='image/png'?'png':'jpg'}`;
    const result=await res.locals.supabase.storage.from('user-creatives').upload(path,image.body,{contentType:mime});
    if(result.error)throw new Error('No pude guardar la imagen.');
    res.json({asset:{uploadId:path,type:'image',angle:'Beneficio',name:'Imagen de tu fuente'}});
  } catch(error){res.status(400).json({error:(error as Error).message});}
});
briefRouter.post('/catalogs', async (req, res) => {
  try {
    const token = await connectionToken(res.locals.supabase,req.body.connectionId);
    const businesses = await graphList(token,'me/businesses',{fields:'id'});
    res.json({ catalogs: (await Promise.all(businesses.map(b => graphList(token,`${b.id}/owned_product_catalogs`,{fields:'id,name'})))).flat() });
  } catch (error) { res.status(400).json({ error: (error as Error).message }); }
});
briefRouter.get('/connections', async (_req, res) => {
  const db = res.locals.supabase;
  const named = await db.from('meta_brief_connections').select('id,name,connected_at');
  const legacy = await db.from('ad_connections').select('settings,updated_at').eq('platform','meta').maybeSingle();
  const items = named.data || [];
  if (legacy.data) items.push({ id: 'legacy', name: legacy.data.settings.userName || legacy.data.settings.businessManagerName || 'Conexión actual', connected_at: legacy.data.updated_at });
  res.json({ connections: items, warning: named.error ? 'Aplica la migración V2 para guardar varias conexiones.' : undefined });
});
briefRouter.post('/assets', async (req, res) => {
  try {
    const token = await connectionToken(res.locals.supabase, req.body.connectionId);
    const result = await inspectConnection(token);
    let pixels: any[] = []; let instagram: any; let campaigns: any[] = []; let adSets: any[] = [];
    if (result.valid && req.body.accountId) {
      if (!result.accounts.some((a: any) => a.id === req.body.accountId)) throw new Error('La cuenta no pertenece a esta conexión.');
      pixels = await graphList(token, `${req.body.accountId}/adspixels`, { fields: 'id,name,last_fired_time' });
      campaigns = await graphList(token, `${req.body.accountId}/campaigns`, { fields: 'id,name,status,objective' });
      if (req.body.campaignId) {
        if (!campaigns.some(c => c.id === req.body.campaignId)) throw new Error('Campaña ajena a la cuenta.');
        adSets = await graphList(token, `${req.body.campaignId}/adsets`, { fields: 'id,name,status,optimization_goal,destination_type,promoted_object' });
      }
    }
    if (result.valid && req.body.pageId) {
      if (!result.pages.some((p: any) => p.id === req.body.pageId)) throw new Error('Selecciona una página con permiso para anunciar.');
      instagram = (await graph(token, req.body.pageId, { fields: 'instagram_business_account' })).instagram_business_account;
    }
    res.json({ ...result, pixels, instagram, campaigns, adSets });
  } catch (error) { res.status(400).json({ error: (error as Error).message }); }
});
