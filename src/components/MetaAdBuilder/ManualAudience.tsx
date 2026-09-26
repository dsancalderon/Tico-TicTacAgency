import { useState } from 'react';
import type { AdSetConfig, TicoBrief } from '../../../server/src/domain/ticoBrief';
import { MetaOptionPicker, type MetaOption } from './MetaOptionPicker';
import { briefApi } from '../../services/briefApi';
export function ManualAudience({set,brief,onChange,api=briefApi}: {set:AdSetConfig;brief:TicoBrief;onChange:(set:AdSetConfig)=>void;api?:typeof briefApi}) {
 const [names,setNames]=useState<Record<string,string>>({});
 const common={connectionId:brief.metaConnectionId,accountId:brief.meta.adAccountId,pageId:brief.meta.pageId,api};
 function remember(option:MetaOption){setNames(n=>({...n,[option.id]:option.name}));}
 return <div className="tb-grid">
  <MetaOptionPicker {...common} label="Añadir ciudad" kind="city" onSelect={o=>{remember(o);if(!set.cities.some(c=>c.key===o.id))onChange({...set,cities:[...set.cities,{key:o.id,radius:15,distance_unit:'mile'}]});}}/>
  <MetaOptionPicker {...common} label="Añadir región" kind="region" onSelect={o=>{remember(o);if(!set.regions.some(c=>c.key===o.id))onChange({...set,regions:[...set.regions,{key:o.id}]});}}/>
  {set.cities.map((city,i)=><div className="tb-field" key={city.key}><label><span>{names[city.key]||`Ciudad ${i+1} (${city.key})`} · radio en millas</span><input type="number" min="1" max="50" value={city.radius} onChange={e=>onChange({...set,cities:set.cities.map(c=>c.key===city.key?{...c,radius:Number(e.target.value)}:c)})}/></label><button type="button" className="tb-reset" onClick={()=>onChange({...set,cities:set.cities.filter(c=>c.key!==city.key)})}>Quitar ciudad</button></div>)}
  {set.regions.map((r,i)=><div key={r.key} className="tb-field"><span>{names[r.key]||`Región ${i+1} (${r.key})`}</span><button type="button" className="tb-reset" onClick={()=>onChange({...set,regions:set.regions.filter(c=>c.key!==r.key)})}>Quitar región</button></div>)}
  <MetaOptionPicker {...common} label="Idioma" kind="locale" onSelect={o=>{remember(o);if(!set.locales.includes(Number(o.id)))onChange({...set,locales:[...set.locales,Number(o.id)]});}}/>
  <MetaOptionPicker {...common} label="Audiencia personalizada" kind="audience" onSelect={o=>{remember(o);if(!set.customAudiences.includes(o.id))onChange({...set,customAudiences:[...set.customAudiences,o.id]});}}/>
  <MetaOptionPicker {...common} label="Excluir audiencia" kind="audience" onSelect={o=>{remember(o);if(!set.excludedAudiences.includes(o.id))onChange({...set,excludedAudiences:[...set.excludedAudiences,o.id]});}}/>
  {(['locales','customAudiences','excludedAudiences'] as const).map(field=><div key={field}>{set[field].map((id,i)=><button type="button" key={id} className="tb-reset" onClick={()=>onChange({...set,[field]:set[field].filter(x=>x!==id)})}>Quitar {names[String(id)]||`${field==='locales'?'idioma':'audiencia'} ${i+1} (${id})`} · </button>)}</div>)}
 </div>;
}
