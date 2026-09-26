import { briefApi } from './briefApi';
let sourceStartedAt = 0;
export function trackBrief(event:'source_started'|'preview_reached'|'preview_field_edited'|'delegation_changed'|'deployment_first_success',details:{section?:string;mode?:'tico'|'user';field?:string;elapsedMs?:number}={}) {
  // Only enumerated metadata: never business text, tokens, URLs, files or voice.
  if(event==='source_started')sourceStartedAt=performance.now();
  if(event==='preview_reached'&&sourceStartedAt)details={...details,elapsedMs:Math.round(performance.now()-sourceStartedAt)};
  void briefApi('events',{event,...details}).catch(()=>{});
}
