import { chooseBudgetType, mapGoal, type TicoBrief, type AdSetConfig } from '../../../server/src/domain/ticoBrief';
export function recommendGoal(b: TicoBrief) {
  const channels = b.brief.businessProfile.conversionChannels;
  if (channels.includes('checkout') && b.meta.pixelId) return 'sell_online';
  if (channels.some(c => ['whatsapp','messenger','instagram_direct'].includes(c))) return 'messages';
  return b.brief.businessSource.url ? 'traffic' : 'awareness';
}
export function recommendedSet(b: TicoBrief, index: number): AdSetConfig {
  return { id: `set_${index}`, name: `Audiencia ${index + 1}`, budgetAmount: b.brief.dailyBudget,
    countries: b.brief.countries, ageMin: 18, ageMax: 65, gender: 'all', interests: [], locales: [], cities: [], regions: [], customAudiences: [], excludedAudiences: [], publisherPlatforms: [], positions: {} };
}
export function resolveBrief(input: TicoBrief, minimum: number): TicoBrief {
  const b = structuredClone(input);
  if (b.delegation.objective === 'tico' && b.creationMode === 'full_campaign') {
    b.brief.goal = recommendGoal(b);
    const detected = b.brief.businessProfile.conversionChannels.filter(c => ['whatsapp','messenger','instagram_direct'].includes(c)) as typeof b.brief.messageChannels;
    b.brief.messageChannels = detected.length ? detected : ['messenger'];
    Object.assign(b.meta, mapGoal(b.brief.goal, !!b.meta.pixelId, b.brief.messageChannels));
  }
  if (b.delegation.specialCategory === 'tico') b.meta.specialAdCategories = b.brief.businessProfile.specialAdCategories;
  if (b.delegation.bid === 'tico') { b.meta.bidStrategy = 'LOWEST_COST_WITHOUT_CAP'; b.meta.bidAmount = undefined; }
  if (b.delegation.tracking === 'tico') { b.meta.destinationUrl = b.brief.businessSource.url || b.meta.destinationUrl; b.meta.urlTags = 'utm_source=meta&utm_medium=paid&utm_campaign={{campaign.name}}&utm_content={{ad.name}}'; }
  const count = b.creationMode === 'single_ad' ? 0 : b.delegation.structure === 'tico' ? 1 : Math.max(1, b.meta.adSets.length);
  const sets = Array.from({ length: count }, (_, i) => b.meta.adSets[i] || recommendedSet(b,i));
  b.meta.adSets = sets.map((s,i) => ({ ...(b.delegation.audience === 'tico' ? { ...recommendedSet(b,i), id:s.id, name:s.name } : s),
    ...(b.delegation.placements === 'tico' ? { publisherPlatforms: [], positions: {} } : { publisherPlatforms:s.publisherPlatforms, positions:s.positions }),
    budgetAmount: b.delegation.budget === 'tico' ? b.brief.dailyBudget / count : s.budgetAmount }));
  if (b.delegation.budget === 'tico') { b.meta.budgetType = chooseBudgetType(count,b.brief.dailyBudget,minimum); b.meta.budgetPeriod = 'daily'; }
  const adCount = b.creationMode === 'single_ad' ? 1 : b.delegation.structure === 'tico' ? 3 : Math.max(1, Math.min(6, Math.round(b.meta.ads.length / Math.max(count,1))));
  b.meta.ads = Array.from({ length: Math.max(count,1) * adCount }, (_, i) => {
    const old = b.meta.ads[i]; const asset = b.brief.assets[i % Math.max(1,b.brief.assets.length)];
    return { id: old?.id || `ad_${i}`, adSetId: sets[Math.floor(i/adCount)]?.id || b.existingAdSetId || '', name: old?.name || `Anuncio ${i+1}`,
      angle: old?.angle || asset?.angle || ['Beneficio','Oferta','Prueba social'][i%3], headline: old ? old.headline : b.brief.businessProfile.brandName, primaryText: old ? old.primaryText : b.brief.businessProfile.offerSummary, description: old ? old.description : b.brief.businessProfile.industry,
      callToAction: old?.callToAction ?? mapGoal(b.brief.goal,!!b.meta.pixelId,b.brief.messageChannels).cta,
      uploadId: old?.uploadId && b.brief.assets.some(a => a.uploadId === old.uploadId) ? old.uploadId : asset?.uploadId };
  });
  return b;
}
