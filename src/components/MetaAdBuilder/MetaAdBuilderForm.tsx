import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  Layers, 
  Target, 
  Plus, 
  Trash2, 
  ShieldAlert, 
  DollarSign, 
  Bot, 
  Wand2, 
  RefreshCw, 
  ArrowRight,
  ArrowLeft,
  Save,
  Info,
  Share2,
  FileText
} from 'lucide-react';
import type { 
  MetaBuilderPayload, 
  MetaFormMode, 
  MetaSpecialAdCategory, 
  MetaBudgetType, 
  MetaAdSetFormItem, 
  MetaAdFormItem, 
  MetaCallToAction,
  MetaConnectionState 
} from '../../types';
import { fetchMetaCampaignsApi, fetchMetaAdSetsApi } from '../../services/api';

interface MetaAdBuilderFormProps {
  metaState?: MetaConnectionState;
  onSubmit: (payload: MetaBuilderPayload) => void;
  isLoading: boolean;
  initialData?: MetaBuilderPayload | null;
  onSaveDraft?: (payload: MetaBuilderPayload) => void;
  onCancel?: () => void;
}

export const MetaAdBuilderForm: React.FC<MetaAdBuilderFormProps> = ({
  metaState,
  onSubmit,
  isLoading,
  initialData,
  onSaveDraft,
  onCancel
}) => {
  // 1. Selector inicial de modo
  const [mode, setMode] = useState<MetaFormMode>(initialData?.mode || 'full_campaign');

  // Metadatos de Campaña
  const [brandName, setBrandName] = useState(initialData?.brandName || 'UrbanFit Athletics');
  const [campaignName, setCampaignName] = useState(initialData?.campaignName || '[TICO] UrbanFit — Pauta Q1 Performance');
  const [objective, setObjective] = useState(initialData?.objective || 'OUTCOME_SALES');
  const [specialAdCategory, setSpecialAdCategory] = useState<MetaSpecialAdCategory>(initialData?.specialAdCategory || 'NONE');
  
  // Presupuesto Campaña
  const [budgetType, setBudgetType] = useState<MetaBudgetType>(initialData?.budgetType || 'CBO');
  const [totalBudget, setTotalBudget] = useState(initialData?.totalBudget || 500);
  const [currency, setCurrency] = useState(initialData?.currency || 'USD');
  const [cboDistribution, setCboDistribution] = useState<'auto' | 'manual_limits'>(initialData?.cboDistribution || 'auto');
  const [bidStrategy, setBidStrategy] = useState(initialData?.bidStrategy || 'LOWEST_COST_WITHOUT_CAP');

  // Modo Anuncio Individual
  const [existingCampaigns, setExistingCampaigns] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedCampaignId, setSelectedCampaignId] = useState(initialData?.existingCampaignId || '');
  const [existingAdSets, setExistingAdSets] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedAdSetId, setSelectedAdSetId] = useState(initialData?.existingAdSetId || '');
  const [isLoadingCampaigns, setIsLoadingCampaigns] = useState(false);
  const [isLoadingAdSets, setIsLoadingAdSets] = useState(false);

  // Conjuntos de Anuncios (AdSets dinámicos)
  const defaultAdSet: MetaAdSetFormItem = {
    id: 'adset_1',
    name: 'Audiencia Intereses Fitness & Crossfit',
    budgetAmount: 250,
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    isContinuous: false,
    optimizationGoal: 'OFFSITE_CONVERSIONS',
    attributionWindow: '7_day_click_1_day_view',
    delegateAudienceToTico: true,
    countries: ['CO'],
    cities: '',
    ageMin: 22,
    ageMax: 50,
    gender: 'all',
    languages: 'Español',
    interestsDescription: 'Hombres y mujeres interesados en crossfit, running, nutrición deportiva y estilo de vida activo',
    placementType: 'advantage_plus'
  };

  const [adSets, setAdSets] = useState<MetaAdSetFormItem[]>(initialData?.adSets || [defaultAdSet]);

  // Anuncios dinámicos
  const defaultAd1: MetaAdFormItem = {
    id: 'ad_1',
    adSetId: 'adset_1',
    name: 'Anuncio 01 — Oferta Gancho Colección',
    conceptAngle: '20% OFF Primera Compra',
    destinationUrl: 'https://urbanfit.example.com',
    urlParameters: 'utm_source=meta&utm_medium=cpc&utm_campaign=urbanfit_q1',
    delegateCopysToTico: true,
    primaryText: '',
    headline: '',
    description: '',
    callToAction: 'SHOP_NOW'
  };

  const defaultAd2: MetaAdFormItem = {
    id: 'ad_2',
    adSetId: 'adset_1',
    name: 'Anuncio 02 — Prueba Social & Rendimiento',
    conceptAngle: 'Material Transpirable de Alta Resistencia',
    destinationUrl: 'https://urbanfit.example.com',
    urlParameters: 'utm_source=meta&utm_medium=cpc&utm_campaign=urbanfit_q1',
    delegateCopysToTico: true,
    primaryText: '',
    headline: '',
    description: '',
    callToAction: 'SHOP_NOW'
  };

  const [ads, setAds] = useState<MetaAdFormItem[]>(initialData?.ads || [defaultAd1, defaultAd2]);

  // Carga de campañas existentes en modo Anuncio Individual
  useEffect(() => {
    if (mode === 'single_ad') {
      loadCampaigns();
    }
  }, [mode]);

  // Carga de AdSets cuando se selecciona una campaña en modo Anuncio Individual
  useEffect(() => {
    if (mode === 'single_ad' && selectedCampaignId) {
      loadAdSets(selectedCampaignId);
    }
  }, [selectedCampaignId, mode]);

  const loadCampaigns = async () => {
    setIsLoadingCampaigns(true);
    try {
      const res = await fetchMetaCampaignsApi(metaState?.adAccountId, metaState?.userAccessToken);
      if (res.campaigns && res.campaigns.length > 0) {
        setExistingCampaigns(res.campaigns);
        if (!selectedCampaignId) {
          setSelectedCampaignId(res.campaigns[0].id);
        }
      }
    } catch (e) {
      console.error('Error fetching campaigns:', e);
    } finally {
      setIsLoadingCampaigns(false);
    }
  };

  const loadAdSets = async (campaignId: string) => {
    setIsLoadingAdSets(true);
    try {
      const res = await fetchMetaAdSetsApi(campaignId, metaState?.adAccountId, metaState?.userAccessToken);
      if (res.adSets && res.adSets.length > 0) {
        setExistingAdSets(res.adSets);
        if (!selectedAdSetId || !res.adSets.some((a: { id: string }) => a.id === selectedAdSetId)) {
          setSelectedAdSetId(res.adSets[0].id);
        }
      } else {
        setExistingAdSets([]);
      }
    } catch (e) {
      console.error('Error fetching ad sets:', e);
    } finally {
      setIsLoadingAdSets(false);
    }
  };

  // Restricciones automáticas de Categoría Especial
  const isSpecialCategoryActive = specialAdCategory !== 'NONE';

  // Manejadores de AdSets
  const handleAddAdSet = () => {
    const newId = `adset_${adSets.length + 1}`;
    const newAdSet: MetaAdSetFormItem = {
      ...defaultAdSet,
      id: newId,
      name: `Conjunto de Anuncios 0${adSets.length + 1}`
    };
    setAdSets([...adSets, newAdSet]);
  };

  const handleRemoveAdSet = (id: string) => {
    if (adSets.length <= 1) return;
    const filtered = adSets.filter(s => s.id !== id);
    setAdSets(filtered);
    // Reasignar anuncios que apuntaban a este AdSet al primero disponible
    const fallbackId = filtered[0].id;
    setAds(ads.map(a => a.adSetId === id ? { ...a, adSetId: fallbackId } : a));
  };

  const handleUpdateAdSet = (id: string, updates: Partial<MetaAdSetFormItem>) => {
    setAdSets(adSets.map(s => s.id === id ? { ...s, ...updates } : s));
  };

  // Manejadores de Anuncios
  const handleAddAd = () => {
    const newId = `ad_${ads.length + 1}`;
    const newAd: MetaAdFormItem = {
      ...defaultAd1,
      id: newId,
      name: `Anuncio 0${ads.length + 1}`,
      adSetId: adSets[0]?.id || 'adset_1'
    };
    setAds([...ads, newAd]);
  };

  const handleRemoveAd = (id: string) => {
    if (ads.length <= 1) return;
    setAds(ads.filter(a => a.id !== id));
  };

  const handleUpdateAd = (id: string, updates: Partial<MetaAdFormItem>) => {
    setAds(ads.map(a => a.id === id ? { ...a, ...updates } : a));
  };

  // Autocompletar Ejemplo
  const handleLoadPreset = () => {
    setBrandName('Nova Glow Cosméticos');
    setCampaignName('[TICO] Nova Glow — Pauta Retargeting & Nuevos Clientes');
    setObjective('OUTCOME_SALES');
    setSpecialAdCategory('NONE');
    setBudgetType('CBO');
    setTotalBudget(800);
    setCurrency('USD');
    setAdSets([
      {
        id: 'adset_1',
        name: 'Audiencia Skincare, Belleza & Rutinas Faciales',
        budgetAmount: 400,
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        isContinuous: false,
        optimizationGoal: 'OFFSITE_CONVERSIONS',
        attributionWindow: '7_day_click_1_day_view',
        delegateAudienceToTico: true,
        countries: ['CO', 'MX'],
        cities: '',
        ageMin: 20,
        ageMax: 48,
        gender: 'women',
        languages: 'Español',
        interestsDescription: 'Mujeres que buscan productos veganos para cuidado facial, sérums hidratantes y protector solar',
        placementType: 'advantage_plus'
      }
    ]);
    setAds([
      {
        id: 'ad_1',
        adSetId: 'adset_1',
        name: 'Anuncio 01 — Sérum Ácido Hialurónico',
        conceptAngle: 'Hidratación 24H y 15% Descuento',
        destinationUrl: 'https://novaglow.example.com',
        urlParameters: 'utm_source=meta&utm_medium=cpc&utm_campaign=novaglow_q1',
        delegateCopysToTico: true,
        primaryText: '',
        headline: '',
        description: '',
        callToAction: 'SHOP_NOW'
      },
      {
        id: 'ad_2',
        adSetId: 'adset_1',
        name: 'Anuncio 02 — Rutina Glow Express',
        conceptAngle: 'Kit Completo con Envío Gratis',
        destinationUrl: 'https://novaglow.example.com',
        urlParameters: 'utm_source=meta&utm_medium=cpc&utm_campaign=novaglow_q1',
        delegateCopysToTico: true,
        primaryText: '',
        headline: '',
        description: '',
        callToAction: 'SHOP_NOW'
      }
    ]);
  };

  const getPayload = (): MetaBuilderPayload => ({
    mode,
    brandName,
    adAccountId: metaState?.adAccountId,
    pageId: metaState?.pageId,
    pixelId: metaState?.pixelId,
    existingCampaignId: mode === 'single_ad' ? selectedCampaignId : undefined,
    existingCampaignName: mode === 'single_ad' ? existingCampaigns.find(c => c.id === selectedCampaignId)?.name : undefined,
    existingAdSetId: mode === 'single_ad' ? selectedAdSetId : undefined,
    existingAdSetName: mode === 'single_ad' ? existingAdSets.find(a => a.id === selectedAdSetId)?.name : undefined,
    campaignName,
    objective,
    specialAdCategory,
    budgetType,
    totalBudget,
    currency,
    cboDistribution,
    bidStrategy,
    adSets: mode === 'full_campaign' ? adSets : [],
    ads: mode === 'single_ad' ? [ads[0]] : ads
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(getPayload());
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200/90 p-6 md:p-10 shadow-sm relative overflow-hidden space-y-8">
      {/* Aura decorativa */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-blue-50/70 rounded-full blur-3xl pointer-events-none -z-0" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-indigo-50/60 rounded-full blur-3xl pointer-events-none -z-0" />

      {/* Cabecera Principal */}
      <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-slate-100">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-bold mb-2">
            <Share2 className="w-3.5 h-3.5" />
            <span>Meta Ads Campaign Builder • Marketing API v21.0</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight font-['Outfit']">
            Constructor Avanzado de Pauta
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-2xl leading-relaxed">
            Configura una campaña completa o un anuncio individual. Puedes diligenciar los parámetros manualmente o marcar <strong>"Dejar que Tico lo defina"</strong> para formular la pauta con IA.
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start lg:self-auto flex-wrap">
          {(onSaveDraft || onCancel) && (
            <button
              type="button"
              onClick={() => {
                if (onSaveDraft) {
                  onSaveDraft(getPayload());
                } else if (onCancel) {
                  onCancel();
                }
              }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-all shadow-2xs cursor-pointer hover:border-slate-300"
              title="Guardar como borrador y volver a Mis Campañas"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-slate-600" />
              <span>Guardar Borrador y Salir</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleLoadPreset}
            className="flex items-center gap-2 px-4 py-2.5 rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-all shadow-2xs cursor-pointer hover:border-slate-300"
          >
            <Wand2 className="w-3.5 h-3.5 text-blue-600" />
            <span>Autocompletar Ejemplo</span>
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="relative z-10 space-y-8">
        {/* ========================================================================= */}
        {/* SECCIÓN 1: SELECTOR DE MODO (CAMPAÑA COMPLETA vs ANUNCIO INDIVIDUAL)      */}
        {/* ========================================================================= */}
        <div className="space-y-3">
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
            1. ¿Qué deseas implementar en Meta Ads?
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() => setMode('full_campaign')}
              className={`p-5 rounded-2xl border text-left transition-all cursor-pointer flex items-start gap-4 ${
                mode === 'full_campaign'
                  ? 'border-blue-600 bg-blue-50/60 ring-2 ring-blue-600/20 shadow-xs'
                  : 'border-slate-200 bg-slate-50/60 hover:bg-white'
              }`}
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                mode === 'full_campaign' ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-600'
              }`}>
                <Layers className="w-5 h-5" />
              </div>
              <div>
                <div className="font-extrabold text-slate-900 text-sm font-['Outfit']">
                  Campaña Completa Nueva
                </div>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Crea la estructura completa desde cero: 1 Campaña + uno o varios Conjuntos de anuncios + Múltiples Anuncios.
                </p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setMode('single_ad')}
              className={`p-5 rounded-2xl border text-left transition-all cursor-pointer flex items-start gap-4 ${
                mode === 'single_ad'
                  ? 'border-blue-600 bg-blue-50/60 ring-2 ring-blue-600/20 shadow-xs'
                  : 'border-slate-200 bg-slate-50/60 hover:bg-white'
              }`}
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                mode === 'single_ad' ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-600'
              }`}>
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <div className="font-extrabold text-slate-900 text-sm font-['Outfit']">
                  Anuncio Individual
                </div>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Inserta una nueva pieza publicitaria dentro de una Campaña y Conjunto de anuncios ya existentes en tu cuenta.
                </p>
              </div>
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* SECCIÓN 2 (SI MODO === 'single_ad'): SELECTOR DE CAMPAÑA & ADSET EXISTENTE */}
        {/* ========================================================================= */}
        {mode === 'single_ad' && (
          <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200/80">
              <span className="text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <Target className="w-4 h-4 text-blue-600" />
                <span>Ubicación del Anuncio en Meta Ads</span>
              </span>
              <button
                type="button"
                onClick={loadCampaigns}
                disabled={isLoadingCampaigns}
                className="text-xs text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1.5 cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoadingCampaigns ? 'animate-spin' : ''}`} />
                <span>Recargar campañas</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Selecciona la Campaña Existente <span className="text-rose-500">*</span>
                </label>
                <select
                  value={selectedCampaignId}
                  onChange={(e) => setSelectedCampaignId(e.target.value)}
                  disabled={isLoadingCampaigns || existingCampaigns.length === 0}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-blue-600 font-medium"
                >
                  {existingCampaigns.map(c => (
                    <option key={c.id} value={c.id}>{c.name} ({c.id})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Selecciona el Conjunto de Anuncios Destino <span className="text-rose-500">*</span>
                </label>
                <select
                  value={selectedAdSetId}
                  onChange={(e) => setSelectedAdSetId(e.target.value)}
                  disabled={isLoadingAdSets || existingAdSets.length === 0}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-blue-600 font-medium"
                >
                  {existingAdSets.map(a => (
                    <option key={a.id} value={a.id}>{a.name} ({a.id})</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* SECCIÓN 3 (SI MODO === 'full_campaign'): NIVEL CAMPAÑA                   */}
        {/* ========================================================================= */}
        {mode === 'full_campaign' && (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 space-y-6 shadow-2xs">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <span className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">
                  1
                </span>
                <h3 className="font-extrabold text-slate-900 text-base font-['Outfit']">
                  Nivel 1: Configuración de la Campaña
                </h3>
              </div>
              <span className="text-[11px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600">
                Objeto: /campaigns
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Nombre de la Marca <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={brandName}
                  onChange={(e) => setBrandName(e.target.value)}
                  placeholder="Ej. UrbanFit Athletics"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-900 focus:bg-white focus:border-blue-600 focus:outline-none font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Nombre de la Campaña en Meta <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={campaignName}
                  onChange={(e) => setCampaignName(e.target.value)}
                  placeholder="[TICO] Marca - Objetivo - Fecha"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-900 focus:bg-white focus:border-blue-600 focus:outline-none font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Objetivo Publicitario (ODAX Meta)
                </label>
                <select
                  value={objective}
                  onChange={(e) => setObjective(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-900 focus:bg-white focus:border-blue-600 focus:outline-none font-medium"
                >
                  <option value="OUTCOME_SALES">Ventas / Conversiones en Sitio Web</option>
                  <option value="OUTCOME_LEADS">Clientes Potenciales (Leads / WhatsApp / Formularios)</option>
                  <option value="OUTCOME_TRAFFIC">Tráfico al Sitio Web o Landing Page</option>
                  <option value="OUTCOME_ENGAGEMENT">Interacción (Mensajes / Publicaciones / Reproducciones)</option>
                  <option value="OUTCOME_AWARENESS">Reconocimiento y Alcance de Marca</option>
                  <option value="OUTCOME_APP_PROMOTION">Promoción e Instalación de App</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Categoría Especial de Anuncios
                </label>
                <select
                  value={specialAdCategory}
                  onChange={(e) => setSpecialAdCategory(e.target.value as MetaSpecialAdCategory)}
                  className={`w-full border rounded-xl px-4 py-2.5 text-xs font-medium focus:outline-none ${
                    isSpecialCategoryActive ? 'bg-amber-50 border-amber-300 text-amber-900' : 'bg-slate-50 border-slate-200 text-slate-900'
                  }`}
                >
                  <option value="NONE">Ninguna (Pauta comercial general estándar)</option>
                  <option value="HOUSING">Vivienda / Bienes Raíces</option>
                  <option value="EMPLOYMENT">Empleo / Ofertas de Trabajo</option>
                  <option value="CREDIT">Crédito / Servicios Financieros y Préstamos</option>
                  <option value="ISSUES_ELECTIONS_POLITICS">Temas Sociales, Elecciones o Política</option>
                </select>
              </div>
            </div>

            {/* Aviso de Categoría Especial */}
            {isSpecialCategoryActive && (
              <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-2.5 text-xs text-amber-900">
                <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span>
                  <strong>Restricción de Meta activa:</strong> Al declarar categoría <code>{specialAdCategory}</code>, Meta exige fijar la edad en 18-65+, el género en "Todos" y prohíbe la exclusión de zonas o códigos postales específicos.
                </span>
              </div>
            )}

            {/* Configuración de Presupuesto CBO vs ABO */}
            <div className="pt-4 border-t border-slate-100 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                    Tipo de Presupuesto
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Define si el presupuesto se gestiona a nivel de campaña o por conjunto.
                  </span>
                </div>

                <div className="flex rounded-xl p-1 bg-slate-100 text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => setBudgetType('CBO')}
                    className={`px-3.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                      budgetType === 'CBO' ? 'bg-white text-blue-700 shadow-2xs font-extrabold' : 'text-slate-600'
                    }`}
                  >
                    Advantage+ Budget (CBO)
                  </button>
                  <button
                    type="button"
                    onClick={() => setBudgetType('ABO')}
                    className={`px-3.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                      budgetType === 'ABO' ? 'bg-white text-blue-700 shadow-2xs font-extrabold' : 'text-slate-600'
                    }`}
                  >
                    Presupuesto por Conjunto (ABO)
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    {budgetType === 'CBO' ? 'Presupuesto Total de Campaña' : 'Presupuesto Total Estimado'} <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <DollarSign className="w-4 h-4 text-emerald-600 absolute left-3 top-2.5" />
                    <input
                      type="number"
                      min="50"
                      step="10"
                      required
                      value={totalBudget}
                      onChange={(e) => setTotalBudget(Number(e.target.value))}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-20 py-2 text-xs font-bold text-slate-900 focus:bg-white focus:border-blue-600 focus:outline-none"
                    />
                    <select
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value)}
                      className="absolute right-1.5 top-1 bg-white text-[11px] font-bold text-slate-700 rounded-lg px-2 py-1 border border-slate-200"
                    >
                      <option value="USD">USD ($)</option>
                      <option value="COP">COP ($)</option>
                      <option value="EUR">EUR (€)</option>
                      <option value="MXN">MXN ($)</option>
                    </select>
                  </div>
                </div>

                {budgetType === 'CBO' && (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Reparto CBO entre Conjuntos
                    </label>
                    <select
                      value={cboDistribution}
                      onChange={(e) => setCboDistribution(e.target.value as any)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:bg-white focus:border-blue-600 focus:outline-none font-medium"
                    >
                      <option value="auto">Optimización Automática de Meta (Recomendado)</option>
                      <option value="manual_limits">Límites Mín/Máx por Conjunto</option>
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Estrategia de Puja
                  </label>
                  <select
                    value={bidStrategy}
                    onChange={(e) => setBidStrategy(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:bg-white focus:border-blue-600 focus:outline-none font-medium"
                  >
                    <option value="LOWEST_COST_WITHOUT_CAP">Mayor Volumen al Menor Costo</option>
                    <option value="COST_CAP">Control de Costo por Acción (Cost Cap)</option>
                    <option value="BID_CAP">Puja Máxima en Subasta (Bid Cap)</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* SECCIÓN 4 (SI MODO === 'full_campaign'): NIVEL CONJUNTOS DE ANUNCIOS     */}
        {/* ========================================================================= */}
        {mode === 'full_campaign' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 font-['Outfit'] flex items-center gap-2">
                  <span className="w-7 h-7 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center font-bold text-xs">
                    2
                  </span>
                  <span>Nivel 2: Conjuntos de Anuncios ({adSets.length})</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Define las audiencias, ubicaciones y presupuestos individuales si no usas CBO.
                </p>
              </div>

              <button
                type="button"
                onClick={handleAddAdSet}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs font-bold border border-purple-200 transition-colors cursor-pointer self-start sm:self-auto"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Agregar Conjunto de Anuncios</span>
              </button>
            </div>

            <div className="space-y-5">
              {adSets.map((adset, index) => (
                <div key={adset.id} className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 space-y-5 shadow-2xs">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <span className="text-xs font-bold text-slate-900 flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-slate-900 text-white flex items-center justify-center text-[10px]">
                        {index + 1}
                      </span>
                      <span>Conjunto: {adset.name}</span>
                    </span>

                    {adSets.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveAdSet(adset.id)}
                        className="text-xs text-rose-600 hover:text-rose-800 flex items-center gap-1 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Eliminar</span>
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Nombre del Conjunto</label>
                      <input
                        type="text"
                        value={adset.name}
                        onChange={(e) => handleUpdateAdSet(adset.id, { name: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:bg-white focus:border-blue-600 focus:outline-none"
                      />
                    </div>

                    {budgetType === 'ABO' && (
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Presupuesto Diario (ABO)</label>
                        <div className="relative">
                          <DollarSign className="w-3.5 h-3.5 text-emerald-600 absolute left-3 top-2.5" />
                          <input
                            type="number"
                            value={adset.budgetAmount || 50}
                            onChange={(e) => handleUpdateAdSet(adset.id, { budgetAmount: Number(e.target.value) })}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-3 py-2 text-xs font-bold text-slate-900 focus:bg-white focus:border-blue-600 focus:outline-none"
                          />
                        </div>
                      </div>
                    )}

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Optimización</label>
                      <select
                        value={adset.optimizationGoal}
                        onChange={(e) => handleUpdateAdSet(adset.id, { optimizationGoal: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:bg-white focus:border-blue-600 focus:outline-none"
                      >
                        <option value="OFFSITE_CONVERSIONS">Conversiones Web (Purchase / Lead)</option>
                        <option value="LEAD_GENERATION">Formularios Nativos de Meta</option>
                        <option value="LANDING_PAGE_VIEWS">Visitas a la Landing Page</option>
                        <option value="LINK_CLICKS">Clics en el Enlace</option>
                        <option value="CONVERSATIONS">Mensajes / WhatsApp</option>
                      </select>
                    </div>
                  </div>

                  {/* Delegación de Audiencia a Tico */}
                  <div className="p-4 rounded-xl bg-purple-50/60 border border-purple-100 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Bot className="w-4 h-4 text-purple-600" />
                        <span className="text-xs font-bold text-purple-950">
                          🪄 Dejar que Tico defina la Audiencia y Segmentación
                        </span>
                      </div>
                      <input
                        type="checkbox"
                        checked={adset.delegateAudienceToTico}
                        onChange={(e) => handleUpdateAdSet(adset.id, { delegateAudienceToTico: e.target.checked })}
                        className="w-4 h-4 text-purple-600 rounded border-slate-300 focus:ring-purple-500 cursor-pointer"
                      />
                    </div>

                    {adset.delegateAudienceToTico ? (
                      <p className="text-[11px] text-purple-900 leading-relaxed">
                        Tico IA formulará los intereses afines, geografía y datos demográficos en base al nicho de <strong>{brandName}</strong> y a las políticas de Meta.
                      </p>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-600 mb-1">Países (ISO)</label>
                          <input
                            type="text"
                            value={adset.countries.join(', ')}
                            onChange={(e) => handleUpdateAdSet(adset.id, { countries: e.target.value.split(',').map(s => s.trim().toUpperCase()) })}
                            placeholder="CO, MX"
                            className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-mono"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-slate-600 mb-1">Edades</label>
                          <div className="flex items-center gap-1.5">
                            <input
                              type="number"
                              disabled={isSpecialCategoryActive}
                              value={isSpecialCategoryActive ? 18 : adset.ageMin}
                              onChange={(e) => handleUpdateAdSet(adset.id, { ageMin: Number(e.target.value) })}
                              className="w-1/2 bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs"
                            />
                            <span className="text-xs text-slate-400">-</span>
                            <input
                              type="number"
                              disabled={isSpecialCategoryActive}
                              value={isSpecialCategoryActive ? 65 : adset.ageMax}
                              onChange={(e) => handleUpdateAdSet(adset.id, { ageMax: Number(e.target.value) })}
                              className="w-1/2 bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-slate-600 mb-1">Género</label>
                          <select
                            disabled={isSpecialCategoryActive}
                            value={isSpecialCategoryActive ? 'all' : adset.gender}
                            onChange={(e) => handleUpdateAdSet(adset.id, { gender: e.target.value as any })}
                            className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs"
                          >
                            <option value="all">Todos</option>
                            <option value="men">Hombres</option>
                            <option value="women">Mujeres</option>
                          </select>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* SECCIÓN 5: NIVEL ANUNCIOS (DINÁMICOS O INDIVIDUAL)                        */}
        {/* ========================================================================= */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-extrabold text-slate-900 font-['Outfit'] flex items-center gap-2">
                <span className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs">
                  {mode === 'full_campaign' ? '3' : '2'}
                </span>
                <span>Nivel Anuncios ({mode === 'full_campaign' ? ads.length : '1 Anuncio Individual'})</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Define los conceptos, enlaces de destino y copys. Las imágenes se adjuntan en la siguiente pantalla de revisión.
              </p>
            </div>

            {mode === 'full_campaign' && (
              <button
                type="button"
                onClick={handleAddAd}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold border border-emerald-200 transition-colors cursor-pointer self-start sm:self-auto"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Agregar Variante de Anuncio</span>
              </button>
            )}
          </div>

          <div className="space-y-5">
            {ads.map((ad, index) => (
              <div key={ad.id} className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 space-y-5 shadow-2xs">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <span className="text-xs font-bold text-slate-900 flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-emerald-700 text-white flex items-center justify-center text-[10px]">
                      {index + 1}
                    </span>
                    <span>Anuncio: {ad.name}</span>
                  </span>

                  {mode === 'full_campaign' && ads.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveAd(ad.id)}
                      className="text-xs text-rose-600 hover:text-rose-800 flex items-center gap-1 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Eliminar</span>
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {mode === 'full_campaign' && (
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Conjunto de Anuncios Destino
                      </label>
                      <select
                        value={ad.adSetId}
                        onChange={(e) => handleUpdateAd(ad.id, { adSetId: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:bg-white focus:border-blue-600 focus:outline-none font-medium"
                      >
                        {adSets.map(s => (
                          <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Concepto o Ángulo de Venta
                    </label>
                    <input
                      type="text"
                      value={ad.conceptAngle}
                      onChange={(e) => handleUpdateAd(ad.id, { conceptAngle: e.target.value })}
                      placeholder="Ej. Descuento 20% / Dolor vs Solución"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:bg-white focus:border-blue-600 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      URL de Destino
                    </label>
                    <input
                      type="url"
                      required
                      value={ad.destinationUrl}
                      onChange={(e) => handleUpdateAd(ad.id, { destinationUrl: e.target.value })}
                      placeholder="https://tumarca.com"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:bg-white focus:border-blue-600 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Delegación de Copys a Tico */}
                <div className="p-4 rounded-xl bg-emerald-50/60 border border-emerald-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Bot className="w-4 h-4 text-emerald-700" />
                      <span className="text-xs font-bold text-emerald-950">
                        🪄 Dejar que Tico redacte los Copys y seleccione el CTA
                      </span>
                    </div>
                    <input
                      type="checkbox"
                      checked={ad.delegateCopysToTico}
                      onChange={(e) => handleUpdateAd(ad.id, { delegateCopysToTico: e.target.checked })}
                      className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer"
                    />
                  </div>

                  {ad.delegateCopysToTico ? (
                    <p className="text-[11px] text-emerald-900 leading-relaxed">
                      Tico IA redactará titulares de alto impacto, textos persuasivos (fórmulas AIDA/PAS) y seleccionará el botón de llamada a la acción óptimo para este anuncio.
                    </p>
                  ) : (
                    <div className="space-y-3 pt-2">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">Texto Principal (Copy)</label>
                        <textarea
                          rows={2}
                          value={ad.primaryText}
                          onChange={(e) => handleUpdateAd(ad.id, { primaryText: e.target.value })}
                          placeholder="Escribe el texto persuasivo principal del anuncio..."
                          className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-xs"
                        />
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">Titular (Headline)</label>
                          <input
                            type="text"
                            value={ad.headline}
                            onChange={(e) => handleUpdateAd(ad.id, { headline: e.target.value })}
                            placeholder="Titular corto y llamativo..."
                            className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">Botón (CTA)</label>
                          <select
                            value={ad.callToAction}
                            onChange={(e) => handleUpdateAd(ad.id, { callToAction: e.target.value as MetaCallToAction })}
                            className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-semibold"
                          >
                            <option value="LEARN_MORE">Más información (LEARN_MORE)</option>
                            <option value="SHOP_NOW">Comprar ahora (SHOP_NOW)</option>
                            <option value="SIGN_UP">Registrarte (SIGN_UP)</option>
                            <option value="CONTACT_US">Contactar (CONTACT_US)</option>
                            <option value="WHATSAPP_MESSAGE">Enviar WhatsApp (WHATSAPP_MESSAGE)</option>
                            <option value="GET_OFFER">Obtener oferta (GET_OFFER)</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Nota sobre la asignación posterior de imágenes */}
                <div className="flex items-center gap-2 text-[11px] text-slate-500 bg-slate-50 p-2.5 rounded-lg border border-slate-200/80">
                  <Info className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  <span>
                    El diseño o imagen visual (1:1 o 9:16) se adjuntará en la pantalla de revisión una vez que apruebes los copys estructurados por Tico.
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ========================================================================= */}
        {/* BOTÓN FINAL DE FORMULACIÓN                                               */}
        {/* ========================================================================= */}
        <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-center gap-3">
          {onSaveDraft && (
            <button
              type="button"
              disabled={isLoading}
              onClick={() => onSaveDraft(getPayload())}
              className="w-full sm:w-auto py-4 px-6 rounded-2xl border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold text-sm tracking-wide transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Save className="w-4 h-4 text-slate-500" />
              <span>Guardar como Borrador</span>
            </button>
          )}
          <button
            type="submit"
            disabled={isLoading}
            className="flex-1 w-full py-4 px-6 rounded-2xl bg-slate-950 hover:bg-slate-800 text-white font-bold text-sm tracking-wide shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2.5 disabled:opacity-50 cursor-pointer"
          >
            {isLoading ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Tico está analizando la configuración y formulando los anuncios...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5 text-blue-400" />
                <span>Formular Estrategia y Pasar a Revisión de Creativos</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
