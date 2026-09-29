import { dayInZone, forecastMonths, type GoalForecast, type GoalActuals, type GoalInsights } from '../domain/performanceGoals.js';
import type { TicoBrief } from '../domain/ticoBrief.js';
import { graph } from './briefMeta.js';

function numeric(value: unknown): number | null { if (value === undefined || value === null || value === '') return null; const n = Number(value); return Number.isFinite(n) && n >= 0 ? n : null; }
export function normalizeGoalInsights(row: any, b: TicoBrief): GoalActuals {
  const action = (...keys: string[]) => {
    if (!Array.isArray(row.actions)) return null;
    // Aggregate and subtype actions overlap: choose the first available key, never add them.
    for (const key of keys) { const found = row.actions.find((a: any) => a.action_type === key); if (found) return numeric(found.value); }
    return 0;
  };
  return { spend: numeric(row.spend), impressions: numeric(row.impressions), reach: numeric(row.reach),
    link_clicks: numeric(row.inline_link_clicks), landing_page_views: action('landing_page_view'),
    leads: b.meta.destinationType === 'WEBSITE' ? action('offsite_conversion.fb_pixel_lead', 'lead') : action('onsite_conversion.lead_grouped', 'lead'),
    conversations: action('onsite_conversion.messaging_conversation_started_7d'),
    engagements: action('post_engagement'), purchases: action('offsite_conversion.fb_pixel_purchase', 'purchase'),
    qualified_leads: null,
    // Keep the estimate visible, but do not substitute link clicks for profile visits.
    profile_visits: null,
  };
}
export async function readGoalInsights(token: string, targetId: string, forecast: GoalForecast, b: TicoBrief, now = new Date()): Promise<GoalInsights> {
  if (!/^\d+$/.test(targetId)) throw new Error('El despliegue no contiene un identificador real de Meta.');
  const entity = await graph(token, targetId, { fields: 'id,account_id,effective_status' });
  if (`act_${String(entity.account_id).replace(/^act_/, '')}` !== b.meta.adAccountId) throw new Error('El recurso no corresponde a la cuenta de la meta.');
  const today = dayInZone(now, forecast.timezone);
  async function read(since: string, until: string) {
    if (since > today) return { since, until, state: 'scheduled' as const, actual: null };
    const through = until < today ? until : today;
    const response = await graph(token, `${targetId}/insights`, {
      fields: 'account_currency,spend,impressions,reach,inline_link_clicks,actions',
      time_range: JSON.stringify({ since, until: through }),
      action_report_time: 'impression', use_unified_attribution_setting: true,
    });
    if (!Array.isArray(response.data) || response.paging?.next || response.data.length > 1) throw new Error('Meta devolvió un resultado incompleto para el periodo.');
    const row = response.data[0];
    if (!row) return { since, until: through, state: 'no_delivery' as const, actual: null };
    if (row.account_currency !== forecast.currency) throw new Error('La moneda de Meta no coincide con la meta guardada.');
    return { since, until: through, state: 'available' as const, actual: normalizeGoalInsights(row, b) };
  }
  const total = await read(forecast.period.since, forecast.period.until);
  const months = [];
  for (const month of forecastMonths(forecast)) months.push({ month: month.month, ...await read(month.since, month.until) });
  return { total, months, effectiveStatus: entity.effective_status, fetchedAt: now.toISOString(), attribution: 'Acciones por fecha de impresión; ventana de atribución configurada en el conjunto. Meta puede revisar resultados anteriores.' };
}
