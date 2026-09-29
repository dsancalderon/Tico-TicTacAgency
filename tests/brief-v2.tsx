// Development-only visual fixture. Not imported by the production application.
import { createRoot } from 'react-dom/client';
import { useState } from 'react';
import { TicoBriefForm } from '../src/components/MetaAdBuilder/TicoBriefForm';
import { emptyBrief } from '../server/src/domain/ticoBrief';
import { toLegacyPayload } from '../src/services/ticoBriefAdapter';
import { generateMetaBuilderStrategyApi } from '../src/services/api';
import { StrategyPreview } from '../src/components/StrategyPreview';
import type { GeneratedCampaignStrategy } from '../src/types';
import '../src/index.css';
const b=emptyBrief();b.metaConnectionId='fixture';b.brief.businessSource.url='https://example.com';b.brief.dailyBudget=30;b.brief.assets=[{uploadId:'fixture/image.jpg',type:'image',name:'Producto · ejemplo',angle:'Beneficio',aspectRatio:'9:16'}];
const profile={...b.brief.businessProfile,brandName:'Casa del Pan',industry:'Panadería artesanal',offerSummary:'pan artesanal recién horneado',targetAudience:'Personas que compran pan para su hogar',countries:['CO'],conversionChannels:['messenger'],confidence:{brandName:.95,offerSummary:.9,targetAudience:.9,countries:.9},fieldSources:{brandName:'social',offerSummary:'social',industry:'social',targetAudience:'social',countries:'social'}};
let analyzeCalls=0;
const services={loadPreferences:async()=>({data:null}),savePreferences:async()=>{},api:async(path:string)=>{
 if(path==='connections')return {connections:[{id:'fixture',name:'Casa del Pan · datos de prueba',connected_at:'2026-09-26'}]};
 if(path==='assets')return {valid:true,warnings:[],accounts:[{id:'act_123',name:'Casa del Pan',account_status:1,currency:'USD',timezone_name:'America/Bogota',min_daily_budget:100}],pages:[{id:'456',name:'Casa del Pan'}],pixels:[],campaigns:[{id:'789',name:'Campaña de ejemplo'}],adSets:[{id:'101',name:'Audiencia de ejemplo'}]};
 if(path==='analyze'){analyzeCalls++;return {businessProfile:profile,images:[],pixelIds:[]};}
 if(path==='options')return {options:[{id:'city_bogota',name:'Bogotá, Cundinamarca, Colombia'},{id:'city_medellin',name:'Medellín, Antioquia, Colombia'},{id:'lang_es',name:'Español'},{id:'aud_1',name:'Clientes compradores últimos 30 días'}]};
 return {};
}};
function Preview(){const [strategy,setStrategy]=useState<GeneratedCampaignStrategy|null>(null);return <main style={{maxWidth:1040,margin:'30px auto',padding:16}}><p style={{padding:12,fontSize:12}}>PRUEBA LOCAL · Datos ficticios · Sin llamadas a Meta ni Gemini · Llamadas a análisis: {analyzeCalls}</p>{strategy?<StrategyPreview strategy={strategy} onApprove={()=>{throw new Error('La prueba visual no se despliega.');}} onBack={()=>setStrategy(null)} isDeploying={false} onChange={setStrategy}/>:<TicoBriefForm services={services} initialData={toLegacyPayload(b)} metaState={{isConnected:true,status:'ready_to_deploy',userAccessToken:'EAAB_Demo',adAccountId:'act_123',connectedAt:'2026-09-26'} as any} isLoading={false} onSubmit={async payload=>{const result=await generateMetaBuilderStrategyApi(payload,true);setStrategy(result.strategy);}}/>}</main>;}
createRoot(document.getElementById('root')!).render(<Preview/>);
