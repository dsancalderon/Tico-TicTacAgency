export const sections = ['assets', 'business', 'objective', 'budget', 'bid', 'specialCategory', 'audience', 'placements', 'structure', 'creatives', 'copys', 'tracking'] as const;
export type SectionKey = typeof sections[number];
export type Delegation = Record<SectionKey, 'tico' | 'user'>;
export type Goal = 'sell_online' | 'messages' | 'leads' | 'calls' | 'ig_profile' | 'traffic' | 'awareness' | 'engagement';
export type Channel = 'whatsapp' | 'messenger' | 'instagram_direct';
export type FieldSource = 'web' | 'social' | 'user' | 'tico';
export interface BusinessProfile {
  brandName: string; industry: string; offerSummary: string; targetAudience: string;
  differentiators: string[]; brandVoice: 'formal' | 'cercano' | 'tecnico' | 'divertido';
  conversionChannels: ('checkout' | Channel | 'form' | 'phone')[];
  fieldSources: Record<string, FieldSource>; confidence: Record<string, number>;
  countries: string[]; specialAdCategories: string[];
}
export interface BusinessSource {
  type: 'website' | 'social' | 'meta_catalog' | 'other_link' | 'files' | 'interview' | 'voice';
  url?: string; catalogId?: string; uploadIds?: string[]; transcript?: string;
}
export interface AdSetConfig {
  id: string; name: string; budgetAmount: number; countries: string[]; ageMin: number; ageMax: number;
  gender: 'all' | 'men' | 'women'; interests: string[]; locales: number[];
  cities: { key: string; radius: number; distance_unit: 'mile' }[];
  regions: { key: string }[]; customAudiences: string[]; excludedAudiences: string[];
  publisherPlatforms: string[]; positions: Record<string, string[]>;
}
export interface AdConfig {
  id: string; adSetId: string; name: string; angle: string; headline: string; primaryText: string;
  description: string; callToAction: string; uploadId?: string;
  headlines?: string[]; primaryTexts?: string[]; formula?: 'AIDA' | 'PAS';
}
export interface TicoBrief {
  configuredSections?: SectionKey[];
  recommendationProfile?: BusinessProfile;
  version: 2; delegation: Delegation; creationMode: 'full_campaign' | 'single_ad'; metaConnectionId: string;
  existingCampaignId?: string; existingAdSetId?: string;
  brief: { businessSource: BusinessSource; businessProfile: BusinessProfile; goal: Goal; messageChannels: Channel[];
    dailyBudget: number; endDate?: string; countries: string[];
    assets: { uploadId: string; type: 'image' | 'video'; angle?: string; name?: string; aspectRatio?: string }[] };
  meta: { adAccountId: string; pageId: string; pixelId?: string; instagramUserId?: string; currency: string; timezone: string;
    objective: string; destinationType: string; optimizationGoal: string; conversionEvent?: string;
    specialAdCategories: string[]; specialAdCategoryCountry: string[];
    budgetType: 'CBO' | 'ABO'; budgetPeriod: 'daily' | 'lifetime'; startDate?: string;
    bidStrategy: string; bidAmount?: number; minRoas?: number; adSets: AdSetConfig[]; ads: AdConfig[];
    namingTemplate: string; destinationUrl: string; urlTags: string; leadFormId?: string; phone?: string };
}
export const goalLabels: Record<Goal, string> = { sell_online: 'Vender en mi tienda online', messages: 'Recibir mensajes', leads: 'Conseguir contactos', calls: 'Recibir llamadas', ig_profile: 'Visitas a mi Instagram', traffic: 'Llevar visitas a mi web', awareness: 'Que más gente me conozca', engagement: 'Más interacción' };
export function mapGoal(goal: Goal, pixel = false, channels: Channel[] = ['messenger']) {
  const channelNames = ['instagram_direct', 'messenger', 'whatsapp'].filter(c => channels.includes(c as Channel));
  const destination = channelNames.length > 1 ? `MESSAGING_${channelNames.join('_').toUpperCase()}` : (channelNames[0] || 'messenger').toUpperCase();
  const rows: Record<Goal, [string, string, string, string, string?]> = {
    sell_online: ['OUTCOME_SALES', 'WEBSITE', 'OFFSITE_CONVERSIONS', 'SHOP_NOW', 'PURCHASE'],
    messages: ['OUTCOME_ENGAGEMENT', destination, 'CONVERSATIONS', channels.length === 1 && channels[0] === 'whatsapp' ? 'WHATSAPP_MESSAGE' : 'MESSAGE_PAGE'],
    leads: ['OUTCOME_LEADS', pixel ? 'WEBSITE' : 'ON_AD', pixel ? 'OFFSITE_CONVERSIONS' : 'LEAD_GENERATION', 'SIGN_UP', pixel ? 'LEAD' : undefined],
    // TODO(v21): PHONE_CALL is absent from the versioned SDK; deployment rejects this goal.
    calls: ['OUTCOME_LEADS', 'PHONE_CALL', 'QUALITY_CALL', 'CALL_NOW'],
    ig_profile: ['OUTCOME_TRAFFIC', 'INSTAGRAM_PROFILE', 'VISIT_INSTAGRAM_PROFILE', ''],
    traffic: ['OUTCOME_TRAFFIC', 'WEBSITE', pixel ? 'LANDING_PAGE_VIEWS' : 'LINK_CLICKS', 'LEARN_MORE'],
    awareness: ['OUTCOME_AWARENESS', '', 'REACH', 'LEARN_MORE'],
    engagement: ['OUTCOME_ENGAGEMENT', 'ON_POST', 'POST_ENGAGEMENT', ''],
  };
  const [objective, destinationType, optimizationGoal, cta, conversionEvent] = rows[goal];
  return { objective, destinationType, optimizationGoal, cta, conversionEvent };
}
export function inheritedGoal(objective:string,destination:string): Goal {
  if(destination==='PHONE_CALL')return 'calls';
  if(destination==='INSTAGRAM_PROFILE')return 'ig_profile';
  if(/MESSENGER|WHATSAPP|INSTAGRAM_DIRECT|MESSAGING_/.test(destination))return 'messages';
  if(objective==='OUTCOME_SALES')return 'sell_online';
  if(objective==='OUTCOME_LEADS')return 'leads';
  if(objective==='OUTCOME_AWARENESS')return 'awareness';
  if(objective==='OUTCOME_ENGAGEMENT')return 'engagement';
  return 'traffic';
}
// Explicit allowlist: unsupported currencies must be reviewed against Meta's offsets.
export function currencyOffset(currency: string) {
  const offsets: Record<string, number> = { USD: 100, EUR: 100, MXN: 100, COP: 100, GBP: 100, BRL: 100, PEN: 100, ARS: 100, CLP: 1, JPY: 1, KRW: 1 };
  if (!offsets[currency]) throw new Error(`Offset de ${currency} pendiente de validación con Meta.`);
  return offsets[currency];
}
export function toMinorUnits(amount: number, currency: string) {
  if (!Number.isFinite(amount) || amount < 0) throw new Error('Presupuesto inválido.');
  const value = Math.round(amount * currencyOffset(currency));
  if (!Number.isSafeInteger(value)) throw new Error('Presupuesto fuera de rango.');
  return value;
}
export function chooseBudgetType(count: number, daily: number, minimum: number): 'CBO' | 'ABO' {
  return count >= 2 && daily >= count * minimum ? 'CBO' : 'ABO';
}
export function specialAudience(set: AdSetConfig): AdSetConfig {
  return { ...set, ageMin: 18, ageMax: 65, gender: 'all', interests: [], excludedAudiences: [],
    cities: set.cities.map(c => ({ ...c, radius: Math.max(15, c.radius), distance_unit: 'mile' })) };
}
export function emptyBrief(): TicoBrief {
  return { version: 2, delegation: Object.fromEntries(sections.map(s => [s, 'tico'])) as Delegation,
    creationMode: 'full_campaign', metaConnectionId: '', brief: {
      businessSource: { type: 'website', url: '' }, businessProfile: { brandName: '', industry: '', offerSummary: '', targetAudience: '', differentiators: [], brandVoice: 'cercano', conversionChannels: [], fieldSources: {}, confidence: {}, countries: [], specialAdCategories: [] },
      goal: 'traffic', messageChannels: ['messenger'], dailyBudget: 0, countries: [], assets: [] },
    meta: { adAccountId: '', pageId: '', currency: '', timezone: '', ...mapGoal('traffic'), specialAdCategories: [], specialAdCategoryCountry: [], budgetType: 'ABO', budgetPeriod: 'daily', bidStrategy: 'LOWEST_COST_WITHOUT_CAP', adSets: [], ads: [], namingTemplate: '{marca}_{objetivo}_{país}_{AAAAMMDD}', destinationUrl: '', urlTags: 'utm_source=meta&utm_medium=paid&utm_campaign={{campaign.name}}&utm_content={{ad.name}}' } };
}
export function validateBrief(value: unknown): string[] {
  const errors: string[] = [];
  if (!value || typeof value !== 'object') return ['Brief inválido.'];
  const b = value as TicoBrief;
  if (b.version !== 2 || !b.brief || !b.meta || !b.delegation) return ['Esquema de briefing inválido.'];
  if (!b.brief.businessProfile || typeof b.brief.businessProfile.brandName !== 'string' || !b.brief.businessSource || typeof b.brief.businessSource.type !== 'string') return ['Ficha de negocio inválida.'];
  if (!Array.isArray(b.brief.messageChannels) || b.brief.messageChannels.some(c => !['whatsapp','messenger','instagram_direct'].includes(c))) errors.push('Canales de mensajes inválidos.');
  if (!Array.isArray(b.meta.specialAdCategories) || !Array.isArray(b.meta.specialAdCategoryCountry)) return ['Categorías inválidas.'];
  if (typeof b.meta.currency !== 'string' || typeof b.meta.destinationUrl !== 'string' || typeof b.meta.urlTags !== 'string' || typeof b.meta.namingTemplate !== 'string') return ['Configuración de campaña inválida.'];
  if (sections.some(s => !['tico', 'user'].includes(b.delegation[s]))) errors.push('Delegación inválida.');
  if (!['full_campaign', 'single_ad'].includes(b.creationMode)) errors.push('Modo inválido.');
  if (!b.metaConnectionId || !b.meta.adAccountId || !b.meta.pageId) errors.push('Selecciona tu conexión, cuenta y página.');
  if (!b.brief.businessProfile?.brandName?.trim()) errors.push('Confirma el nombre de tu negocio.');
  if (!(b.brief.goal in goalLabels)) errors.push('Objetivo inválido.');
  if (!Number.isFinite(b.brief.dailyBudget) || b.brief.dailyBudget <= 0) errors.push('Indica tu presupuesto.');
  if (!Array.isArray(b.brief.countries) || !b.brief.countries.length || b.brief.countries.some(c => !/^[A-Z]{2}$/.test(c))) errors.push('Confirma dónde vendes.');
  if (!Array.isArray(b.brief.assets)) return [...errors,'Lista de creativos inválida.'];
  if (b.brief.assets.length < 1 || b.brief.assets.length > 6) errors.push('Elige entre 1 y 6 creativos.');
  if (!Array.isArray(b.meta.adSets) || !Array.isArray(b.meta.ads)) return [...errors, 'Estructura inválida.'];
  for(const ad of b.meta.ads)if(!ad||['id','adSetId','name','headline','primaryText','description','callToAction'].some(k=>typeof (ad as any)[k]!=='string'))return [...errors,'Configuración de anuncio inválida.'];
  if (b.creationMode === 'full_campaign' && (b.meta.adSets.length < 1 || b.meta.adSets.length > 5)) errors.push('Usa entre 1 y 5 conjuntos.');
  if (b.creationMode === 'single_ad' && (!b.existingCampaignId || !b.existingAdSetId || b.meta.ads.length !== 1)) errors.push('Selecciona campaña y conjunto para tu anuncio individual.');
  if (b.meta.ads.length < 1 || b.meta.ads.length > 30) errors.push('Estructura de anuncios inválida.');
  for (const set of b.meta.adSets) {
    if (!set || typeof set.id !== 'string' || typeof set.name !== 'string' || !['all','men','women'].includes(set.gender) || !Array.isArray(set.interests) || set.interests.some(i=>typeof i!=='string') || !Array.isArray(set.locales) || !Array.isArray(set.cities) || !Array.isArray(set.regions) || !Array.isArray(set.customAudiences) || !Array.isArray(set.excludedAudiences) || !Array.isArray(set.publisherPlatforms) || !set.positions) return [...errors,'Configuración de audiencia inválida.'];
    if(set.cities.some(c=>!c||typeof c.key!=='string'||!Number.isFinite(c.radius)||c.radius<1||c.radius>50)||set.regions.some(r=>!r||typeof r.key!=='string')||set.locales.some(l=>!Number.isInteger(l)||l<1))errors.push('Revisa las ciudades, radios e idiomas.');
    if([...set.customAudiences,...set.excludedAudiences].some(id=>typeof id!=='string'||!/^\d+$/.test(id)))errors.push('Audiencia personalizada inválida.');
    if (!Number.isFinite(set.ageMin) || !Number.isFinite(set.ageMax) || set.ageMin < 18 || set.ageMax > 65 || set.ageMin > set.ageMax) errors.push('Revisa las edades de tu audiencia.');
    if (b.meta.ads.filter(ad => ad.adSetId === set.id).length > 6) errors.push('Máximo 6 anuncios por conjunto.');
  }
  if(new Set(b.meta.adSets.map(s=>s.id)).size!==b.meta.adSets.length||new Set(b.meta.ads.map(a=>a.id)).size!==b.meta.ads.length)errors.push('Hay identificadores repetidos en la estructura.');
  for(const ad of b.meta.ads)if(!ad||['id','adSetId','name','headline','primaryText','description','callToAction'].some(k=>typeof (ad as any)[k]!=='string'))return [...errors,'Configuración de anuncio inválida.'];
  for(const asset of b.brief.assets||[])if(!asset||typeof asset.uploadId!=='string'||!['image','video'].includes(asset.type))errors.push('Creativo inválido.');
  if (b.meta.budgetPeriod === 'lifetime' && !b.brief.endDate) errors.push('El presupuesto total necesita fecha de fin.');
  if (b.brief.endDate && (!Number.isFinite(Date.parse(b.brief.endDate)) || Date.parse(b.brief.endDate) <= Date.now())) errors.push('La fecha de fin debe ser futura.');
  return errors;
}
export const ticoBriefSchema = { safeParse(value: unknown) { const errors = validateBrief(value); return errors.length ? { success: false as const, errors } : { success: true as const, data: value as TicoBrief }; } };
