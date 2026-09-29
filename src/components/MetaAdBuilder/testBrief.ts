import { emptyBrief, mapGoal, type BusinessProfile, type BusinessSource, type TicoBrief } from '../../../server/src/domain/ticoBrief';

export const TEST_PROFILE: BusinessProfile = {
  brandName: 'Café Aurora (ejemplo)',
  industry: 'Cafetería de especialidad',
  offerSummary: 'Café de origen y pan artesanal para llevar',
  targetAudience: 'Personas adultas interesadas en café y panadería local',
  differentiators: ['Café de origen colombiano', 'Pan horneado cada mañana'],
  brandVoice: 'cercano',
  conversionChannels: [],
  fieldSources: { brandName: 'tico', industry: 'tico', offerSummary: 'tico', targetAudience: 'tico', countries: 'tico' },
  confidence: { brandName: 1, industry: 1, offerSummary: 1, targetAudience: 1, countries: 1 },
  countries: ['CO'],
  specialAdCategories: [],
};

export function createTicoTestBrief(previous: TicoBrief): TicoBrief {
  const b = emptyBrief();
  b.testMode = true;
  b.metaConnectionId = previous.metaConnectionId;
  b.meta.adAccountId = previous.meta.adAccountId;
  b.meta.pageId = previous.meta.pageId;
  b.meta.pixelId = previous.meta.pixelId;
  b.meta.currency = previous.meta.currency;
  b.meta.timezone = previous.meta.timezone;
  b.brief.businessSource = { type: 'website', url: previous.brief.businessSource.url || '' };
  b.brief.businessProfile = structuredClone(TEST_PROFILE);
  b.recommendationProfile = structuredClone(TEST_PROFILE);
  b.brief.goal = 'awareness';
  b.brief.countries = ['CO'];
  b.brief.dailyBudget = previous.brief.dailyBudget > 0 ? previous.brief.dailyBudget : b.meta.currency === 'COP' ? 30000 : 30;
  b.brief.assets = [];
  Object.assign(b.meta, mapGoal('awareness', false));
  b.meta.destinationUrl = b.brief.businessSource.url || '';
  b.meta.adSets = [{ id: 'preset-set', name: 'Audiencia inicial', budgetAmount: b.brief.dailyBudget, countries: ['CO'], ageMin: 18, ageMax: 65, gender: 'all', interests: [], locales: [], cities: [], regions: [], customAudiences: [], excludedAudiences: [], publisherPlatforms: [], positions: {} }];
  b.meta.ads = [0, 1, 2].map((i) => ({ id: `preset-ad-${i + 1}`, adSetId: 'preset-set', name: `Anuncio ${i + 1}`, angle: ['Beneficio', 'Oferta', 'Prueba social'][i], headline: 'Descubre Café Aurora', primaryText: 'Café de origen y pan artesanal para disfrutar cada día.', description: 'Un buen momento empieza aquí', callToAction: 'LEARN_MORE' }));
  return b;
}

export function testSource(type: BusinessSource['type'], url: string): BusinessSource {
  return { type, url };
}
