import type { MetaBuilderPayload, MetaCallToAction, MetaSpecialAdCategory } from '../types';
import type { TicoBrief } from '../../server/src/domain/ticoBrief';

export function toLegacyPayload(b: TicoBrief): MetaBuilderPayload {
  const p = b.brief.businessProfile;
  return { ticoBrief: b, mode: b.creationMode, brandName: p.brandName, industry: p.industry,
    targetAudience: p.targetAudience, additionalNotes: p.offerSummary, websiteUrl: b.meta.destinationUrl,
    adAccountId: b.meta.adAccountId, pageId: b.meta.pageId, pixelId: b.meta.pixelId,
    existingCampaignId: b.existingCampaignId, existingAdSetId: b.existingAdSetId,
    campaignName: b.meta.namingTemplate.replace('{marca}', p.brandName).replace('{objetivo}', b.brief.goal).replace('{país}', b.brief.countries.join('-')).replace('{AAAAMMDD}', new Date().toISOString().slice(0, 10).replaceAll('-', '')),
    objective: b.meta.objective, specialAdCategory: (b.meta.specialAdCategories[0] || 'NONE') as MetaSpecialAdCategory,
    budgetType: b.meta.budgetType, totalBudget: b.brief.dailyBudget, currency: b.meta.currency,
    cboDistribution: 'auto', bidStrategy: b.meta.bidStrategy,
    adSets: b.meta.adSets.map(s => ({ ...s, startDate: b.meta.startDate || '', endDate: b.brief.endDate,
      isContinuous: !b.brief.endDate, optimizationGoal: b.meta.optimizationGoal, attributionWindow: '7_day_click_1_day_view',
      delegateAudienceToTico: b.delegation.audience === 'tico', cities: '', languages: '', interestsDescription: s.interests.join(', '),
      placementType: b.delegation.placements === 'tico' ? 'advantage_plus' : 'manual' })),
    ads: b.meta.ads.map(a => ({ ...a, conceptAngle: a.angle, destinationUrl: b.meta.destinationUrl,
      urlParameters: b.meta.urlTags, delegateCopysToTico: b.delegation.copys === 'tico', callToAction: a.callToAction as MetaCallToAction })) };
}
