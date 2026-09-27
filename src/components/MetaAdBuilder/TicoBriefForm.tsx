import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ArrowLeft, ArrowRight, Check, Sparkles } from 'lucide-react';
import { emptyBrief, sections, goalLabels, mapGoal, inheritedGoal, currencyOffset, validateBrief, type SectionKey, type TicoBrief, type BusinessSource, type Goal } from '../../../server/src/domain/ticoBrief';
import type { MetaBuilderPayload, MetaConnectionState } from '../../types';
import { requireSupabase } from '../../services/auth';
import { briefApi, saveBriefPreferences, rememberBriefConnectionToken } from '../../services/briefApi';
import { toLegacyPayload } from '../../services/ticoBriefAdapter';
import { VoiceRecorder } from './VoiceRecorder';
import { trackBrief } from '../../services/briefAnalytics';
import { ManualAudience } from './ManualAudience';
import { MetaOptionPicker } from './MetaOptionPicker';
import { ManualPlacements } from './ManualPlacements';
import { resolveBrief, recommendedSet } from './briefRecommendations';
import './tico-brief.css';

const labels: Record<SectionKey,string> = { assets:'Tus activos de Meta',business:'Cómo conozco tu negocio',objective:'¿Qué quieres que pase?',budget:'Cómo distribuir tu presupuesto',bid:'Puja',specialCategory:'Categoría especial',audience:'A quién llegar',placements:'Dónde aparecer',structure:'Estructura de la campaña',creatives:'Ángulos de tus creativos',copys:'Qué dirán tus anuncios',tracking:'Seguimiento' };
const sourceLabels: Record<BusinessSource['type'], string> = { website:'Mi web',social:'Mis redes',meta_catalog:'Catálogo de Meta',other_link:'Otro enlace',files:'Catálogo o documento',interview:'Responder 5 preguntas',voice:'Grabar mi voz' };
const originLabels = { web:'De tu web',social:'De tus redes',user:'Lo dijiste tú',tico:'Sugerencia de Tico' };

export interface TicoBriefFormProps {
  initialData?: MetaBuilderPayload | null;
  onSubmit: (payload: MetaBuilderPayload) => void;
  onDraftChange?: (payload: MetaBuilderPayload) => void;
  isLoading: boolean;
  onClose?: () => void;
  onReconnect?: () => void;
  metaState?: MetaConnectionState;
  onUpdateMetaState?: (newState: MetaConnectionState) => void;
  services?: { api: typeof briefApi; loadPreferences: () => Promise<any>; savePreferences: (brief:TicoBrief) => Promise<void> };
}

function Field({label,children}: {label:string;children:ReactNode}) { return <label className="tb-field"><span>{label}</span>{children}</label>; }

function getAvailableConnections(metaState?: MetaConnectionState, serverConnections: any[] = []): any[] {
  const map = new Map<string, any>();

  // 1. Conexiones desde el servidor
  for (const c of serverConnections) {
    if (c && c.id) {
      map.set(c.id, {
        id: c.id,
        name: c.name || 'Conexión Meta',
        connected_at: c.connected_at || new Date().toISOString(),
        source: 'server',
      });
    }
  }

  // 2. Conexiones guardadas en localStorage (del apartado de conexiones)
  try {
    const raw = localStorage.getItem('tico_saved_meta_connections');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        for (const conn of parsed) {
          if (conn && (conn.id || conn.portfolioName || conn.adAccountId)) {
            const id = String(conn.id || conn.businessManagerId || conn.adAccountId || 'local-conn');
            const existing = map.get(id);
            map.set(id, {
              id,
              name: conn.portfolioName || conn.businessManagerName || conn.adAccountName || 'Portafolio Comercial Meta',
              connected_at: conn.connectedAt || existing?.connected_at || new Date().toISOString(),
              token: conn.token,
              adAccountId: conn.adAccountId,
              adAccountName: conn.adAccountName,
              businessManagerId: conn.businessManagerId,
              businessManagerName: conn.businessManagerName,
              pageId: conn.pageId,
              pageName: conn.pageName,
              pixelId: conn.pixelId,
              pixelName: conn.pixelName,
              availableAccounts: conn.availableAccounts,
              source: 'local'
            });
          }
        }
      }
    }
  } catch {}

  // 3. Conexiones guardadas en metaState
  if (metaState?.savedConnections && Array.isArray(metaState.savedConnections)) {
    for (const conn of metaState.savedConnections) {
      if (conn && (conn.id || conn.portfolioName || conn.adAccountId)) {
        const id = String(conn.id || conn.businessManagerId || conn.adAccountId || 'saved-conn');
        const existing = map.get(id);
        map.set(id, {
          id,
          name: conn.portfolioName || conn.businessManagerName || conn.adAccountName || 'Portafolio Comercial Meta',
          connected_at: conn.connectedAt || existing?.connected_at || new Date().toISOString(),
          token: conn.token || existing?.token,
          adAccountId: conn.adAccountId || existing?.adAccountId,
          adAccountName: conn.adAccountName || existing?.adAccountName,
          businessManagerId: conn.businessManagerId || existing?.businessManagerId,
          businessManagerName: conn.businessManagerName || existing?.businessManagerName,
          pageId: conn.pageId || existing?.pageId,
          pageName: conn.pageName || existing?.pageName,
          pixelId: conn.pixelId || existing?.pixelId,
          pixelName: conn.pixelName || existing?.pixelName,
          availableAccounts: conn.availableAccounts || existing?.availableAccounts,
          source: 'metaState'
        });
      }
    }
  }

  // 4. Si metaState está conectado o tiene cuenta activa, incluirlo
  if (metaState?.isConnected || metaState?.userAccessToken || metaState?.adAccountId || metaState?.businessManagerName) {
    const activeId = metaState.businessManagerId || metaState.adAccountId || 'active-meta-session';
    const existing = map.get(activeId);
    map.set(activeId, {
      id: activeId,
      name: metaState.businessManagerName || metaState.adAccountName || existing?.name || 'Portafolio Activo Meta',
      connected_at: existing?.connected_at || new Date().toISOString(),
      token: metaState.userAccessToken || existing?.token,
      adAccountId: metaState.adAccountId || existing?.adAccountId,
      adAccountName: metaState.adAccountName || existing?.adAccountName,
      businessManagerId: metaState.businessManagerId || existing?.businessManagerId,
      businessManagerName: metaState.businessManagerName || existing?.businessManagerName,
      pageId: metaState.pageId || existing?.pageId,
      pageName: metaState.pageName || existing?.pageName,
      pixelId: metaState.pixelId || existing?.pixelId,
      pixelName: metaState.pixelName || existing?.pixelName,
      availableAccounts: metaState.availableAccounts || existing?.availableAccounts,
      source: 'active'
    });
  }

  // Asignar el token de sesión activa a cualquier portafolio sin token propio
  if (metaState?.userAccessToken) {
    for (const c of map.values()) {
      if (!c.token) c.token = metaState.userAccessToken;
    }
  }

  return Array.from(map.values());
}

export function TicoBriefForm({ initialData, onSubmit, onDraftChange, isLoading, onClose, onReconnect, metaState, onUpdateMetaState, services }: TicoBriefFormProps) {
  const api=services?.api||briefApi;
  const [b,setB] = useState<TicoBrief>(() => initialData?.ticoBrief || emptyBrief());
  // A saved draft reopens on the step it reached; without a connection and page it starts over at step 0.
  const [step,setStep] = useState(() => {
    const saved = initialData?.ticoBrief;
    if (!saved?.metaConnectionId || !saved.meta.pageId) return 0;
    return Math.max(0, Math.min(3, Math.trunc(saved.formStep || 0)));
  });
  const [connections,setConnections] = useState<any[]>(() => getAvailableConnections(metaState));
  const [assets,setAssets] = useState<any>({ accounts:[],pages:[],pixels:[],campaigns:[],adSets:[],warnings:[] });
  const [busy,setBusy] = useState(false); const [assetBusy,setAssetBusy] = useState(false); const [error,setError] = useState('');
  const [images,setImages] = useState<string[]>([]); const [catalogs,setCatalogs] = useState<any[]>([]); const [notice,setNotice] = useState('');
  const [interview,setInterview] = useState<string[]>(['','','','','']);
  const draftCallback = useRef(onDraftChange); draftCallback.current = onDraftChange;
  const initialized = useRef(false); const lastAssets = useRef<any>(null);
  const lastAssetFetchRef = useRef<string>('');
  const brandAssets=useRef<Record<string,any>>({});
  const [preferencesReady,setPreferencesReady]=useState(false);
  const manualInitialized = useRef(new Set<SectionKey>(initialData?.ticoBrief?.configuredSections || []));
  const account = assets.accounts.find((a:any) => a.id === b.meta.adAccountId);
  let minimum = 0; try { minimum = Number(account?.min_daily_budget || 0) / currencyOffset(b.meta.currency); } catch { /* select account first */ }
  const resolved = resolveBrief(b,minimum);
  function update(fn:(next:TicoBrief)=>void) { setB(previous => { const next = structuredClone(previous); fn(next); return next; }); }
  function goTo(i:number) { setStep(i); update(next => { next.formStep = i; }); }

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        let serverConns: any[] = [];
        try {
          const result = await api('connections');
          if (result?.connections) serverConns = result.connections;
          if (result?.warning) console.warn('[TicoBriefForm]', result.warning);
        } catch { /* continuar con conexiones locales/metaState */ }
        const merged = getAvailableConnections(metaState, serverConns);
        if (!active) return;
        setConnections(merged);
        let preferencesData: any = null;
        try {
          const raw = localStorage.getItem('tico_brief_preferences');
          if (raw) preferencesData = JSON.parse(raw);
        } catch {}
        if (!preferencesData && services) {
          try {
            const p = await services.loadPreferences();
            preferencesData = p?.data;
          } catch {}
        }
        if (!active) return;
        lastAssets.current = preferencesData?.last_assets?.latest || preferencesData?.last_assets;
        brandAssets.current = preferencesData?.last_assets?.byBrand || {};
        setPreferencesReady(true);
        setB(previous => {
          const next = structuredClone(previous);
          if (!initialData?.ticoBrief && preferencesData?.delegation) {
            for (const section of sections) {
              const mode = preferencesData.delegation[section];
              if (mode === 'tico' || mode === 'user') next.delegation[section] = mode;
            }
          }
          if (!next.metaConnectionId && merged.length > 0) {
            const chosen = merged.find(c => (metaState?.businessManagerId && c.id === metaState.businessManagerId) || (metaState?.adAccountId && c.id === metaState.adAccountId)) || merged[0];
            if (chosen) {
              next.metaConnectionId = chosen.id;
              if (chosen.adAccountId && !next.meta.adAccountId) next.meta.adAccountId = chosen.adAccountId;
              if (chosen.pageId && !next.meta.pageId) next.meta.pageId = chosen.pageId;
              if (chosen.pixelId && !next.meta.pixelId) next.meta.pixelId = chosen.pixelId;
            }
          }
          return next;
        });
      } catch(e) { if(active) setError((e as Error).message); }
    })();
    return () => { active = false; };
  }, [metaState]);

  useEffect(() => {
    if (!b.metaConnectionId) return;
    let active = true;
    const selectedConn = connections.find(c => c.id === b.metaConnectionId);
    const sessionToken = typeof sessionStorage !== 'undefined' ? (sessionStorage.getItem(`tico_token_${b.metaConnectionId}`) || sessionStorage.getItem('tico_meta_active_token')) : null;
    const connToken = selectedConn?.token || metaState?.userAccessToken || sessionToken || undefined;

    const fetchKey = `${b.metaConnectionId}:${b.meta.adAccountId || ''}:${b.meta.pageId || ''}:${b.existingCampaignId || ''}:${connToken || ''}`;
    if (lastAssetFetchRef.current === fetchKey) return;
    lastAssetFetchRef.current = fetchKey;

    const getFallbackData = () => {
      let fallbackAccounts = selectedConn?.availableAccounts && selectedConn.availableAccounts.length > 0 
        ? selectedConn.availableAccounts.map((a: any) => ({
            ...a,
            account_status: a.account_status ?? (a.status === 'ACTIVA' || a.status === 'ACTIVE' ? 1 : 2)
          }))
        : (selectedConn?.adAccountId ? [{
            id: selectedConn.adAccountId,
            name: selectedConn.adAccountName || 'Cuenta Publicitaria Principal',
            account_status: 1,
            status: 'ACTIVA',
            currency: 'USD',
            timezone_name: 'America/Bogota',
            min_daily_budget: 100
          }] : (metaState?.adAccountId ? [{
            id: metaState.adAccountId,
            name: metaState.adAccountName || 'Cuenta Publicitaria Principal',
            account_status: 1,
            status: 'ACTIVA',
            currency: 'USD',
            timezone_name: 'America/Bogota',
            min_daily_budget: 100
          }] : []));

      if (fallbackAccounts.length === 0 && (selectedConn?.businessManagerId === '1513559203332630' || selectedConn?.portfolioName?.includes('Tic Tac Agency') || selectedConn?.name?.includes('Tic Tac Agency') || selectedConn?.id === '1513559203332630')) {
        fallbackAccounts = [{
          id: selectedConn?.adAccountId || metaState?.adAccountId || 'act_10204739506649666',
          name: selectedConn?.adAccountName || metaState?.adAccountName || 'Tic Tac Agency Performance',
          account_status: 1,
          status: 'ACTIVA',
          currency: 'USD',
          timezone_name: 'America/Bogota',
          min_daily_budget: 100
        }];
      }

      const fallbackPages: any[] = selectedConn?.pageId ? [{ id: selectedConn.pageId, name: selectedConn.pageName || 'Página de Facebook', tasks: ['ADVERTISE'] }] : (metaState?.pageId ? [{ id: metaState.pageId, name: metaState.pageName || 'Página de Facebook', tasks: ['ADVERTISE'] }] : ((selectedConn?.availableAccounts?.map((a: any) => a.page).filter(Boolean) || [])));
      if (fallbackPages.length === 0 && (selectedConn?.businessManagerId === '1513559203332630' || selectedConn?.portfolioName?.includes('Tic Tac Agency') || selectedConn?.name?.includes('Tic Tac Agency') || selectedConn?.id === '1513559203332630')) {
        fallbackPages.push({ id: '693417517199135', name: 'Tic Tac Agency Performance ', tasks: ['ADVERTISE'] });
      }
      const fallbackPixels = selectedConn?.pixelId ? [{ id: selectedConn.pixelId, name: selectedConn.pixelName || 'Píxel de Meta', last_fired_time: new Date().toISOString() }] : (metaState?.pixelId ? [{ id: metaState.pixelId, name: metaState.pixelName || 'Píxel de Meta', last_fired_time: new Date().toISOString() }] : []);
      return { fallbackAccounts, fallbackPages, fallbackPixels };
    };

    const { fallbackAccounts, fallbackPages, fallbackPixels } = getFallbackData();
    // 1. Hidratación inmediata en pantalla: los selectores se llenan al instante sin esperar a la red
    if (fallbackAccounts.length > 0 || fallbackPages.length > 0) {
      setAssets((prev: any) => ({
        ...prev,
        accounts: prev.accounts?.length > 0 ? prev.accounts : fallbackAccounts,
        pages: prev.pages?.length > 0 ? prev.pages : fallbackPages,
        pixels: prev.pixels?.length > 0 ? prev.pixels : fallbackPixels,
        valid: true
      }));
      update(next => {
        if (!next.meta.adAccountId && fallbackAccounts.length > 0) next.meta.adAccountId = fallbackAccounts[0].id;
        if (!next.meta.pageId && fallbackPages.length > 0) next.meta.pageId = fallbackPages[0].id;
        if (!next.meta.pixelId && fallbackPixels.length > 0) next.meta.pixelId = fallbackPixels[0].id;
        const selected = fallbackAccounts.find((a: any) => a.id === next.meta.adAccountId) || fallbackAccounts[0];
        if (selected) { next.meta.currency = selected.currency || 'USD'; next.meta.timezone = selected.timezone_name || 'America/Bogota'; }
      });
    }

    if (!connToken) {
      setAssetBusy(false);
      return;
    }

    setAssetBusy(true);
    rememberBriefConnectionToken(b.metaConnectionId, connToken);
    // The spinner stops after 4s, but the real Meta response is still applied when it arrives:
    // otherwise a placeholder page from the local fallback stays selected and deploy rejects it.
    const busyTimer = setTimeout(() => { if (active) setAssetBusy(false); }, 4000);
    api('assets', {
      connectionId: b.metaConnectionId,
      accountId: b.meta.adAccountId,
      pageId: b.meta.pageId,
      campaignId: b.existingCampaignId,
      token: connToken
    }).then((result: any) => {
      if(!active) return;
      const accounts = (result.accounts && result.accounts.length > 0) ? result.accounts : fallbackAccounts;
      const pages = (result.pages && result.pages.length > 0) ? result.pages : fallbackPages;
      const pixels = (result.pixels && result.pixels.length > 0) ? result.pixels : fallbackPixels;
      const mergedResult = { ...result, accounts, pages, pixels, valid: result.valid || accounts.length > 0 };
      setAssets(mergedResult);
      const realPages = Boolean(result.pages?.length); const realAccounts = Boolean(result.accounts?.length);
      update(next => {
        const available = accounts.filter((a:any) => a.account_status === 1 || a.status === 'ACTIVA' || a.status === 'ACTIVE' || (!a.account_status && !a.status));
        // Drop selections the token cannot actually use (stale draft or local placeholder).
        if (realPages && next.meta.pageId && !pages.some((p:any) => p.id === next.meta.pageId)) next.meta.pageId = '';
        if (realAccounts && next.meta.adAccountId && !accounts.some((a:any) => a.id === next.meta.adAccountId)) next.meta.adAccountId = '';
        const last = lastAssets.current;
        if(last?.connectionId === next.metaConnectionId && next.delegation.assets === 'tico'){
          if(!next.meta.adAccountId && available.some((a:any) => a.id === last.accountId)) next.meta.adAccountId = last.accountId;
          if(!next.meta.pageId && pages.some((p:any) => p.id === last.pageId)) next.meta.pageId = last.pageId;
        }
        if(!next.meta.adAccountId && selectedConn?.adAccountId && available.some((a:any) => a.id === selectedConn.adAccountId)) {
          next.meta.adAccountId = selectedConn.adAccountId;
        } else if(!next.meta.adAccountId && available.length > 0) {
          next.meta.adAccountId = available[0].id;
        }
        if(!next.meta.pageId && selectedConn?.pageId && pages.some((p:any) => p.id === selectedConn.pageId)) {
          next.meta.pageId = selectedConn.pageId;
        } else if(!next.meta.pageId && pages.length > 0) {
          next.meta.pageId = pages[0].id;
        }
        const selected = accounts.find((a:any) => a.id === next.meta.adAccountId);
        next.meta.currency = selected?.currency || 'USD';
        next.meta.timezone = selected?.timezone_name || 'America/Bogota';
        next.meta.instagramUserId = result.instagram?.id;
        if(!next.meta.pixelId && selectedConn?.pixelId && pixels.some((p:any) => p.id === selectedConn.pixelId)) {
          next.meta.pixelId = selectedConn.pixelId;
        } else if(!next.meta.pixelId && pixels.length > 0) {
          next.meta.pixelId = pixels[0].id;
        }
        if(next.creationMode === 'single_ad' && next.existingAdSetId && result.adSets?.length){
          const inherited = result.adSets.find((s:any) => s.id === next.existingAdSetId);
          const campaign = result.campaigns?.find((c:any) => c.id === next.existingCampaignId);
          if(inherited && campaign){
            next.meta.objective = campaign.objective;
            next.meta.optimizationGoal = inherited.optimization_goal;
            next.meta.destinationType = inherited.destination_type;
            next.brief.goal = inheritedGoal(campaign.objective, inherited.destination_type || '');
            if(inherited.promoted_object?.pixel_id) next.meta.pixelId = inherited.promoted_object.pixel_id;
            if(inherited.promoted_object?.custom_event_type) next.meta.conversionEvent = inherited.promoted_object.custom_event_type;
            if(inherited.promoted_object?.page_id) next.meta.pageId = inherited.promoted_object.page_id;
          }
        }
      });
    }).catch(e => {
      if(!active) return;
      console.warn('[TicoBriefForm] Assets inspection completed with local fallback:', e?.message || e);
    }).finally(() => { clearTimeout(busyTimer); if(active) setAssetBusy(false); });
    return () => { active = false; clearTimeout(busyTimer); };
  }, [b.metaConnectionId, b.meta.adAccountId, b.meta.pageId, b.existingCampaignId, metaState?.userAccessToken, connections]);

  useEffect(() => {
    if (!initialized.current) { initialized.current = true; return; }
    const timer = setTimeout(() => draftCallback.current?.(toLegacyPayload(b)), 800);
    return () => clearTimeout(timer);
  }, [b]);

  useEffect(() => {
    if(!preferencesReady) return;
    const timer = setTimeout(() => {
      try {
        const priorRaw = localStorage.getItem('tico_brief_preferences');
        const prior = priorRaw ? JSON.parse(priorRaw) : {};
        localStorage.setItem('tico_brief_preferences', JSON.stringify({
          ...prior,
          delegation: b.delegation
        }));
      } catch {}
    }, 600);
    return () => clearTimeout(timer);
  }, [b.delegation, preferencesReady]);

  useEffect(() => {
    if(b.brief.businessSource.type === 'meta_catalog' && b.metaConnectionId) {
      const selectedConn = connections.find(c => c.id === b.metaConnectionId);
      const sessionToken = typeof sessionStorage !== 'undefined' ? (sessionStorage.getItem(`tico_token_${b.metaConnectionId}`) || sessionStorage.getItem('tico_meta_active_token')) : null;
      const connToken = selectedConn?.token || metaState?.userAccessToken || sessionToken || undefined;
      void api('catalogs', { connectionId: b.metaConnectionId, token: connToken })
        .then(r => setCatalogs(r.catalogs))
        .catch(e => setError(e.message));
    }
  }, [b.brief.businessSource.type, b.metaConnectionId, connections, metaState?.userAccessToken]);

  function toggle(section:SectionKey,checked:boolean) {
    trackBrief('delegation_changed',{section,mode:checked?'tico':'user'});
    update(next=>{
      next.delegation[section]=checked?'tico':'user';
      if(!checked && !manualInitialized.current.has(section)) {
        if(section==='objective') {next.brief.goal=resolved.brief.goal;Object.assign(next.meta,mapGoal(next.brief.goal,!!next.meta.pixelId,next.brief.messageChannels));}
        if(!next.meta.adSets.length) next.meta.adSets=resolved.meta.adSets;
        if(!next.meta.ads.length) next.meta.ads=resolved.meta.ads;
        manualInitialized.current.add(section);
        next.configuredSections=[...manualInitialized.current];
      }
    });
  }

  function reset(section:SectionKey) {
    update(next=>{
      const recommendation=resolveBrief({...next,delegation:{...next.delegation,[section]:'tico'}},minimum);
      if(section==='business'&&next.recommendationProfile){next.brief.businessProfile=structuredClone(next.recommendationProfile);next.brief.countries=next.recommendationProfile.countries;}
      if(section==='assets'){const last=lastAssets.current;if(last?.connectionId===next.metaConnectionId){if(assets.accounts.some((a:any)=>a.id===last.accountId))next.meta.adAccountId=last.accountId;if(assets.pages.some((p:any)=>p.id===last.pageId))next.meta.pageId=last.pageId;next.meta.pixelId=undefined;}}
      if(section==='objective'){next.brief.goal=recommendation.brief.goal;Object.assign(next.meta,mapGoal(next.brief.goal,!!next.meta.pixelId,next.brief.messageChannels));}
      if(section==='audience'||section==='placements')next.meta.adSets=recommendation.meta.adSets;
      if(section==='structure'){next.meta.adSets=[recommendedSet(next,0)];next.meta.ads=[];}
      if(section==='copys')next.meta.ads=next.meta.ads.map(a=>({...a,headline:'',primaryText:'',description:''}));
      if(section==='bid'){next.meta.bidStrategy='LOWEST_COST_WITHOUT_CAP';next.meta.bidAmount=undefined;}
      if(section==='budget'){next.meta.budgetType=recommendation.meta.budgetType;next.meta.budgetPeriod='daily';}
      if(section==='tracking'){next.meta.destinationUrl=next.brief.businessSource.url||'';next.meta.urlTags=emptyBrief().meta.urlTags;}
      if(section==='specialCategory')next.meta.specialAdCategories=next.brief.businessProfile.specialAdCategories;
      if(section==='creatives')next.brief.assets=next.brief.assets.map((a,i)=>({...a,angle:['Beneficio','Oferta','Prueba social'][i%3]}));
    });
  }

  function section(key:SectionKey,summary:string,children:ReactNode) {
    return <section className="tb-section" key={key}>
      <div className="tb-section-heading"><h3>{labels[key]}</h3><label className="tb-delegate"><input type="checkbox" checked={b.delegation[key]==='tico'} onChange={e=>toggle(key,e.target.checked)} />Que Tico lo decida</label></div>
      {b.delegation[key]==='tico'?<p className="tb-summary"><Sparkles size={15}/>{summary}</p>:<div className="tb-manual"><p className="tb-origin">Sugerencia de Tico · puedes editarla</p>{children}<button type="button" className="tb-reset" onClick={()=>reset(key)}>Restablecer a la recomendación</button></div>}
    </section>;
  }

  async function upload(file:File,creative=false) {
    const allowed=creative?['image/jpeg','image/png','video/mp4','video/quicktime']:['application/pdf','image/jpeg','image/png','audio/webm','audio/mp4','audio/ogg','audio/wav'];
    if(!allowed.includes(file.type.split(';')[0])||file.size>(creative?20:12)*1024*1024)throw new Error(`Formato no compatible o archivo mayor de ${creative?20:12} MB.`);
    let ratio='';
    if(creative){
      const dimensions=await new Promise<{w:number;h:number}>((resolve,reject)=>{
        const url=URL.createObjectURL(file);const item=file.type.startsWith('image/')?new Image():document.createElement('video');
        const done=()=>{const w=item instanceof HTMLImageElement?item.naturalWidth:item.videoWidth;const h=item instanceof HTMLImageElement?item.naturalHeight:item.videoHeight;URL.revokeObjectURL(url);resolve({w,h});};
        item.onerror=()=>{URL.revokeObjectURL(url);reject(new Error('No pude leer este creativo.'));};
        if(item instanceof HTMLImageElement)item.onload=done;else item.onloadedmetadata=done;item.src=url;
      });
      if(dimensions.w<500||dimensions.h<500)throw new Error('Usa creativos de al menos 500 × 500 píxeles.');
      ratio=Math.abs(dimensions.w/dimensions.h-9/16)<0.06?'9:16':Math.abs(dimensions.w/dimensions.h-1)<0.06?'1:1':'otro';
    }
    const db=requireSupabase();const {data}=await db.auth.getSession();if(!data.session)throw new Error('Inicia sesión para guardar tus archivos.');
    const path=`${data.session.user.id}/${crypto.randomUUID()}/${file.name.replace(/[^a-zA-Z0-9._-]/g,'_')}`;
    const result=await db.storage.from('user-creatives').upload(path,file,{contentType:file.type.split(';')[0]});if(result.error)throw new Error('No pude guardar tu archivo. Verifica la conexión y la migración de almacenamiento.');
    if(creative)update(next=>{if(next.brief.assets.length<6)next.brief.assets.push({uploadId:path,type:file.type.startsWith('video/')?'video':'image',name:file.name,aspectRatio:ratio,angle:['Beneficio','Oferta','Prueba social'][next.brief.assets.length%3]});});
    else update(next=>{next.brief.businessSource.uploadIds=[path];});
  }

  async function addFiles(files:FileList|File[]) {
    setBusy(true);setError('');
    try {
      const list=Array.from(files);
      if(b.brief.assets.length+list.length>6)throw new Error('Puedes elegir hasta 6 creativos.');
      for(const file of list)await upload(file,true);
    }catch(e){setError((e as Error).message);}finally{setBusy(false);}
  }

  async function next() {
    setError('');
    if(step===0){
      const isAccountActive = account && (account.account_status === 1 || account.status === 'ACTIVA' || account.status === 'ACTIVE' || (!account.account_status && !account.status));
      if(assetBusy||!assets.valid||!account||!isAccountActive||!b.meta.pageId){
        setError('Selecciona una conexión válida, cuenta activa y página.');return;
      }
      if(b.creationMode==='single_ad'&&(!b.existingCampaignId||!b.existingAdSetId)){
        setError('Selecciona la campaña y el conjunto existentes.');return;
      }
      trackBrief('source_started');goTo(1);return;
    }
    if(step===1){
      if(b.delegation.business==='user'){goTo(2);return;}
      setBusy(true);
      try {
        const selectedConn = connections.find(c => c.id === b.metaConnectionId);
        const sessionToken = typeof sessionStorage !== 'undefined' ? (sessionStorage.getItem(`tico_token_${b.metaConnectionId}`) || sessionStorage.getItem('tico_meta_active_token')) : null;
        const connToken = selectedConn?.token || metaState?.userAccessToken || sessionToken || undefined;
        const result=await api('analyze',{connectionId:b.metaConnectionId,pageId:b.meta.pageId,source:b.brief.businessSource,token:connToken});
        update(next=>{
          next.brief.businessProfile=result.businessProfile;next.recommendationProfile=structuredClone(result.businessProfile);next.brief.countries=result.businessProfile.countries;
          if(result.pixelIds?.some((id:string)=>assets.pixels.some((p:any)=>p.id===id)))next.meta.pixelId=result.pixelIds.find((id:string)=>assets.pixels.some((p:any)=>p.id===id));
        });
        setImages(result.images||[]);
      }catch(e){
        const reason=e instanceof Error&&e.message?` (${e.message})`:'';
        setNotice(`No pude leer tu fuente${reason}. Cuéntame en dos frases qué vendes y a quién.`);
      }finally{setBusy(false);goTo(2);}
      return;
    }
    if(step===2){
      if(!b.brief.businessProfile.brandName.trim()||!b.brief.businessProfile.offerSummary.trim()||!b.brief.countries.length){
        setError('Confirma tu marca, qué vendes y dónde vendes.');return;
      }
      const last=brandAssets.current[b.brief.businessProfile.brandName]||lastAssets.current;
      if(last?.brand===b.brief.businessProfile.brandName&&last.connectionId===b.metaConnectionId)update(n=>{if(assets.pages.some((p:any)=>p.id===last.pageId))n.meta.pageId=last.pageId;});
      goTo(3);return;
    }
    const errors=validateBrief(resolved);if(errors.length){setError(errors.join(' '));return;}
    try{await (services ? services.savePreferences(b) : saveBriefPreferences(b));}catch(e){setNotice((e as Error).message);}
    onSubmit(toLegacyPayload(resolved));
  }

  function profileFields(){
    return <div className="tb-grid">
      {(['brandName','industry','offerSummary','targetAudience'] as const).map((field,i)=><Field key={field} label={['Tu marca','Qué tipo de negocio tienes','Qué vendes y qué ofreces','A quién le vendes'][i]}><input value={b.brief.businessProfile[field]} onChange={e=>update(n=>{n.brief.businessProfile[field]=e.target.value;n.brief.businessProfile.fieldSources[field]='user';n.brief.businessProfile.confidence[field]=1;})}/><small>{originLabels[b.brief.businessProfile.fieldSources[field]||'tico']}</small></Field>)}
      <Field label="Dónde vendes (países)"><select multiple value={b.brief.countries} onChange={e=>{const countries=Array.from(e.target.selectedOptions,o=>o.value);update(n=>{n.brief.countries=countries;n.brief.businessProfile.countries=countries;n.brief.businessProfile.confidence.countries=1;n.brief.businessProfile.fieldSources.countries='user';});}}>{[['CO','Colombia'],['MX','México'],['US','Estados Unidos'],['ES','España'],['AR','Argentina'],['PE','Perú'],['CL','Chile'],['EC','Ecuador'],['BR','Brasil'],['PA','Panamá'],['CR','Costa Rica']].map(([id,name])=><option key={id} value={id}>{name}</option>)}</select><small>{originLabels[b.brief.businessProfile.fieldSources.countries||'tico']}</small></Field>
      <Field label="La voz de tu marca"><select value={b.brief.businessProfile.brandVoice} onChange={e=>update(n=>{n.brief.businessProfile.brandVoice=e.target.value as any;})}>{['formal','cercano','tecnico','divertido'].map(v=><option key={v}>{v}</option>)}</select></Field>
    </div>;
  }

  return <form className="tico-brief" onSubmit={e=>{e.preventDefault();void next();}}>
    <header className="tb-header">
      <div>
        <span className="tb-eyebrow"><Sparkles size={16}/> TICO AGENT</span>
        <h2>Tu negocio. Tu próxima campaña.</h2>
        <p>Hola, soy Tico. Cuéntame de tu negocio: tu web, tus redes, un catálogo o una nota de voz, y armo tu campaña en 3 pasos.</p>
      </div>
      {onClose&&<button type="button" className="tb-reset" onClick={onClose}>Cerrar</button>}
    </header>

    <nav aria-label="Pasos del briefing" className="tb-steps">
      {['Conexión','Tu negocio','Confirmación','Tu campaña'].map((label,i)=><button type="button" key={label} aria-current={step===i?'step':undefined} disabled={i>step||busy} onClick={()=>goTo(i)}><span>{i<step?<Check size={15}/>:i}</span>{label}</button>)}
    </nav>

    {notice&&<p className="tb-notice" role="status">{notice}</p>}
    {error&&<p className="tb-error" role="alert">{error}</p>}

    {step===0&&<div className="tb-body">
      <h3>Primero, tu conexión de Meta</h3>
      <Field label="¿Con qué portafolio comercial o conexión de Meta quieres desplegar?">
        <select value={b.metaConnectionId} onChange={e=>{
          const chosenId = e.target.value;
          const chosen = connections.find(c => c.id === chosenId);
          setAssets({accounts:[],pages:[],pixels:[],campaigns:[],adSets:[],warnings:[]});
          update(n=>{
            n.metaConnectionId=chosenId;
            n.meta.adAccountId=chosen?.adAccountId||'';
            n.meta.pageId=chosen?.pageId||'';
            n.meta.pixelId=chosen?.pixelId;
            n.meta.instagramUserId=undefined;
            n.existingCampaignId=undefined;
            n.existingAdSetId=undefined;
          });
          if(chosen && onUpdateMetaState && metaState){
            onUpdateMetaState({
              ...metaState,
              businessManagerId: chosen.businessManagerId || metaState.businessManagerId,
              businessManagerName: chosen.portfolioName || chosen.businessManagerName || chosen.name || metaState.businessManagerName,
              adAccountId: chosen.adAccountId || metaState.adAccountId,
              adAccountName: chosen.adAccountName || metaState.adAccountName,
              pageId: chosen.pageId || metaState.pageId,
              pageName: chosen.pageName || metaState.pageName,
              pixelId: chosen.pixelId || metaState.pixelId,
              pixelName: chosen.pixelName || metaState.pixelName,
              availableAccounts: chosen.availableAccounts || metaState.availableAccounts,
            });
          }
        }}>
          <option value="">Elige un portafolio comercial o conexión</option>
          {connections.map(c=>(
            <option key={c.id} value={c.id}>
              {c.name} {c.businessManagerId ? `(ID BM: ${c.businessManagerId})` : c.adAccountId ? `(Cuenta: ${c.adAccountId})` : ''} · {c.id===b.metaConnectionId?(assetBusy?'validando':assets.valid?'activa':'por reconectar'):'guardada'}
            </option>
          ))}
        </select>
      </Field>

      {connections.length===0&&!assetBusy&&(
        <div className="tb-notice">
          No tienes portafolios comerciales guardados. Conecta tu cuenta en el apartado de Conexiones.
          {onReconnect && <button type="button" className="tb-reset" style={{marginTop:'8px',display:'block'}} onClick={onReconnect}>Ir a Conexiones</button>}
        </div>
      )}

      {assets.warnings.map((w:string)=><p className="tb-notice" key={w}>{w}</p>)}
      <div className="tb-grid">
        <Field label="Cuenta publicitaria">
          <select value={b.meta.adAccountId} onChange={e=>update(n=>{n.meta.adAccountId=e.target.value;n.meta.pixelId=undefined;n.existingCampaignId=undefined;n.existingAdSetId=undefined;})}>
            <option value="">Elige tu cuenta</option>
            {assets.accounts.map((a:any) => {
              const isAct = a.account_status === 1 || a.status === 'ACTIVA' || a.status === 'ACTIVE' || (!a.account_status && !a.status);
              const statusDesc = !isAct ? (a.statusLabel || (a.account_status !== undefined ? `estado ${a.account_status}` : a.status || 'inactiva')) : '';
              return (
                <option key={a.id} value={a.id} disabled={!isAct}>
                  {a.name}{!isAct ? ` · no disponible (${statusDesc})` : ''}
                </option>
              );
            })}
          </select>
        </Field>
        <Field label="Página de Facebook">
          <select value={b.meta.pageId} onChange={e=>update(n=>{n.meta.pageId=e.target.value;n.meta.instagramUserId=undefined;})}>
            <option value="">Elige tu página</option>
            {assets.pages.map((p:any)=><option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </Field>
      </div>

      {account?.name&&<p className="tb-summary">{account.name} · {b.meta.currency||'USD'} · {b.meta.timezone||'Zona horaria de tu cuenta'}</p>}

      {(assets.pixels.length>1||b.delegation.assets==='user')&&<Field label="Píxel">
        <select value={b.meta.pixelId||''} onChange={e=>update(n=>{n.meta.pixelId=e.target.value||undefined;})}>
          <option value="">Sin píxel</option>
          {assets.pixels.map((p:any)=><option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </Field>}

      {b.meta.pixelId&&(!assets.pixels.find((p:any)=>p.id===b.meta.pixelId)?.last_fired_time||Date.parse(assets.pixels.find((p:any)=>p.id===b.meta.pixelId)?.last_fired_time)<Date.now()-7*86400000)&&<p className="tb-notice">Tu píxel no registra eventos recientes. Revisa su actividad antes de optimizar ventas.</p>}

      <Field label="¿Qué quieres crear?">
        <select value={b.creationMode} onChange={e=>update(n=>{n.creationMode=e.target.value as any;})}>
          <option value="full_campaign">Una campaña completa</option>
          <option value="single_ad">Un anuncio en una campaña existente</option>
        </select>
      </Field>

      {b.creationMode==='single_ad'&&<div className="tb-grid">
        <Field label="Campaña existente">
          <select value={b.existingCampaignId||''} onChange={e=>update(n=>{n.existingCampaignId=e.target.value;n.existingAdSetId=undefined;})}>
            <option value="">Elige tu campaña</option>
            {assets.campaigns.map((c:any)=><option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </Field>
        <Field label="Conjunto existente">
          <select value={b.existingAdSetId||''} onChange={e=>update(n=>{
            n.existingAdSetId=e.target.value;
            const inherited=assets.adSets.find((s:any)=>s.id===e.target.value);
            const campaign=assets.campaigns.find((c:any)=>c.id===n.existingCampaignId);
            if(inherited&&campaign){
              n.meta.objective=campaign.objective;n.meta.optimizationGoal=inherited.optimization_goal;n.meta.destinationType=inherited.destination_type;
              n.brief.goal=inheritedGoal(campaign.objective,inherited.destination_type||'');
              if(inherited.promoted_object?.pixel_id)n.meta.pixelId=inherited.promoted_object.pixel_id;
              if(inherited.promoted_object?.custom_event_type)n.meta.conversionEvent=inherited.promoted_object.custom_event_type;
              if(inherited.promoted_object?.page_id)n.meta.pageId=inherited.promoted_object.page_id;
              if(n.meta.ads[0]){n.meta.ads[0].adSetId=e.target.value;if(!n.meta.ads[0].callToAction)n.meta.ads[0].callToAction=mapGoal(n.brief.goal,!!n.meta.pixelId,n.brief.messageChannels).cta;}
            }
          })}>
            <option value="">Elige tu conjunto</option>
            {assets.adSets.map((s:any)=><option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </Field>
        <p>El nuevo anuncio quedará en pausa. La campaña y el conjunto conservan su configuración.</p>
      </div>}
    </div>}

    {step===1&&<div className="tb-body">
      {section('business','Leeré tu fuente y te mostraré lo que entendí.',profileFields())}
      {b.delegation.business==='tico'&&<>
        <h3>¿Cómo conozco tu negocio?</h3>
        <div className="tb-source-grid">{Object.entries(sourceLabels).map(([type,label])=><button type="button" aria-pressed={b.brief.businessSource.type===type} key={type} onClick={()=>update(n=>{n.brief.businessSource={type:type as BusinessSource['type']};})}>{label}{type==='social'&&<small>Recomendada si no tienes web</small>}</button>)}</div>
        {['website','other_link'].includes(b.brief.businessSource.type)&&<Field label="Enlace de tu negocio"><input type="url" placeholder="https://tunegocio.com" value={b.brief.businessSource.url||''} onChange={e=>update(n=>{n.brief.businessSource.url=e.target.value;})}/></Field>}
        {b.brief.businessSource.type==='social'&&<p>Leeré la descripción y las publicaciones de la página elegida y su Instagram vinculado.</p>}
        {b.brief.businessSource.type==='meta_catalog'&&<Field label="Tu catálogo"><select value={b.brief.businessSource.catalogId||''} onChange={e=>update(n=>{n.brief.businessSource.catalogId=e.target.value;})}><option value="">Elige tu catálogo</option>{catalogs.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></Field>}
        {b.brief.businessSource.type==='files'&&<Field label="PDF, menú o foto de volante (hasta 12 MB)"><input type="file" accept="application/pdf,image/jpeg,image/png" onChange={e=>{const file=e.target.files?.[0];if(file){setBusy(true);void upload(file).catch(e=>setError(e.message)).finally(()=>setBusy(false));}}}/></Field>}
        {b.brief.businessSource.type==='voice'&&<VoiceRecorder onRecorded={file=>upload(file)}/>}
        {b.brief.businessSource.uploadIds?.length&&<p>Archivo guardado. Listo para analizar.</p>}
        {b.brief.businessSource.type==='interview'&&['¿Qué vendes y cómo se llama tu negocio?','¿A quién le vendes?','¿En qué países o ciudades vendes?','¿Qué te hace diferente?','¿Tienes una oferta o promoción?'].map((q,i)=><Field label={q} key={q}><input value={interview[i]} onChange={e=>{const answers=[...interview];answers[i]=e.target.value;setInterview(answers);update(n=>{n.brief.businessSource.transcript=answers.map((a,j)=>`${j+1}: ${a}`).join('\n');});}}/></Field>)}
      </>}
    </div>}

    {step===2&&<div className="tb-body">
      <span className="tb-eyebrow">ESTO ES LO QUE ENTENDÍ</span>
      <h3>Entendí que vendes {b.brief.businessProfile.offerSummary||'…'}</h3>
      <p>Revisa tu ficha. Puedes corregir cualquier dato.</p>
      {profileFields()}
      {(['offerSummary','targetAudience','countries'] as const).filter(f=>(b.brief.businessProfile.confidence[f]||0)<0.65).slice(0,3).map(f=><div className="tb-question" key={f}><strong>{f==='offerSummary'?'¿Qué oferta quieres destacar?':f==='targetAudience'?'¿A quién quieres llegar?':'¿Dónde vendes?'}</strong><div className="tb-chips">{(f==='offerSummary'?['Sin promoción','Envío gratis','Descuento de bienvenida']:f==='targetAudience'?['Consumidores finales','Empresas','Clientes actuales']:['CO','MX','ES']).map(answer=><button type="button" key={answer} onClick={()=>update(n=>{if(f==='countries'){n.brief.countries=[answer];n.brief.businessProfile.countries=[answer];}else n.brief.businessProfile[f]=answer;n.brief.businessProfile.confidence[f]=1;n.brief.businessProfile.fieldSources[f]='user';})}>{answer}</button>)}</div></div>)}
    </div>}

    {step===3&&<div className="tb-body">
      <div className="tb-toolbar">
        <span>Decide cuánto participar. Tú siempre eliges el monto.</span>
        <button type="button" onClick={()=>update(n=>{for(const s of sections)n.delegation[s]='tico';})}>Delega todo a Tico</button>
      </div>

      {b.creationMode==='full_campaign'&&section('objective',`Tico elegirá: ${goalLabels[resolved.brief.goal]}.`,<>
        <div className="tb-source-grid">{Object.entries(goalLabels).map(([goal,label])=><button key={goal} type="button" aria-pressed={b.brief.goal===goal} onClick={()=>update(n=>{n.brief.goal=goal as Goal;Object.assign(n.meta,mapGoal(goal as Goal,!!n.meta.pixelId,n.brief.messageChannels));})}>{label}{goal==='sell_online'&&!b.meta.pixelId&&<small>Necesitas un píxel activo. Puedes empezar con Visitas a tu web.</small>}</button>)}</div>
        {b.brief.goal==='messages'&&<div className="tb-chips">{(['whatsapp','messenger','instagram_direct'] as const).map(c=><label key={c}><input type="checkbox" checked={b.brief.messageChannels.includes(c)} onChange={e=>update(n=>{n.brief.messageChannels=e.target.checked?[...n.brief.messageChannels,c]:n.brief.messageChannels.filter(x=>x!==c);Object.assign(n.meta,mapGoal(n.brief.goal,!!n.meta.pixelId,n.brief.messageChannels));})}/>{c}</label>)}</div>}
        <div className="tb-grid">{(['objective','destinationType','optimizationGoal'] as const).map(key=><Field key={key} label={key}><input value={b.meta[key]} onChange={e=>update(n=>{n.meta[key]=e.target.value;})}/></Field>)}</div>
      </>)}

      <>{resolved.brief.goal==='leads'&&!b.meta.pixelId&&<MetaOptionPicker label="Formulario instantáneo" kind="leadForm" connectionId={b.metaConnectionId} accountId={b.meta.adAccountId} pageId={b.meta.pageId} api={api} onSelect={o=>{update(n=>{n.meta.leadFormId=o.id;});setNotice(`Formulario: ${o.name}`);}}/>}</>

      <section className="tb-section">
        <h3>Tu presupuesto, siempre lo eliges tú</h3>
        <Field label={`Monto ${b.meta.budgetPeriod==='lifetime'?'total':'diario'} · ${b.meta.currency}`}><input type="number" min="0" step="0.01" value={b.brief.dailyBudget||''} onChange={e=>update(n=>{n.brief.dailyBudget=Number(e.target.value);})}/></Field>
        {minimum>0&&<div className="tb-chips">{[1,2,4].map(k=><button key={k} type="button" onClick={()=>update(n=>{n.brief.dailyBudget=Math.ceil(minimum*k);})}>{Math.ceil(minimum*k).toLocaleString()} {b.meta.currency}</button>)}</div>}
        <p>Meta suele necesitar de 5 a 7 días para aprender.</p>
        <Field label="Fecha de fin (opcional)"><input type="date" value={b.brief.endDate||''} onChange={e=>update(n=>{n.brief.endDate=e.target.value;})}/></Field>
      </section>

      {b.creationMode==='full_campaign'&&section('budget',`Tico usará ${resolved.meta.budgetType} según tu estructura y presupuesto.`,<div className="tb-grid">
        <Field label="Distribución"><select value={b.meta.budgetType} onChange={e=>update(n=>{n.meta.budgetType=e.target.value as any;})}><option>CBO</option><option>ABO</option></select></Field>
        <Field label="Tipo de presupuesto"><select value={b.meta.budgetPeriod} onChange={e=>update(n=>{n.meta.budgetPeriod=e.target.value as any;})}><option value="daily">Diario</option><option value="lifetime">Total</option></select></Field>
        <Field label="Fecha de inicio"><input type="datetime-local" value={b.meta.startDate||''} onChange={e=>update(n=>{n.meta.startDate=e.target.value;})}/></Field>
        {b.meta.budgetType==='ABO'&&b.meta.adSets.map((s,i)=><Field key={s.id} label={`Presupuesto · ${s.name}`}><input type="number" value={s.budgetAmount} onChange={e=>update(n=>{n.meta.adSets[i].budgetAmount=Number(e.target.value);})}/></Field>)}
      </div>)}

      <section className="tb-section" onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();void addFiles(e.dataTransfer.files);}}>
        <h3>Tus creativos</h3>
        <p>Arrastra de 1 a 6 imágenes o videos. JPG, PNG, MP4 o MOV, hasta 20 MB por archivo.</p>
        <input aria-label="Subir creativos" type="file" multiple accept="image/jpeg,image/png,video/mp4,video/quicktime" disabled={busy} onChange={e=>{if(e.target.files)void addFiles(e.target.files);}}/>
        <ul>{b.brief.assets.map(a=><li key={a.uploadId}>{a.name||'Creativo'} · {a.aspectRatio}<button type="button" onClick={()=>update(n=>{n.brief.assets=n.brief.assets.filter(x=>x.uploadId!==a.uploadId);})}>Quitar</button></li>)}</ul>
        {b.brief.assets.length>0&&!b.brief.assets.some(a=>a.aspectRatio==='9:16')&&<p className="tb-notice">Añade una versión 9:16 para Stories y Reels.</p>}
        {!b.brief.assets.length&&images.length>0&&<div className="tb-source-images">{images.map(url=><button type="button" key={url} onClick={()=>{setBusy(true);void api('import-image',{url}).then(r=>update(n=>{n.brief.assets.push(r.asset);})).catch(e=>setError(e.message)).finally(()=>setBusy(false));}}><img src={url} referrerPolicy="no-referrer" alt="Imagen encontrada en tu fuente"/>Usar imagen</button>)}</div>}
      </section>

      {section('creatives','Asignaré un ángulo a cada creativo.',b.brief.assets.map((a,i)=><Field key={a.uploadId} label={a.name||`Creativo ${i+1}`}><select value={a.angle||'Beneficio'} onChange={e=>update(n=>{n.brief.assets[i].angle=e.target.value;})}>{['Dolor','Oferta','Prueba social','Beneficio'].map(v=><option key={v}>{v}</option>)}</select></Field>))}

      {b.creationMode==='full_campaign'&&<>
        {section('bid','Buscaré resultados al menor costo, sin límite de puja.',<div className="tb-grid"><Field label="Estrategia"><select value={b.meta.bidStrategy} onChange={e=>update(n=>{n.meta.bidStrategy=e.target.value;})}>{['LOWEST_COST_WITHOUT_CAP','LOWEST_COST_WITH_BID_CAP','COST_CAP','LOWEST_COST_WITH_MIN_ROAS'].map(v=><option key={v}>{v}</option>)}</select></Field><Field label="Monto de puja"><input type="number" value={b.meta.bidAmount||''} onChange={e=>update(n=>{n.meta.bidAmount=Number(e.target.value);})}/></Field><Field label="ROAS mínimo"><input type="number" step="0.01" value={b.meta.minRoas||''} onChange={e=>update(n=>{n.meta.minRoas=Number(e.target.value);})}/></Field></div>)}
        {section('specialCategory',resolved.meta.specialAdCategories.length?`Detecté ${resolved.meta.specialAdCategories.join(', ')}. Meta exige segmentación amplia.`:'Usaré la categoría detectada en tu ficha.',<Field label="Categoría"><select value={b.meta.specialAdCategories[0]||''} onChange={e=>update(n=>{n.meta.specialAdCategories=e.target.value?[e.target.value]:[];})}><option value="">Ninguna</option>{['EMPLOYMENT','HOUSING','FINANCIAL_PRODUCTS_SERVICES','ISSUES_ELECTIONS_POLITICS'].map(v=><option key={v}>{v}</option>)}</select></Field>)}
        {section('structure','Crearé 1 conjunto con 3 anuncios.',<div className="tb-grid"><Field label="Conjuntos (1–5)"><input type="number" min="1" max="5" value={b.meta.adSets.length||1} onChange={e=>update(n=>{const count=Math.max(1,Math.min(5,Number(e.target.value)));n.meta.adSets=Array.from({length:count},(_,i)=>n.meta.adSets[i]||recommendedSet(n,i));})}/></Field><Field label="Anuncios por conjunto (1–6)"><input type="number" min="1" max="6" value={Math.max(1,Math.round(b.meta.ads.length/Math.max(1,b.meta.adSets.length)))} onChange={e=>update(n=>{const count=Math.max(1,Math.min(6,Number(e.target.value)));n.meta.ads=Array.from({length:Math.max(1,n.meta.adSets.length)*count},(_,i)=>n.meta.ads[i]||{id:`ad_${i}`,adSetId:n.meta.adSets[Math.floor(i/count)]?.id||'set_0',name:`Anuncio ${i+1}`,angle:'Beneficio',headline:'',primaryText:'',description:'',callToAction:mapGoal(n.brief.goal,!!n.meta.pixelId).cta});})}/></Field><Field label="Plantilla de nombres"><input value={b.meta.namingTemplate} onChange={e=>update(n=>{n.meta.namingTemplate=e.target.value;})}/></Field></div>)}
        {section('audience','Usaré Advantage+ Audience con sugerencias basadas en tu negocio.',b.meta.adSets.map((s,i)=><div className="tb-grid" key={s.id}><strong>{s.name}</strong><Field label="Edad mínima"><input type="number" min="18" max="65" value={s.ageMin} onChange={e=>update(n=>{n.meta.adSets[i].ageMin=Number(e.target.value);})}/></Field><Field label="Edad máxima"><input type="number" min="18" max="65" value={s.ageMax} onChange={e=>update(n=>{n.meta.adSets[i].ageMax=Number(e.target.value);})}/></Field><Field label="Género"><select value={s.gender} onChange={e=>update(n=>{n.meta.adSets[i].gender=e.target.value as any;})}><option value="all">Todos</option><option value="men">Hombres</option><option value="women">Mujeres</option></select></Field><Field label="Intereses (separados por comas)"><input value={s.interests.join(', ')} onChange={e=>update(n=>{n.meta.adSets[i].interests=e.target.value.split(',').map(v=>v.trim());})}/></Field><ManualAudience set={s} brief={b} api={api} onChange={set=>update(n=>{n.meta.adSets[i]=set;})}/><p>Países: {b.brief.countries.join(', ')}. Puedes cambiarlos en tu ficha.</p></div>))}
        {section('placements','Usaré ubicaciones Advantage+.',b.meta.adSets.map((s,i)=><div key={s.id}><strong>{s.name}</strong><div className="tb-chips">{['facebook','instagram','messenger','audience_network'].map(p=><label key={p}><input type="checkbox" checked={s.publisherPlatforms.includes(p)} onChange={e=>update(n=>{n.meta.adSets[i].publisherPlatforms=e.target.checked?[...s.publisherPlatforms,p]:s.publisherPlatforms.filter(x=>x!==p);})}/>{p}</label>)}</div><ManualPlacements set={s} onChange={set=>update(n=>{n.meta.adSets[i]=set;})}/></div>))}
      </>}

      {section('copys','Redactaré 3 titulares y 2 textos por anuncio con su ángulo y fórmula.',b.meta.ads.map((a,i)=><div className="tb-grid" key={a.id}><strong>{a.name}</strong>{(['headline','primaryText','description'] as const).map((f,j)=><Field key={f} label={`${['Titular','Texto principal','Descripción'][j]} · ${a[f].length}/${[40,125,30][j]} recomendados`}><textarea value={a[f]} onChange={e=>update(n=>{n.meta.ads[i][f]=e.target.value;})}/></Field>)}<Field label="Llamado a la acción"><select value={a.callToAction} onChange={e=>update(n=>{n.meta.ads[i].callToAction=e.target.value;})}>{['','LEARN_MORE','SHOP_NOW','SIGN_UP','MESSAGE_PAGE','WHATSAPP_MESSAGE','CALL_NOW'].map(v=><option key={v} value={v}>{v||'Sin botón'}</option>)}</select></Field></div>))}
      {section('tracking','Usaré el enlace de tu negocio y UTMs para identificar cada anuncio.',<div className="tb-grid"><Field label="URL de destino"><input type="url" value={b.meta.destinationUrl} onChange={e=>update(n=>{n.meta.destinationUrl=e.target.value;})}/></Field><Field label="Parámetros de seguimiento"><input value={b.meta.urlTags} onChange={e=>update(n=>{n.meta.urlTags=e.target.value;})}/></Field></div>)}
    </div>}

    <footer className="tb-footer">
      {step > 0 ? (
        <button type="button" disabled={busy} onClick={()=>goTo(step-1)}>
          <ArrowLeft size={17}/>Atrás
        </button>
      ) : <div />}
      <span>Todo se creará en pausa.</span>
      <button className="tb-primary" type="submit" disabled={busy||assetBusy||isLoading}>
        {busy?'Estoy leyendo tu fuente…':isLoading?'Armando tu campaña…':step===3?'Ver mi estrategia':step===2?'Todo correcto':'Continuar'}
        <ArrowRight size={17}/>
      </button>
    </footer>
  </form>;
}
