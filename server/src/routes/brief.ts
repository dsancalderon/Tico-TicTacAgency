import { Router } from 'express';
import { graph, graphList, inspectConnection } from '../services/briefMeta.js';
import { analyzeBusinessSource } from '../services/aiStrategist.js';
import { readPublicUrl } from '../services/businessSource.js';
import { briefHash, signLedger, verifyLedger, validateDeployment, executeDeployment, rollbackDeployment, type DeploymentLedger } from '../services/briefDeployment.js';

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

briefRouter.post('/validate', async(req,res)=>{
  try {const token=await connectionToken(res.locals.supabase,req.body.brief.metaConnectionId);res.json(await validateDeployment(req.body.brief,token));}
  catch(error){res.status(400).json({error:(error as Error).message});}
});
briefRouter.post('/deploy', async(req,res)=>{
  const db=res.locals.supabase;const owner=res.locals.authUser.id;const id=req.body.jobId;let claimed=false;
  try{
    if(!/^[0-9a-f-]{36}$/i.test(id||''))throw new Error('Identificador de despliegue inválido.');
    const token=await connectionToken(db,req.body.brief.metaConnectionId);
    const validation=await validateDeployment(req.body.brief,token);
    if(!validation.valid){res.json({success:false,error:validation.errors.join(' '),...validation});return;}
    const hash=briefHash(req.body.brief);
    let job=(await db.from('tico_brief_deployments').select('*').eq('id',id).maybeSingle()).data;
    if(!job){const ledger:DeploymentLedger={items:[],accountId:validation.brief.meta.adAccountId,connectionId:validation.brief.metaConnectionId};const initial={id,brief_hash:hash,ledger,signature:signLedger(ledger,owner,id,hash)};
      const insert=await db.from('tico_brief_deployments').insert(initial);if(insert.error)throw new Error('No pude iniciar el registro de despliegue. Verifica la migración o reintenta.');job=initial;
    }
    if(job.brief_hash!==hash)throw new Error('Este despliegue tiene otra versión del briefing. Elimina lo creado antes de cambiarlo.');
    if(!verifyLedger(job.ledger,job.signature,owner,id,hash))throw new Error('El registro de despliegue no pasó la verificación.');
    const claim=await db.rpc('claim_tico_deployment',{p_id:id});if(claim.error||!claim.data)throw new Error('Este despliegue está en curso o necesita revisar una interrupción.');claimed=true;
    const ledger=job.ledger as DeploymentLedger;
    const save=async()=>{const result=await db.from('tico_brief_deployments').update({ledger,signature:signLedger(ledger,owner,id,hash),updated_at:new Date().toISOString()}).eq('id',id);if(result.error)throw new Error('No pude guardar el avance. Revisa Meta antes de reintentar.');};
    const loadMedia=async(path:string)=>{
      if(!path.startsWith(`${owner}/`)||path.includes('..'))throw new Error('El archivo no pertenece a tu espacio.');
      const download=await db.storage.from('user-creatives').download(path);if(download.error||!download.data||download.data.size>20*1024*1024)throw new Error('No pude leer el creativo privado.');
      if(!['image/jpeg','image/png','video/mp4','video/quicktime'].includes(download.data.type))throw new Error('Formato de creativo no compatible.');
      const signed=await db.storage.from('user-creatives').createSignedUrl(path,3600);if(signed.error)throw new Error('No pude preparar el video.');
      return {data:Buffer.from(await download.data.arrayBuffer()),mime:download.data.type,url:signed.data.signedUrl};
    };
    // Read every upload before the first provider write; reject missing/foreign media early.
    const loaded=new Map<string,Awaited<ReturnType<typeof loadMedia>>>();
    for(const asset of validation.brief.brief.assets)loaded.set(asset.uploadId,await loadMedia(asset.uploadId));
    const result=await executeDeployment(validation.brief,token,ledger,save,async p=>loaded.get(p)!,validation.interests);
    res.json({...result,warnings:validation.warnings,jobId:id});
  }catch(error){res.json({success:false,error:(error as Error).message,jobId:id});}
  finally{if(claimed)await db.from('tico_brief_deployments').update({running:false}).eq('id',id);}
});
briefRouter.post('/rollback',async(req,res)=>{
  const db=res.locals.supabase;const owner=res.locals.authUser.id;const id=req.body.jobId;let claimed=false;
  try{const {data:job,error}=await db.from('tico_brief_deployments').select('*').eq('id',id).single();if(error||!job)throw new Error('No hay un despliegue guardado para eliminar.');
    if(!verifyLedger(job.ledger,job.signature,owner,id,job.brief_hash))throw new Error('Registro de despliegue inválido.');
    const claim=await db.rpc('claim_tico_deployment',{p_id:id});if(claim.error||!claim.data)throw new Error('Espera a que termine el despliegue.');claimed=true;
    const ledger=job.ledger as DeploymentLedger;const token=await connectionToken(db,ledger.connectionId!);
    const save=async()=>{const result=await db.from('tico_brief_deployments').update({ledger,signature:signLedger(ledger,owner,id,job.brief_hash)}).eq('id',id);if(result.error)throw new Error('No pude guardar el avance de la eliminación.');};
    await rollbackDeployment(ledger.accountId!,token,ledger,save);res.json({success:true,message:'Eliminé lo creado por este despliegue.'});
  }catch(error){res.status(400).json({error:(error as Error).message});}finally{if(claimed)await db.from('tico_brief_deployments').update({running:false}).eq('id',id);}
});
