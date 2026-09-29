import type { TicoBrief } from './ticoBrief.js';

export const metricLabels = {
  impressions: 'Impresiones', reach: 'Alcance', link_clicks: 'Clics en el enlace',
  landing_page_views: 'Visitas a la página de destino', leads: 'Clientes potenciales',
  qualified_leads: 'Leads calificados', conversations: 'Conversaciones iniciadas',
  engagements: 'Interacciones con la publicación', purchases: 'Compras', profile_visits: 'Visitas al perfil de Instagram',
} as const;
export type MetricKey = keyof typeof metricLabels;
export function goalMetricKeys(b: TicoBrief): MetricKey[] {
  const result: MetricKey[] = ['impressions', 'reach', 'link_clicks'];
  if (b.brief.goal === 'traffic' && b.meta.optimizationGoal === 'LANDING_PAGE_VIEWS') result.push('landing_page_views');
  if (b.brief.goal === 'leads') result.push('leads');
  if (b.brief.goal === 'messages') result.push('conversations');
  if (b.brief.goal === 'engagement') result.push('engagements');
  if (b.brief.goal === 'sell_online') result.push('purchases');
  if (b.brief.goal === 'ig_profile') result.push('profile_visits');
  return result;
}
export interface GoalPlan {
  days: number;
  qualificationCriteria?: string;
  qualificationRate?: number;
  /** Explicit planning assumption, never a change to Meta's shared budget. */
  singleAdBudgetShare?: number;
}
export interface GoalPeriod { since: string; until: string; days: number; budget: number; subscriptionUntil: string | null }
export interface GoalMetric { key: MetricKey; conservative: number; expected: number; optimistic: number; assumption: string }
export interface GoalForecast {
  version: 1; id: string; createdAt: string; inputKey: string; model: string;
  period: GoalPeriod; currency: string; timezone: string; metrics: GoalMetric[];
  assumptions: string[]; explanation: string; source: 'gemini' | 'manual';
}
export type GoalActuals = Partial<Record<MetricKey, number | null>> & { spend: number | null };
export interface GoalInsightPeriod { since: string; until: string; state: 'scheduled' | 'no_delivery' | 'available'; actual: GoalActuals | null }
export interface GoalInsights { total: GoalInsightPeriod; months: (GoalInsightPeriod & { month: string })[]; effectiveStatus: string; fetchedAt: string; attribution: string }
const DAY = 86400000;
export function dayInZone(value: Date, timezone: string): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(value);
}
export function addDays(day: string, amount: number) { return new Date(Date.parse(`${day}T00:00:00Z`) + amount * DAY).toISOString().slice(0, 10); }
export function daysBetween(since: string, until: string) { return Math.round((Date.parse(`${until}T00:00:00Z`) - Date.parse(`${since}T00:00:00Z`)) / DAY) + 1; }
function configuredDay(value: string, timezone: string) {
  if (!Number.isFinite(Date.parse(value))) throw new Error('Revisa las fechas de la campaña.');
  return /^\d{4}-\d{2}-\d{2}$/.test(value) || !/(Z|[+-]\d{2}:\d{2})$/.test(value) ? value.slice(0, 10) : dayInZone(new Date(value), timezone);
}
export function goalPeriod(b: TicoBrief, subscriptionEndsAt: string | null, now = new Date()): GoalPeriod {
  const plan = b.goalPlan || { days: 30 };
  if (!Number.isInteger(plan.days) || plan.days < 1 || plan.days > 30) throw new Error('Las metas deben cubrir entre 1 y 30 días.');
  if (plan.qualificationRate !== undefined && (!Number.isFinite(plan.qualificationRate) || plan.qualificationRate < 0 || plan.qualificationRate > 100 || !plan.qualificationCriteria?.trim())) throw new Error('Define los criterios y una tasa de calificación entre 0 y 100.');
  const timezone = b.meta.timezone || 'America/Bogota';
  const today = dayInZone(now, timezone);
  const configuredStart = b.meta.startDate ? configuredDay(b.meta.startDate, timezone) : today;
  const since = configuredStart > today ? configuredStart : today;
  let until = addDays(since, plan.days - 1);
  const campaignEnd = b.brief.endDate ? configuredDay(b.brief.endDate, timezone) : null;
  if (campaignEnd && campaignEnd < until) until = campaignEnd;
  let subscriptionUntil: string | null = null;
  if (subscriptionEndsAt) {
    if (!Number.isFinite(Date.parse(subscriptionEndsAt)) || Date.parse(subscriptionEndsAt) <= now.getTime()) throw new Error('La suscripción está vencida.');
    subscriptionUntil = dayInZone(new Date(Date.parse(subscriptionEndsAt) - 1), timezone);
    if (subscriptionUntil < until) until = subscriptionUntil;
  }
  const days = daysBetween(since, until);
  if (days < 1) throw new Error('La campaña no tiene días disponibles dentro de la suscripción.');
  let daily = b.meta.budgetType === 'ABO' && b.creationMode === 'full_campaign' ? b.meta.adSets.reduce((sum, set) => sum + set.budgetAmount, 0) : b.brief.dailyBudget;
  if (b.meta.budgetPeriod === 'lifetime') {
    if (!campaignEnd || daysBetween(configuredStart, campaignEnd) < 1) throw new Error('El presupuesto total necesita fechas válidas.');
    daily /= daysBetween(configuredStart, campaignEnd);
  }
  if (b.creationMode === 'single_ad') {
    if (!Number.isFinite(plan.singleAdBudgetShare) || plan.singleAdBudgetShare! <= 0 || plan.singleAdBudgetShare! > 100) throw new Error('Indica qué porcentaje del presupuesto compartido estimas que recibirá el anuncio.');
    daily *= plan.singleAdBudgetShare! / 100;
  }
  if (!Number.isFinite(daily) || daily <= 0) throw new Error('No hay un presupuesto válido para estimar.');
  return { since, until, days, budget: Math.round(daily * days * 100) / 100, subscriptionUntil };
}
// Identical in the browser and server; includes final creatives, copy, targeting and budget.
export function forecastInputKey(b: TicoBrief): string {
  const { formStep: _step, ...input } = b;
  return stableJson(input);
}
export function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  if (value && typeof value === 'object') return `{${Object.entries(value).filter(([, v]) => v !== undefined).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => `${JSON.stringify(k)}:${stableJson(v)}`).join(',')}}`;
  return JSON.stringify(value);
}
export function forecastMonths(forecast: GoalForecast) {
  const groups: { month: string; since: string; until: string; days: number; budget: number; targets: Partial<Record<MetricKey, number>> }[] = [];
  for (let date = forecast.period.since; date <= forecast.period.until; date = addDays(date, 1)) {
    let group = groups.at(-1);
    if (!group || group.month !== date.slice(0, 7)) { group = { month: date.slice(0, 7), since: date, until: date, days: 0, budget: 0, targets: {} }; groups.push(group); }
    group.until = date; group.days++;
  }
  let elapsed = 0;
  for (const group of groups) {
    const previous = elapsed; elapsed += group.days;
    group.budget = (Math.round(forecast.period.budget * 100 * elapsed / forecast.period.days) - Math.round(forecast.period.budget * 100 * previous / forecast.period.days)) / 100;
    for (const m of forecast.metrics) group.targets[m.key] = Math.round(m.expected * elapsed / forecast.period.days) - Math.round(m.expected * previous / forecast.period.days);
  }
  return groups;
}
