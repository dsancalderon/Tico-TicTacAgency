import test from 'node:test';
import assert from 'node:assert/strict';
import { generateMetaBuilderStrategy } from './services/aiStrategist.js';
import { deployMetaBuilder } from './services/metaAds.js';
type MetaBuilderPayload = any;

test('generateMetaBuilderStrategy produces a coherent strategy with fallback when AI is unconfigured or in test mode', async () => {
  const payload: MetaBuilderPayload = {
    mode: 'full_campaign',
    brandName: 'Test Brand',
    productDescription: 'Solución SaaS de marketing digital',
    campaignName: 'Campaña Lanzamiento 2026',
    objective: 'OUTCOME_LEADS',
    specialAdCategory: 'NONE',
    budgetType: 'CBO',
    dailyBudget: 25,
    currency: 'USD',
    adSets: [
      {
        id: 'adset_1',
        name: 'Profesionales de Marketing',
        countries: ['CO', 'MX'],
        interests: ['Digital marketing', 'Social media marketing'],
        optimizationGoal: 'LEAD_GENERATION',
        billingEvent: 'IMPRESSIONS',
        delegateTargetingToAI: false
      }
    ],
    ads: [
      {
        id: 'ad_1',
        adSetId: 'adset_1',
        name: 'Anuncio Beneficios',
        headline: 'Automatiza tu Pauta Digital',
        primaryText: 'Optimiza tus presupuestos en Meta y Google con IA.',
        callToAction: 'SIGN_UP',
        destinationUrl: 'https://testbrand.com',
        delegateCopyAndCtaToAI: false
      }
    ]
  };

  const result = await generateMetaBuilderStrategy(payload);
  assert.ok(result, 'Result should not be null');
  assert.ok(result.strategySummary, 'strategySummary should be present');
  assert.ok(result.enrichedPayload, 'enrichedPayload should be present');
  assert.equal(result.enrichedPayload.brandName, 'Test Brand');
  assert.equal(result.enrichedPayload.mode, 'full_campaign');
  assert.ok(result.enrichedPayload.adSets.length > 0);
  assert.ok(result.enrichedPayload.ads.length > 0);
});

test('deployMetaBuilder validates missing existingCampaignId or existingAdSetId in single_ad mode', async () => {
  const payload: MetaBuilderPayload = {
    mode: 'single_ad',
    brandName: 'Test Brand',
    productDescription: 'Test Product',
    campaignName: '',
    objective: 'OUTCOME_SALES',
    specialAdCategory: 'NONE',
    budgetType: 'ABO',
    ads: [
      {
        id: 'ad_single',
        adSetId: '',
        name: 'Single Ad',
        headline: 'Oferta Especial',
        primaryText: 'Compra ahora con 20% de descuento.',
        callToAction: 'SHOP_NOW',
        destinationUrl: 'https://testbrand.com/shop',
        delegateCopyAndCtaToAI: false
      }
    ]
  };

  const result = await deployMetaBuilder(payload, 'fake-token', 'act_123456');
  assert.equal(result.success, false);
  assert.ok(result.error?.includes('existente'));
});

test('deployMetaBuilder enters mock simulation when running with test tokens', async () => {
  const payload: MetaBuilderPayload = {
    mode: 'full_campaign',
    brandName: 'Simulation Brand',
    productDescription: 'Simulation Test',
    campaignName: 'Test Sim Campaign',
    objective: 'OUTCOME_TRAFFIC',
    specialAdCategory: 'NONE',
    budgetType: 'ABO',
    adSets: [
      {
        id: 'as_1',
        name: 'Test Audience',
        countries: ['CO'],
        interests: ['Technology'],
        optimizationGoal: 'LINK_CLICKS',
        billingEvent: 'IMPRESSIONS',
        budgetAmount: 15,
        delegateTargetingToAI: false
      }
    ],
    ads: [
      {
        id: 'ad_1',
        adSetId: 'as_1',
        name: 'Test Ad 1',
        headline: 'Descubre más hoy',
        primaryText: 'Haz clic para visitar nuestro sitio web.',
        callToAction: 'LEARN_MORE',
        destinationUrl: 'https://simulation.test',
        delegateCopyAndCtaToAI: false
      }
    ]
  };

  // Using mock/test token triggers sandbox simulation mode
  const result = await deployMetaBuilder(payload, 'simulated_test_token', 'act_000000000000');
  assert.equal(result.success, true);
  assert.equal(result.status, 'PAUSED');
  assert.ok(result.campaignId?.startsWith('meta_cmp_'));
  assert.equal(result.adSets?.length, 1);
  assert.equal(result.ads?.length, 1);
  assert.ok(result.adsManagerUrl?.includes('adsmanager.facebook.com'));
});
