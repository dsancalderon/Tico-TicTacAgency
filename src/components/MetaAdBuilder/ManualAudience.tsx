import { useState } from 'react';
import type { AdSetConfig, TicoBrief } from '../../../server/src/domain/ticoBrief';
import { MetaOptionPicker, type MetaOption } from './MetaOptionPicker';
import type { briefApi } from '../../services/briefApi';
export function ManualAudience({set,brief,onChange,api}: {set:AdSetConfig;brief:TicoBrief;onChange:(set:AdSetConfig)=>void;api:typeof briefApi}) {
 const [names,setNames]=useState<Record<string,string>>({});
 const common={connectionId:brief.metaConnectionId,accountId:brief.meta.adAccountId,pageId:brief.meta.pageId,api};
 function remember(option:MetaOption){setNames(n=>({...n,[option.id]:option.name}));}
 return <div className="tb-grid">
  <MetaOptionPicker {...common} label="Añadir ciudad" kind="city" onSelect={o=>{remember(o);if(!set.cities.some(c=>c.key===o.id))onChange({...set,cities:[...set.cities,{key:o.id,radius:15,distance_unit:'mile'}]});}}/>
  <MetaOptionPicker {...common} label="Añadir región" kind="region" onSelect={o=>{remember(o);if(!set.regions.some(c=>c.key===o.id))onChange({...set,regions:[...set.regions,{key:o.id}]});}}/>
  {set.cities.map((city,i)=><label className="tb-field" key={city.key}>{names[city.key]||`Ciudad ${i+1}`} · radio en millas<input type="number" min="1" value={city.radius} onChange={e=>onChange({...set,cities:set.cities.map(c=>c.key===city.key?{...c,radius:Number(e.target.value)}:c)})}/><button type="button" onClick={()=>onChange({...set,cities:set.cities.filter(c=>c.key!==city.key)})}>Quitar ciudad</button></label>)}
  {set.regions.map((r,i)=><button type="button" key={r.key} onClick={()=>onChange({...set,regions:set.regions.filter(c=>c.key!==r.key)})}>Quitar {names[r.key]||`región ${i+1}`}</button>)}
  <MetaOptionPicker {...common} label="Idioma" kind="locale" onSelect={o=>{remember(o);if(!set.locales.includes(Number(o.id)))onChange({...set,locales:[...set.locales,Number(o.id)]});}}/>
  <MetaOptionPicker {...common} label="Audiencia personalizada" kind="audience" onSelect={o=>{remember(o);if(!set.customAudiences.includes(o.id))onChange({...set,customAudiences:[...set.customAudiences,o.id]});}}/>
  <MetaOptionPicker {...common} label="Excluir audiencia" kind="audience" onSelect={o=>{remember(o);if(!set.excludedAudiences.includes(o.id))onChange({...set,excludedAudiences:[...set.excludedAudiences,o.id]});}}/>
  {(['locales','customAudiences','excludedAudiences'] as const).map(field=><div key={field}>{set[field].map((id,i)=><button type="button" key={id} className="tb-reset" onClick={()=>onChange({...set,[field]:set[field].filter(x=>x!==id)})}>Quitar {names[String(id)]||`${field==='locales'?'idioma':'audiencia'} ${i+1}`} · </button>)}</div>)}
 </div>;
}
