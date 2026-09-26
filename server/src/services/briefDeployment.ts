import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import { mapGoal, inheritedGoal, specialAudience, toMinorUnits, validateBrief, type TicoBrief } from '../domain/ticoBrief.js';
import { graph, graphList, inspectConnection, MetaError } from './briefMeta.js';
import { readPublicUrl } from './businessSource.js';

export async function resolveInterests(token:string,names:string[]) {
  const found:{id:string;name:string}[]=[];
  for(const name of [...new Set(names)].filter(Boolean).slice(0,20)){
    const result=await graph(token,'search',{type:'adinterest',q:name,limit:10});
    const exact=result.data?.find((i:any)=>typeof i.id==='string'&&i.name?.toLocaleLowerCase()===name.toLocaleLowerCase());
    if(exact)found.push({id:exact.id,name:exact.name});
  }
  return found;
}
export async function validateDeployment(input:TicoBrief,token:string) {
  const b=structuredClone(input);const errors=validateBrief(b);const warnings:string[]=[];
  const interests:Record<string,{id:string;name:string}[]>={};
  if(errors.length)return {valid:false,errors,warnings,brief:b,interests};
  try {
    const connection=await inspectConnection(token);
    if(!connection.valid)return {valid:false,errors:connection.warnings,warnings,brief:b,interests};
    warnings.push(...connection.warnings);
    const account=connection.accounts.find((a:any)=>a.id===b.meta.adAccountId);
    if(!account||account.account_status!==1)errors.push('Tu cuenta publicitaria está inactiva o no pertenece a esta conexión.');
    if(!connection.pages.some((p:any)=>p.id===b.meta.pageId))errors.push('Selecciona una página donde puedas anunciar.');
    if(errors.length)return {valid:false,errors,warnings,brief:b,interests};
    b.meta.currency=account.currency;b.meta.timezone=account.timezone_name;
    if(b.creationMode==='single_ad'){
      const campaign=await graph(token,b.existingCampaignId!,{fields:'id,account_id,objective'});
      const set=await graph(token,b.existingAdSetId!,{fields:'id,account_id,campaign_id,optimization_goal,destination_type,promoted_object'});
      if(`act_${campaign.account_id}`!==b.meta.adAccountId||`act_${set.account_id}`!==b.meta.adAccountId||set.campaign_id!==b.existingCampaignId)errors.push('El conjunto debe pertenecer a la campaña y cuenta elegidas.');
      b.meta.objective=campaign.objective;b.meta.optimizationGoal=set.optimization_goal;b.meta.destinationType=set.destination_type;
      b.brief.goal=inheritedGoal(campaign.objective,set.destination_type||'');
      b.meta.pixelId=set.promoted_object?.pixel_id;
      b.meta.conversionEvent=set.promoted_object?.custom_event_type;
      if(b.brief.goal==='messages')b.brief.messageChannels=(['instagram_direct','messenger','whatsapp'] as const).filter(c=>(set.destination_type||'').includes(c.toUpperCase()));
      if(set.promoted_object?.page_id&&set.promoted_object.page_id!==b.meta.pageId)errors.push('Usa la página del conjunto existente.');
    }
    const minimum=Number(account.min_daily_budget);
    if(!Number.isFinite(minimum)||minimum<=0)errors.push('Meta no informó el presupuesto mínimo. Revisa tu cuenta antes de desplegar.');
    const budget=toMinorUnits(b.brief.dailyBudget,account.currency);
    const periodDays=b.meta.budgetPeriod==='lifetime'?Math.max(1,Math.ceil((Date.parse(b.brief.endDate||'')-Date.parse(b.meta.startDate||new Date().toISOString()))/86400000)):1;
    if(!Number.isFinite(periodDays))errors.push('Revisa las fechas del presupuesto.');
    if(b.creationMode==='full_campaign'){
      const perSet=b.meta.budgetType==='CBO'?budget/Math.max(1,b.meta.adSets.length)/periodDays:Math.min(...b.meta.adSets.map(s=>toMinorUnits(s.budgetAmount,account.currency)/periodDays));
      if(perSet<minimum)errors.push(`Tu presupuesto por conjunto no alcanza el mínimo de Meta (${minimum} unidades mínimas al día). Aumenta el monto o reduce conjuntos.`);
      if(b.meta.budgetType==='ABO'&&Math.abs(b.meta.adSets.reduce((sum,s)=>sum+toMinorUnits(s.budgetAmount,account.currency),0)-budget)>b.meta.adSets.length)errors.push('El reparto por conjunto debe sumar tu presupuesto.');
    }
    const pixels=await graphList(token,`${b.meta.adAccountId}/adspixels`,{fields:'id,name,last_fired_time'});
    const pixel=pixels.find(p=>p.id===b.meta.pixelId);
    if(b.meta.pixelId&&!pixel)errors.push('El píxel elegido no está asociado a tu cuenta.');
    if(b.brief.goal==='sell_online'&&!pixel)errors.push('Para optimizar ventas necesito tu píxel activo. Mientras tanto, te recomiendo empezar con Visitas a tu web.');
    if(pixel&&(!pixel.last_fired_time||Date.parse(pixel.last_fired_time)<Date.now()-7*86400000))warnings.push('Tu píxel no registra eventos en los últimos 7 días.');
    if(b.meta.optimizationGoal==='OFFSITE_CONVERSIONS'&&b.meta.destinationType==='WEBSITE'&&!pixel)errors.push('Ventas y contactos web requieren un píxel de tu cuenta.');
    const expected=mapGoal(b.brief.goal,!!pixel,b.brief.messageChannels);
    if(b.creationMode==='full_campaign'&&['objective','destinationType','optimizationGoal'].some(k=>(b.meta as any)[k] !== (expected as any)[k]))errors.push('La combinación de objetivo, destino y optimización no está validada para este flujo. Restablece la recomendación.');
    if(b.brief.goal==='calls')errors.push('TODO v21: PHONE_CALL no está verificado. Elige otro objetivo mientras se valida.');
    if(b.brief.goal==='messages'&&!b.brief.messageChannels.length)errors.push('Elige al menos un canal de mensajes.');
    const page=await graph(token,b.meta.pageId,{fields:'id,instagram_business_account'});
    b.meta.instagramUserId=page.instagram_business_account?.id;
    if((b.brief.goal==='ig_profile'||b.brief.messageChannels.includes('instagram_direct')&&b.brief.goal==='messages')&&!b.meta.instagramUserId)errors.push('Vincula Instagram a tu página para usar este destino.');
    if(b.brief.goal==='messages'&&b.brief.messageChannels.includes('whatsapp')){
      // TODO: verify version-specific WhatsApp linked-number field and creative CTA value.
      errors.push('WhatsApp: falta verificar el número vinculado y su configuración en Graph v21. Puedes usar Messenger mientras tanto.');
    }
    if(b.brief.goal==='messages'&&b.brief.messageChannels.length>1)errors.push('TODO v21: falta validar el creative multicanal. Usa un canal por ahora.');
    if(b.brief.goal==='leads'&&b.meta.destinationType==='ON_AD'){
      const forms=await graphList(token,`${b.meta.pageId}/leadgen_forms`,{fields:'id,name,status'});
      if(!forms.some(f=>f.id===b.meta.leadFormId&&f.status==='ACTIVE'))errors.push('Selecciona un formulario instantáneo activo.');
    }
    if(b.meta.specialAdCategories.some(c=>!['EMPLOYMENT','HOUSING','FINANCIAL_PRODUCTS_SERVICES','ISSUES_ELECTIONS_POLITICS'].includes(c)))errors.push('Categoría especial no compatible.');
    if(b.meta.specialAdCategories.length){b.meta.adSets=b.meta.adSets.map(specialAudience);b.meta.specialAdCategoryCountry=b.brief.countries;warnings.push(`Tu negocio es de ${b.meta.specialAdCategories.join(', ')}, así que Meta exige segmentación amplia. Ya lo ajusté por ti.`);}
    if(!['CBO','ABO'].includes(b.meta.budgetType)||!['daily','lifetime'].includes(b.meta.budgetPeriod))errors.push('Tipo de presupuesto inválido.');
    if(!['LOWEST_COST_WITHOUT_CAP','LOWEST_COST_WITH_BID_CAP','COST_CAP','LOWEST_COST_WITH_MIN_ROAS'].includes(b.meta.bidStrategy))errors.push('Estrategia de puja inválida.');
    if(['LOWEST_COST_WITH_BID_CAP','COST_CAP'].includes(b.meta.bidStrategy)&&!(b.meta.bidAmount!>0))errors.push('Indica el monto de puja.');
    if(b.meta.bidStrategy==='LOWEST_COST_WITH_MIN_ROAS')errors.push('TODO v21: falta validar la combinación VALUE y bid_constraints para ROAS mínimo.');
    for(const set of b.meta.adSets){
      interests[set.id]=await resolveInterests(token,set.interests);
      if(interests[set.id].length<set.interests.filter(Boolean).length)warnings.push(`Descarté intereses no encontrados en Meta para ${set.name}.`);
      if(b.delegation.placements==='user'&&!set.publisherPlatforms.length)errors.push(`Selecciona ubicaciones para ${set.name}.`);
      if(set.publisherPlatforms.some(p=>!['facebook','instagram','messenger','audience_network'].includes(p)))errors.push('Ubicación inválida.');
      if(set.customAudiences.length||set.excludedAudiences.length){const allowed=await graphList(token,`${b.meta.adAccountId}/customaudiences`,{fields:'id'});if([...set.customAudiences,...set.excludedAudiences].some(id=>!allowed.some(a=>a.id===id)))errors.push('Una audiencia personalizada no pertenece a tu cuenta.');}
      const allowedPositions:Record<string,string[]>={facebook:['feed','story','facebook_reels'],instagram:['stream','story','reels'],messenger:['messenger_home'],audience_network:['classic']};
      for(const [platform,positions]of Object.entries(set.positions))if(!Array.isArray(positions)||positions.some(p=>!allowedPositions[platform]?.includes(p)))errors.push('Una posición manual no es compatible.');
    }
    for(const ad of b.meta.ads){if(!ad.headline?.trim()||!ad.primaryText?.trim())errors.push(`Completa el titular y texto de ${ad.name}.`);if(!b.brief.assets.some(a=>a.uploadId===ad.uploadId))errors.push(`Asigna un creativo a ${ad.name}.`);if(b.creationMode==='full_campaign'&&!b.meta.adSets.some(s=>s.id===ad.adSetId))errors.push('Hay un anuncio sin conjunto válido.');}
    if(b.meta.destinationType==='WEBSITE'&&!b.meta.destinationUrl)errors.push('Indica el enlace de destino.');
    if(b.meta.destinationUrl){try{await readPublicUrl(b.meta.destinationUrl,2_000_000);}catch{warnings.push('No pude confirmar que tu URL sea HTTPS y responda 200. Revísala antes de activar.');}}
  }catch(error){errors.push((error as Error).message);}
  return {valid:errors.length===0,errors,warnings,brief:b,interests};
}
export type LedgerItem={key:string;id:string;kind:'image'|'video'|'campaign'|'adset'|'creative'|'ad';deleted?:boolean};
export type DeploymentLedger={items:LedgerItem[];pending?:string;completed?:boolean;rolledBack?:boolean;accountId?:string;connectionId?:string;attempts?:number};
// JSONB normalizes key order. Sign canonical values so a DB round trip stays valid.
export function canonicalJson(value:unknown):string {
  if(Array.isArray(value))return `[${value.map(canonicalJson).join(',')}]`;
  if(value&&typeof value==='object')return `{${Object.keys(value).sort().filter(k=>(value as any)[k]!==undefined).map(k=>`${JSON.stringify(k)}:${canonicalJson((value as any)[k])}`).join(',')}}`;
  return JSON.stringify(value);
}
export function signLedger(ledger:DeploymentLedger,owner:string,job:string,hash:string) {
  const secret=process.env.TICO_DEPLOYMENT_SECRET;
  if(!secret||secret.length<32)throw new Error('Configura TICO_DEPLOYMENT_SECRET (al menos 32 caracteres) para guardar despliegues recuperables.');
  return createHmac('sha256',secret).update(canonicalJson({owner,job,hash,ledger})).digest('hex');
}
export function verifyLedger(ledger:DeploymentLedger,signature:string,owner:string,job:string,hash:string){const expected=signLedger(ledger,owner,job,hash);return typeof signature==='string'&&signature.length===expected.length&&timingSafeEqual(Buffer.from(signature),Buffer.from(expected));}
export function briefHash(b:TicoBrief){return createHash('sha256').update(canonicalJson(b)).digest('hex');}
export function buildCampaign(b:TicoBrief){return {name:b.meta.namingTemplate.replace('{marca}',b.brief.businessProfile.brandName).replace('{objetivo}',b.brief.goal).replace('{país}',b.brief.countries.join('-')).replace('{AAAAMMDD}',new Date().toISOString().slice(0,10).replaceAll('-','')),objective:b.meta.objective,status:'PAUSED',special_ad_categories:b.meta.specialAdCategories,...(b.meta.specialAdCategories.length?{special_ad_category_country:b.meta.specialAdCategoryCountry}:{}),...(b.meta.budgetType==='CBO'?{[b.meta.budgetPeriod==='daily'?'daily_budget':'lifetime_budget']:toMinorUnits(b.brief.dailyBudget,b.meta.currency),bid_strategy:b.meta.bidStrategy}: {})};}
export function buildAdSet(b:TicoBrief,index:number,campaignId:string,interests:{id:string;name:string}[]){const s=b.meta.adSets[index];const promoted:any={};if(b.meta.optimizationGoal==='OFFSITE_CONVERSIONS'){promoted.pixel_id=b.meta.pixelId;promoted.custom_event_type=b.meta.conversionEvent||mapGoal(b.brief.goal,true).conversionEvent;}else if(['CONVERSATIONS','LEAD_GENERATION'].includes(b.meta.optimizationGoal))promoted.page_id=b.meta.pageId;
  const targeting:any={geo_locations:{...(!s.cities.length&&!s.regions.length?{countries:b.brief.countries}:{}),...(s.cities.length?{cities:s.cities.map(c=>({key:c.key,radius:c.radius,distance_unit:'mile'}))}:{}),...(s.regions.length?{regions:s.regions.map(r=>({key:r.key}))}:{})},age_min:s.ageMin,age_max:s.ageMax};
  if(b.delegation.audience==='tico')targeting.targeting_automation={advantage_audience:1};
  if(s.gender!=='all')targeting.genders=s.gender==='men'?[1]:[2];
  if(interests.length)targeting.flexible_spec=[{interests}];if(s.locales.length)targeting.locales=s.locales;
  if(s.customAudiences.length)targeting.custom_audiences=s.customAudiences.map(id=>({id}));if(s.excludedAudiences.length)targeting.excluded_custom_audiences=s.excludedAudiences.map(id=>({id}));
  if(b.delegation.placements==='user'){targeting.publisher_platforms=s.publisherPlatforms;for(const [platform,positions]of Object.entries(s.positions))if(s.publisherPlatforms.includes(platform)&&positions.length)targeting[`${platform}_positions`]=positions;}
  return {name:s.name,campaign_id:campaignId,status:'PAUSED',optimization_goal:b.meta.optimizationGoal,billing_event:'IMPRESSIONS',...(b.meta.destinationType?{destination_type:b.meta.destinationType}:{}),targeting,...(Object.keys(promoted).length?{promoted_object:promoted}:{}),...(b.meta.budgetType==='ABO'?{[b.meta.budgetPeriod==='daily'?'daily_budget':'lifetime_budget']:toMinorUnits(s.budgetAmount,b.meta.currency),bid_strategy:b.meta.bidStrategy}:{}),...(b.meta.bidAmount?{bid_amount:toMinorUnits(b.meta.bidAmount,b.meta.currency)}:{}),...(b.meta.startDate?{start_time:b.meta.startDate}:{}),...(b.brief.endDate?{end_time:b.brief.endDate}: {})};
}
export async function executeDeployment(b:TicoBrief,token:string,ledger:DeploymentLedger,save:()=>Promise<void>,loadMedia:(path:string)=>Promise<{data:Buffer;mime:string;url:string}>,interests:Record<string,{id:string;name:string}[]>) {
  if(ledger.rolledBack)throw new Error('Este despliegue ya fue eliminado. Crea un nuevo borrador.');
  if(ledger.pending)throw new Error('Hay una respuesta de Meta sin confirmar. Revisa lo creado antes de reintentar para evitar duplicados.');
  async function create(key:string,kind:LedgerItem['kind'],path:string,body:Record<string,unknown>){const existing=ledger.items.find(i=>i.key===key&&!i.deleted);if(existing)return existing.id;
    ledger.pending=key;await save();
    try{const result=await graph(token,path,body,'POST');const id=kind==='image'?(Object.values(result.images||{})[0] as any)?.hash:result.id;if(!id)throw new Error('Meta no devolvió el identificador creado.');ledger.items.push({key,kind,id});delete ledger.pending;await save();return id;}
    catch(error){if(error instanceof MetaError){delete ledger.pending;await save();}throw error;}
  }
  const media=new Map<string,{id:string;type:string;thumbnail?:string}>();
  for(const asset of b.brief.assets){const data=await loadMedia(asset.uploadId);const kind=asset.type;const id=await create(`media:${asset.uploadId}`,kind,`${b.meta.adAccountId}/${kind==='image'?'adimages':'advideos'}`,kind==='image'?{bytes:data.data.toString('base64')}:{file_url:data.url});
    let thumbnail:string|undefined;
    if(kind==='video'){let ready=false;for(let attempt=0;attempt<12;attempt++){const status=await graph(token,id,{fields:'status,picture'});if(status.status?.video_status==='ready'){ready=true;thumbnail=status.picture;break;}if(status.status?.video_status==='error')throw new Error('Meta no pudo procesar el video.');await new Promise(r=>setTimeout(r,2000));}if(!ready)throw new Error('Tu video sigue procesándose. Reintenta para continuar.');}
    media.set(asset.uploadId,{id,type:kind,thumbnail});
  }
  const campaignId=b.creationMode==='single_ad'?b.existingCampaignId!:await create('campaign','campaign',`${b.meta.adAccountId}/campaigns`,buildCampaign(b));
  const sets=new Map<string,string>();
  for(let i=0;i<b.meta.adSets.length&&b.creationMode==='full_campaign';i++){const set=b.meta.adSets[i];sets.set(set.id,await create(`set:${set.id}`,'adset',`${b.meta.adAccountId}/adsets`,buildAdSet(b,i,campaignId,interests[set.id]||[])));}
  for(const ad of b.meta.ads){const asset=media.get(ad.uploadId!)!;let link=b.meta.destinationUrl;
    if(b.meta.destinationType==='MESSENGER')link=`https://m.me/${b.meta.pageId}`;
    if(b.meta.destinationType==='INSTAGRAM_DIRECT'||b.meta.destinationType==='INSTAGRAM_PROFILE'){const ig=await graph(token,b.meta.instagramUserId!,{fields:'username'});link=`https://www.instagram.com/${encodeURIComponent(ig.username)}/`;}
    if(!link)link=`https://www.facebook.com/${b.meta.pageId}`;
    const callToAction=ad.callToAction?{type:ad.callToAction,value:b.meta.leadFormId?{lead_gen_form_id:b.meta.leadFormId}:{link}}:undefined;
    const story=asset.type==='image'?{link_data:{image_hash:asset.id,message:ad.primaryText,name:ad.headline,description:ad.description,link,...(callToAction?{call_to_action:callToAction}:{})}}:{video_data:{video_id:asset.id,image_url:asset.thumbnail,message:ad.primaryText,title:ad.headline,link_description:ad.description,...(callToAction?{call_to_action:callToAction}:{})}};
    const creative=await create(`creative:${ad.id}`,'creative',`${b.meta.adAccountId}/adcreatives`,{name:ad.name,object_story_spec:{page_id:b.meta.pageId,...story},...(b.meta.instagramUserId?{instagram_user_id:b.meta.instagramUserId}:{}),url_tags:b.meta.urlTags});
    await create(`ad:${ad.id}`,'ad',`${b.meta.adAccountId}/ads`,{name:ad.name,adset_id:b.creationMode==='single_ad'?b.existingAdSetId:sets.get(ad.adSetId),creative:{creative_id:creative},status:'PAUSED'});
  }
  ledger.completed=true;await save();return {success:true,mode:'live_api',status:'PAUSED',campaignId,adSets:ledger.items.filter(i=>i.kind==='adset').map(i=>({metaId:i.id})),ads:ledger.items.filter(i=>i.kind==='ad').map(i=>({metaId:i.id})),adsManagerUrl:`https://adsmanager.facebook.com/adsmanager/manage/campaigns?act=${b.meta.adAccountId.replace('act_','')}`,message:'Listo. Tu campaña está en Meta en pausa. Revísala y actívala cuando quieras.'};
}
export async function rollbackDeployment(accountId:string,token:string,ledger:DeploymentLedger,save:()=>Promise<void>){if(ledger.pending)throw new Error('Hay una escritura sin confirmar. Revisa Meta antes de eliminar.');for(const item of [...ledger.items].reverse()){if(item.deleted)continue;await graph(token,item.kind==='image'?`${accountId}/adimages`:item.id,item.kind==='image'?{hash:item.id}:{},'DELETE');item.deleted=true;await save();}ledger.rolledBack=true;await save();}
