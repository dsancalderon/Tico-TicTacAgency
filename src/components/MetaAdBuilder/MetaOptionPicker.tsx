import { useEffect, useState } from 'react';
import { briefApi } from '../../services/briefApi';
export interface MetaOption { id:string; name:string; }
export function MetaOptionPicker({label,kind,connectionId,accountId,pageId,onSelect,api=briefApi}: {label:string;kind:'city'|'region'|'locale'|'audience'|'leadForm';connectionId:string;accountId:string;pageId?:string;onSelect:(option:MetaOption)=>void;api?:typeof briefApi}) {
  const [query,setQuery]=useState('');const [options,setOptions]=useState<MetaOption[]>([]);const [error,setError]=useState('');
  useEffect(()=>{let active=true;const timer=setTimeout(()=>{if(query.length<2&&!['audience','leadForm'].includes(kind)){setOptions([]);return;}void api('options',{kind,query,connectionId,accountId,pageId}).then(r=>{if(active){setOptions(r.options||[]);setError('');}}).catch(e=>{if(active)setError(e.message);});},350);return()=>{active=false;clearTimeout(timer);};},[kind,query,connectionId,accountId,pageId,api]);
  return <div className="tb-field"><label>{label}<input value={query} placeholder="Busca por nombre" onChange={e=>setQuery(e.target.value)}/></label>{options.length>0&&<select aria-label={`Resultados: ${label}`} value="" onChange={e=>{const option=options.find(o=>o.id===e.target.value);if(option)onSelect(option);setQuery('');}}><option value="">Selecciona una opción</option>{options.map(o=><option key={o.id} value={o.id}>{o.name}</option>)}</select>}{error&&<small role="alert">{error}</small>}</div>;
}
