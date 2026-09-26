import { test } from 'node:test';
import assert from 'node:assert/strict';
import { emptyBrief, mapGoal, toMinorUnits, chooseBudgetType, specialAudience, validateBrief, type TicoBrief } from './domain/ticoBrief.js';
import { validateDeployment, resolveInterests, executeDeployment, rollbackDeployment, buildCampaign, buildAdSet, signLedger, verifyLedger, type DeploymentLedger } from './services/briefDeployment.js';
import { analyzeBusinessSource, extractHtml, publicAddress } from './services/businessSource.js';
import { generateBriefStrategy } from './services/briefStrategy.js';
import { deployMetaBuilder } from './services/metaAds.js';

const scopes=['ads_management','ads_read','pages_show_list','pages_read_engagement','business_management'];
function fixture():TicoBrief {
 const b=emptyBrief();b.metaConnectionId='connection';b.meta.adAccountId='act_123';b.meta.pageId='456';b.meta.currency='USD';b.meta.timezone='America/Bogota';b.brief.businessProfile.brandName='Panadería';b.brief.businessProfile.offerSummary='Pan fresco';b.brief.countries=['CO'];b.brief.dailyBudget=20;b.brief.goal='awareness';Object.assign(b.meta,mapGoal('awareness'));b.brief.assets=[{uploadId:'owner/image.jpg',type:'image'}];
 b.meta.adSets=[{id:'s1',name:'Audiencia',budgetAmount:20,countries:['CO'],ageMin:18,ageMax:65,gender:'all',interests:[],locales:[],cities:[],regions:[],customAudiences:[],excludedAudiences:[],publisherPlatforms:[],positions:{}}];
 b.meta.ads=[{id:'a1',adSetId:'s1',name:'Anuncio',angle:'Beneficio',headline:'Pan recién hecho',primaryText:'Conoce nuestros productos.',description:'Pan fresco',callToAction:'LEARN_MORE',uploadId:'owner/image.jpg'}];return b;
}
function response(value:unknown,status=200){return new Response(JSON.stringify(value),{status,headers:{'Content-Type':'application/json'}});}
function graphMock(options:{expired?:boolean;inactive?:boolean;failAdset?:boolean;lostAdset?:boolean}={}){
 const writes:{path:string;body:any;method:string}[]=[];let counter=0;
 const fetcher:typeof fetch=async(input,init)=>{
  const url=new URL(String(input));const path=url.pathname.replace('/v21.0/','');
  if(init?.method==='POST'||init?.method==='DELETE'){
   const body=JSON.parse(String(init.body));writes.push({path,body,method:init.method});
   if(options.lostAdset&&path.endsWith('/adsets'))throw new TypeError('network lost');
   if(options.failAdset&&path.endsWith('/adsets'))return response({error:{code:100,message:'Revisa la segmentación',fbtrace_id:'trace-fixture'}},400);
   if(init.method==='DELETE')return response({success:true});
   if(path.endsWith('/adimages'))return response({images:{file:{hash:'hash123'}}});
   return response({id:String(++counter)});
  }
  if(path==='debug_token')return response({data:{is_valid:!options.expired,scopes,expires_at:0}});
  if(path==='me/adaccounts')return response({data:[{id:'act_123',account_status:options.inactive?2:1,currency:'USD',timezone_name:'America/Bogota',min_daily_budget:100}]});
  if(path==='me/accounts')return response({data:[{id:'456',name:'Panadería',tasks:['ADVERTISE']}]});
  if(path==='act_123/adspixels')return response({data:[]});
  if(path==='456')return response({id:'456',name:'Panadería',description:'Pan fresco en Bogotá',category:'Bakery'});
  if(path==='456/posts')return response({data:[{message:'Pan fresco todos los días',full_picture:'https://example.com/pan.jpg'}]});
  if(path==='search')return response({data:url.searchParams.get('q')==='Pan'? [{id:'6001',name:'Pan'}]:[{id:'999',name:'Otro interés'}]});
  if(path==='camp_1')return response({id:'camp_1',account_id:'123',objective:'OUTCOME_LEADS'});
  if(path==='set_1')return response({id:'set_1',account_id:'123',campaign_id:'camp_1',optimization_goal:'LEAD_GENERATION',destination_type:'ON_AD',promoted_object:{page_id:'456'}});
  if(path==='456/leadgen_forms')return response({data:[{id:'form_1',name:'Formulario contacto',status:'ACTIVE'}]});
  throw new Error(`Unexpected request ${path}`);
 };return {fetcher,writes};
}
test('all goal cards map deterministically; message channel order and pixel variations',()=>{
 for(const goal of ['sell_online','messages','leads','calls','ig_profile','traffic','awareness','engagement'] as const)assert.ok(mapGoal(goal).objective.startsWith('OUTCOME_'));
 assert.equal(mapGoal('messages',false,['whatsapp','messenger']).destinationType,'MESSAGING_MESSENGER_WHATSAPP');
 assert.equal(mapGoal('leads',true).conversionEvent,'LEAD');assert.equal(mapGoal('leads',false).optimizationGoal,'LEAD_GENERATION');assert.equal(mapGoal('traffic',false).optimizationGoal,'LINK_CLICKS');
});
test('currency offsets reject unknowns and nonfinite amounts; CBO never invents money',()=>{
 assert.equal(toMinorUnits(12.34,'USD'),1234);assert.equal(toMinorUnits(12.34,'MXN'),1234);assert.equal(toMinorUnits(120,'JPY'),120);assert.throws(()=>toMinorUnits(20,'XXX'));assert.throws(()=>toMinorUnits(NaN,'USD'));
 assert.equal(chooseBudgetType(2,20,5),'CBO');assert.equal(chooseBudgetType(1,20,5),'ABO');assert.equal(chooseBudgetType(2,5,5),'ABO');
});
test('special categories broaden targeting and preserve input',()=>{const set=fixture().meta.adSets[0];set.ageMin=25;set.gender='women';set.interests=['Pan'];set.cities=[{key:'city',radius:1,distance_unit:'mile'}];const adjusted=specialAudience(set);assert.equal(adjusted.ageMin,18);assert.equal(adjusted.gender,'all');assert.equal(adjusted.cities[0].radius,15);assert.deepEqual(adjusted.interests,[]);assert.equal(set.ageMin,25);});
test('schema catches missing assets, invalid budget and single-ad parents',()=>{const b=fixture();assert.deepEqual(validateBrief(b),[]);b.creationMode='single_ad';b.brief.dailyBudget=0;b.brief.assets=[];assert.ok(validateBrief(b).length>=3);});
test('readers reject private IP ranges and extract metadata, pixel, internal links',()=>{for(const ip of ['127.0.0.1','10.2.3.4','169.254.169.254','172.16.0.1','192.168.1.1','::1','::ffff:127.0.0.1'])assert.equal(publicAddress(ip),false);assert.equal(publicAddress('93.184.216.34'),true);const data=extractHtml(`<title>Pan</title><meta name="description" content="Pan fresco"><script>fbq('init', '123');</script><a href="/menu">Menú</a><img src="/pan.jpg">`,'https://example.com');assert.deepEqual(data.pixelIds,['123']);assert.deepEqual(data.links,['https://example.com/menu']);assert.ok(!data.text.includes('fbq'));});
test('interest resolution sends only exact provider-returned IDs',async t=>{const mock=graphMock();t.mock.method(globalThis,'fetch',mock.fetcher);assert.deepEqual(await resolveInterests('token',['Pan','Inventado']),[{id:'6001',name:'Pan'}]);});
test('preflight blocks expired tokens, inactive accounts, low budgets and sales without pixel before any write',async t=>{
 for(const scenario of ['expired','inactive','low','pixel']){const mock=graphMock({expired:scenario==='expired',inactive:scenario==='inactive'});const replacement=t.mock.method(globalThis,'fetch',mock.fetcher);const b=fixture();if(scenario==='low'){b.brief.dailyBudget=.01;b.meta.adSets[0].budgetAmount=.01;}if(scenario==='pixel'){b.brief.goal='sell_online';Object.assign(b.meta,mapGoal('sell_online'));}const result=await validateDeployment(b,'token');assert.equal(result.valid,false,scenario);assert.ok(result.errors.length);assert.equal(mock.writes.length,0);replacement.mock.restore();}
});
test('CBO and ABO place budget and bid strategy only at their intended levels',()=>{const b=fixture();b.meta.budgetType='CBO';assert.equal(buildCampaign(b)['daily_budget' as keyof ReturnType<typeof buildCampaign>],2000);assert.equal(buildAdSet(b,0,'campaign',[])['daily_budget' as keyof ReturnType<typeof buildAdSet>],undefined);assert.equal(buildAdSet(b,0,'campaign',[]).bid_strategy,undefined);b.meta.budgetType='ABO';assert.equal(buildCampaign(b)['daily_budget' as keyof ReturnType<typeof buildCampaign>],undefined);assert.equal(buildAdSet(b,0,'campaign',[])['daily_budget' as keyof ReturnType<typeof buildAdSet>],2000);});
test('delegated deployment creates media first and all deliverable resources PAUSED; reentry creates no duplicate',async t=>{const mock=graphMock();t.mock.method(globalThis,'fetch',mock.fetcher);const b=fixture();const checked=await validateDeployment(b,'token');assert.equal(checked.valid,true,checked.errors.join(' '));const ledger:DeploymentLedger={items:[]};let saves=0;const save=async()=>{saves++;};const media=async()=>({data:Buffer.from('fixture-image'),mime:'image/jpeg',url:'https://example.com/signed'});const result=await executeDeployment(checked.brief,'token',ledger,save,media,checked.interests);assert.equal(result.success,true);assert.ok(mock.writes[0].path.endsWith('/adimages'));for(const w of mock.writes.filter(w=>/\/(campaigns|adsets|ads)$/.test(w.path)))assert.equal(w.body.status,'PAUSED');assert.ok(saves>=10);const count=mock.writes.length;await executeDeployment(checked.brief,'token',ledger,save,media,checked.interests);assert.equal(mock.writes.length,count);});
test('mid-deployment failure keeps IDs and rollback deletes in reverse order',async t=>{const mock=graphMock({failAdset:true});t.mock.method(globalThis,'fetch',mock.fetcher);const ledger:DeploymentLedger={items:[]};await assert.rejects(()=>executeDeployment(fixture(),'token',ledger,async()=>{},async()=>({data:Buffer.from('x'),mime:'image/jpeg',url:''}),{}),/segmentación/);assert.equal(ledger.pending,undefined);assert.deepEqual(ledger.items.map(i=>i.kind),['image','campaign']);await rollbackDeployment('act_123','token',ledger,async()=>{});assert.deepEqual(mock.writes.filter(w=>w.method==='DELETE').map(w=>w.path),['1','act_123/adimages']);assert.equal(ledger.rolledBack,true);});
test('lost write response remains uncertain and cannot be retried or rolled back automatically',async t=>{const mock=graphMock({lostAdset:true});t.mock.method(globalThis,'fetch',mock.fetcher);const ledger:DeploymentLedger={items:[]};const deploy=()=>executeDeployment(fixture(),'token',ledger,async()=>{},async()=>({data:Buffer.from('x'),mime:'image/jpeg',url:''}),{});await assert.rejects(deploy);assert.equal(ledger.pending,'set:s1');await assert.rejects(deploy,/sin confirmar/);await assert.rejects(()=>rollbackDeployment('act_123','token',ledger,async()=>{}),/sin confirmar/);});
test('journal signatures bind owner, job and every provider ID',()=>{process.env.TICO_DEPLOYMENT_SECRET='test-secret-32-characters-minimum-only';const ledger:DeploymentLedger={items:[{key:'ad',id:'123',kind:'ad'}]};const signature=signLedger(ledger,'owner','job','hash');assert.ok(verifyLedger(ledger,signature,'owner','job','hash'));assert.equal(verifyLedger(ledger,signature,'other','job','hash'),false);ledger.items[0].id='victim';assert.equal(verifyLedger(ledger,signature,'owner','job','hash'),false);});
test('social source without website produces a confidence-bearing profile and Messenger strategy; manual copies preserved',async t=>{
 process.env.GEMINI_API_KEY='test-key';const mock=graphMock();const profile={...fixture().brief.businessProfile,conversionChannels:['messenger'],countries:['CO'],confidence:{brandName:.9,offerSummary:.8,targetAudience:.2,countries:.9,industry:.9,specialAdCategories:.9}};
 t.mock.method(globalThis,'fetch',async(input: Parameters<typeof fetch>[0],init?: Parameters<typeof fetch>[1])=>{if(String(input).includes('generativelanguage'))return response({candidates:[{content:{parts:[{text:JSON.stringify(profile)}]}}]});return mock.fetcher(input,init);});
 const analyzed=await analyzeBusinessSource({type:'social'},{token:'token',pageId:'456',db:{},userId:'owner'});assert.equal(analyzed.businessProfile.fieldSources.brandName,'social');assert.equal(analyzed.businessProfile.confidence.targetAudience,.2);
 const b=fixture();b.brief.businessSource={type:'social'};b.brief.businessProfile=analyzed.businessProfile;b.brief.goal='messages';Object.assign(b.meta,mapGoal('messages'));b.meta.ads[0].callToAction='MESSAGE_PAGE';const checked=await validateDeployment(b,'token');assert.ok(checked.valid,checked.errors.join(' '));
 b.delegation.copys='user';b.delegation.audience='user';t.mock.method(globalThis,'fetch',async()=>response({candidates:[{content:{parts:[{text:JSON.stringify({strategySummary:'Observa conversaciones durante los primeros tres días.',ads:[{id:'a1',headlines:['Sobrescrito'],primaryTexts:['Sobrescrito']}],audiences:[]})}]}}]}));
 const result=await generateBriefStrategy({ticoBrief:b,ads:[{id:'a1',headline:'Pan recién hecho'}],adSets:[]});assert.equal(result.enrichedPayload.ticoBrief.meta.ads[0].headline,'Pan recién hecho');assert.equal(result.enrichedPayload.ads[0].headline,'Pan recién hecho');
});
test('v2 cannot bypass validation through legacy deployment',async()=>{const result=await deployMetaBuilder({ticoBrief:fixture()},'token','act_123');assert.equal(result.success,false);});
test('single_ad inherits existing campaign and adSet config and deploys ad directly in PAUSED',async t=>{
 const mock=graphMock();t.mock.method(globalThis,'fetch',mock.fetcher);
 const b=fixture();
 b.creationMode='single_ad';
 b.existingCampaignId='camp_1';
 b.existingAdSetId='set_1';
 b.meta.leadFormId='form_1';
 b.meta.adSets=[];
 b.meta.ads=[b.meta.ads[0]];
 const checked=await validateDeployment(b,'token');
 assert.equal(checked.valid,true,checked.errors.join(' '));
 assert.equal(checked.brief.meta.objective,'OUTCOME_LEADS');
 assert.equal(checked.brief.meta.optimizationGoal,'LEAD_GENERATION');
 assert.equal(checked.brief.meta.destinationType,'ON_AD');
 assert.equal(checked.brief.brief.goal,'leads');
 const ledger:DeploymentLedger={items:[]};
 const save=async()=>{};
 const media=async()=>({data:Buffer.from('img'),mime:'image/jpeg',url:''});
 const result=await executeDeployment(checked.brief,'token',ledger,save,media,checked.interests);
 assert.equal(result.success,true);
 assert.equal(result.campaignId,'camp_1');
 assert.equal(mock.writes.some(w=>w.path.endsWith('/campaigns')),false);
 assert.equal(mock.writes.some(w=>w.path.endsWith('/adsets')),false);
 const adWrite=mock.writes.find(w=>w.path.endsWith('/ads'));
 assert.ok(adWrite);
 assert.equal(adWrite.body.adset_id,'set_1');
 assert.equal(adWrite.body.status,'PAUSED');
});
