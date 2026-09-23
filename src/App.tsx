import { supabase, loadUserSession } from './services/auth';
import { useState, useEffect, useRef, useCallback } from 'react';
import { loadWorkspace, saveWorkspace, saveConnection, saveCampaign, restoreStrategy } from './services/workspace';
import { Header } from './components/Header';
import { BriefingForm } from './components/BriefingForm';
import { MetaAdBuilderForm } from './components/MetaAdBuilder/MetaAdBuilderForm';
import { StrategyPreview } from './components/StrategyPreview';
import { DeploymentConsole } from './components/DeploymentConsole';
import { TicoLogo } from './components/TicoLogo';
import { AuthModal } from './components/AuthModal';
import { DashboardLayout } from './components/Dashboard/DashboardLayout';
import { HomeOverview } from './components/Dashboard/HomeOverview';
import { UnifiedConnections } from './components/Dashboard/UnifiedConnections';
import { AssetDashboard } from './components/Dashboard/AssetDashboard';
import type {
  ClientBriefing,
  GeneratedCampaignStrategy,
  UserSession,
  MetaConnectionState,
  GoogleConnectionState,
  CreditTransaction,
  DashboardTab,
  MetaBuilderPayload
} from './types';
import { 
  checkBackendHealth, 
  generateStrategyApi, 
  deployCampaignApi, 
  generateMetaBuilderStrategyApi, 
  deployMetaBuilderApi 
} from './services/api';
import {
  ArrowRight,
  Sparkles,
  ShieldCheck,
  ExternalLink,
  ChevronRight,
  Share2,
  FolderKanban,
  FileCheck2,
  Lock,
  Layers
} from 'lucide-react';
import { TicoLoader } from './components/TicoLoader';
import { forceResetScroll } from './utils/scrollLock';

export function App() {
  const [backendOnline, setBackendOnline] = useState<boolean>(false);
  const [currentStep, setCurrentStep] = useState<'briefing' | 'strategy' | 'deployed'>('briefing');
  const [builderMode, setBuilderMode] = useState<'meta_builder' | 'quick_brief'>('meta_builder');
  const [isLoadingStrategy, setIsLoadingStrategy] = useState<boolean>(false);
  const [isDeploying, setIsDeploying] = useState<boolean>(false);
  const [strategy, setStrategy] = useState<GeneratedCampaignStrategy | null>(null);
  const [deployResult, setDeployResult] = useState<any>(null);

  // Sesión de Usuario
  const [userSession, setUserSession] = useState<UserSession | null>(null);
  const [savedBrief, setSavedBrief] = useState<ClientBriefing | null>(null);
  const [workspaceOwner, setWorkspaceOwner] = useState<string | null>(null);
  const [workspaceError, setWorkspaceError] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState('');
  const [workspaceRetry, setWorkspaceRetry] = useState(0);
  const activeOwner = useRef<string | null>(null);
  const saveVersion = useRef(0);
  const initialMeta = useRef<MetaConnectionState | null>(null);
  const initialGoogle = useRef<GoogleConnectionState | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [pendingBrief, setPendingBrief] = useState<ClientBriefing | null>(null);
  const [authModalTitle, setAuthModalTitle] = useState<string | undefined>(undefined);
  const [authModalSubtitle, setAuthModalSubtitle] = useState<string | undefined>(undefined);
  const [authNotice, setAuthNotice] = useState<string | null>(null);

  // Estado de Navegación del Dashboard (5 Secciones)
  const [dashboardTab, setDashboardTab] = useState<DashboardTab>('home');
  const [isCreditsModalOpen, setIsCreditsModalOpen] = useState<boolean>(false);

  // Estado de Conexión de Google Ads
  const [googleState, setGoogleState] = useState<GoogleConnectionState>({
    isConnected: false,
    status: 'disconnected',
    customerId: '',
    customerName: '',
    mccId: '',
    developerTokenStatus: 'approved',
    diagnostics: [
      'Google Ads API desconectado. Ingresa tu Customer ID (CID) para orquestar pauta en Google Search y PMax.'
    ]
  });

  // Estado de Conexión de Meta Ads
  // Estado de Conexión con Meta Ads API (inicializado en desconectado según requerimiento)
  const [metaState, setMetaState] = useState<MetaConnectionState>({
    isConnected: false,
    status: 'disconnected',
    userAccessToken: '',
    businessManagerId: '',
    businessManagerName: '',
    adAccountId: '',
    adAccountName: '',
    pixelId: '',
    pixelName: '',
    pageId: '',
    pageName: '',
    permissions: {
      adsManagement: false,
      pagesReadEngagement: false,
      businessManagement: false
    },
    diagnostics: [
      'La cuenta se encuentra desconectada. Vincula tu Token de Acceso de Meta o activa el modo demostrativo para comenzar.'
    ]
  });

  // Historial de Transacciones de Créditos
  const [creditTransactions, setCreditTransactions] = useState<CreditTransaction[]>([]);

  // Historial de Campañas Desplegadas
  const [deployedCampaignsList, setDeployedCampaignsList] = useState<GeneratedCampaignStrategy[]>([]);
  const handleStrategyChange = useCallback((updated: GeneratedCampaignStrategy) => {
    setStrategy(updated);
    setDeployedCampaignsList(previous => previous.map(item => item.id === updated.id ? updated : item));
  }, []);

  useEffect(() => {
    initialMeta.current ??= metaState;
    initialGoogle.current ??= googleState;
    const owner = userSession?.id || null;
    activeOwner.current = owner;
    setWorkspaceOwner(null); setWorkspaceError(null); setSaveStatus('');
    setSavedBrief(null); setStrategy(null); setDeployResult(null); setCurrentStep('briefing'); setDashboardTab('home');
    setDeployedCampaignsList([]); setCreditTransactions([]);
    setMetaState(initialMeta.current); setGoogleState(initialGoogle.current);
    if (!owner) return;
    let cancelled = false;
    loadWorkspace(owner).then(data => {
      if (cancelled) return;
      setSavedBrief(data.draft.briefing); setStrategy(data.draft.strategy);
      setCurrentStep(data.draft.strategy ? 'strategy' : 'briefing');
      if (data.meta) setMetaState(data.meta);
      if (data.google) setGoogleState(data.google);
      setDeployedCampaignsList(data.campaigns); setCreditTransactions(data.transactions);
      setUserSession(previous => previous?.id === owner ? { ...previous, credits: data.credits } : previous);
      setWorkspaceOwner(owner);
    }).catch(error => { if (!cancelled) setWorkspaceError(error.message); });
    return () => { cancelled = true; activeOwner.current = null; };
  }, [userSession?.id, workspaceRetry]);

  useEffect(() => {
    if (!workspaceOwner || workspaceOwner !== userSession?.id || isLoadingStrategy || isDeploying) return;
    const owner = workspaceOwner;
    const version = ++saveVersion.current;
    setSaveStatus('Guardando…');
    const timer = window.setTimeout(() => {
      saveWorkspace(owner, { briefing: savedBrief, strategy, step: currentStep }).then(() => {
        if (activeOwner.current === owner && version === saveVersion.current) setSaveStatus('Cambios guardados');
      }).catch(error => {
        if (activeOwner.current === owner && version === saveVersion.current) setSaveStatus(error.message);
      });
    }, 500);
    return () => window.clearTimeout(timer);
  }, [workspaceOwner, userSession?.id, savedBrief, strategy, currentStep, isLoadingStrategy, isDeploying]);

  const persistConnection = async (platform: 'meta' | 'google', state: MetaConnectionState | GoogleConnectionState) => {
    const owner = userSession?.id;
    if (!owner || workspaceOwner !== owner) return;
    try {
      await saveConnection(owner, platform, state);
      if (activeOwner.current !== owner) return;
      if (platform === 'meta') setMetaState(state as MetaConnectionState);
      else setGoogleState(state as GoogleConnectionState);
      setSaveStatus('Conexión guardada');
    } catch (error) {
      if (activeOwner.current === owner) setSaveStatus(error instanceof Error ? error.message : 'No se pudo guardar la conexión.');
    }
  };

  // Estado de la pantalla de carga animada de Tico
  const [isAppLoaded, setIsAppLoaded] = useState<boolean>(false);
  const [showLoader, setShowLoader] = useState<boolean>(true);

  // Carga inicial y persistencia de sesión
  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.get('auth') === 'confirmed') {
      setAuthNotice('¡Correo confirmado correctamente! Tu cuenta ya está activa.');
      setAuthModalTitle('¡Correo Confirmado!');
      setAuthModalSubtitle('Tu cuenta ha sido activada con éxito. Inicia sesión con tus credenciales para acceder.');
      setIsAuthModalOpen(true);
      url.searchParams.delete('auth');
      window.history.replaceState({}, document.title, `${url.pathname}${url.search}${url.hash}`);
    }
    const timer = setTimeout(() => {
      setIsAppLoaded(true);
    }, 2000);

    localStorage.removeItem('tico_user_session');
    let active = true;
    let generation = 0;
    const subscription = supabase?.auth.onAuthStateChange((_event, session) => {
      const current = ++generation;
      if (!session) { setUserSession(null); return; }
      // Defer network work until the SDK's auth callback has released its lock.
      setTimeout(() => {
        if (!active || current !== generation) return;
        loadUserSession().then(user => {
          if (active && current === generation) setUserSession(user);
        }).catch(() => { if (active && current === generation) setUserSession(null); });
      }, 0);
    }).data.subscription;

    checkBackendHealth().then((status) => setBackendOnline(status));
    return () => { active = false; generation++; subscription?.unsubscribe(); clearTimeout(timer); };
  }, []);

  // Rotating keyword para el Hero (palabras concisas con transición sutil)
  const keywords = [
    'estrategia',
    'publicidad',
    'campaña',
    'pauta digital',
    'inversión'
  ];
  const [activeKeywordIndex, setActiveKeywordIndex] = useState(0);
  const [isKeywordFading, setIsKeywordFading] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setIsKeywordFading(true);
      setTimeout(() => {
        setActiveKeywordIndex((prev) => (prev + 1) % keywords.length);
        setIsKeywordFading(false);
      }, 300);
    }, 3200);
    return () => clearInterval(interval);
  }, [keywords.length]);

  // Manejo de Brief desde el Sandbox o Dashboard
  const handleBriefSubmit = async (brief: ClientBriefing) => {
    // Si el usuario no está autenticado (viene del sandbox en la landing):
    if (!userSession?.isAuthenticated) {
      setPendingBrief(brief);
      setAuthModalTitle('Inicia sesión para generar tu estrategia');
      setAuthModalSubtitle('Para estructurar tu plan publicitario y asignarle créditos a tu marca, inicia sesión con tu cuenta y correo confirmado.');
      setIsAuthModalOpen(true);
      return;
    }

    // Usuario autenticado: procesar la estrategia de pauta
    setDashboardTab('agent');
    setIsLoadingStrategy(true);
    const owner = userSession.id;
    try {
      await saveWorkspace(owner, { briefing: brief, strategy: null, step: 'briefing' });
      const generated = await generateStrategyApi(brief);
      if (activeOwner.current !== owner) return;
      const identified = { ...generated, id: crypto.randomUUID() };
      await saveCampaign(owner, identified);
      await saveWorkspace(owner, { briefing: brief, strategy: identified, step: 'strategy' });
      if (activeOwner.current !== owner) return;
      setSavedBrief(brief); setStrategy(identified);
      setDeployedCampaignsList(previous => [identified, ...previous]);
      setCurrentStep('strategy');
      const el = document.getElementById('workflow-container');
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'No se pudo generar la estrategia.');
    } finally {
      setIsLoadingStrategy(false);
    }
  };

  // Login exitoso
  const handleAuthSuccess = (session: UserSession) => {
    setUserSession(session);
    setIsAuthModalOpen(false);
    forceResetScroll();
  };

  useEffect(() => {
    if (userSession?.isAuthenticated) {
      setIsAuthModalOpen(false);
      forceResetScroll();
    }
  }, [userSession?.isAuthenticated]);

  useEffect(() => {
    if (userSession && workspaceOwner === userSession.id && pendingBrief) {
      const brief = pendingBrief;
      setPendingBrief(null);
      void handleBriefSubmit(brief);
    }
  }, [userSession, workspaceOwner, pendingBrief]);

  useEffect(() => {
    if (!userSession) {
      setStrategy(null); setDeployResult(null); setDeployedCampaignsList([]);
      setCreditTransactions([]); setCurrentStep('briefing'); setDashboardTab('home');
      setMetaState(previous => ({
        ...previous, isConnected: false, status: 'disconnected',
        userAccessToken: '', adAccountId: '', adAccountName: '', businessManagerId: '',
        businessManagerName: '', pixelId: '', pixelName: '', pageId: '', pageName: '',
        permissions: { adsManagement: false, pagesReadEngagement: false, businessManagement: false }, diagnostics: []
      }));
    }
  }, [userSession?.id]);

  // Desconexión / Cerrar Sesión
  const handleLogout = async () => {
    if (workspaceOwner && workspaceOwner === userSession?.id) {
      try { await saveWorkspace(workspaceOwner, { briefing: savedBrief, strategy, step: currentStep }); }
      catch { window.alert('No se pudieron guardar tus cambios. Reintenta antes de cerrar sesión.'); return; }
    }
    const result = await supabase?.auth.signOut({ scope: 'local' });
    if (result?.error) { window.alert('No se pudo cerrar la sesión. Inténtalo de nuevo.'); return; }
    setPendingBrief(null);
    localStorage.removeItem('tico_user_session');
    setUserSession(null);
    setCurrentStep('briefing');
    setStrategy(null);
    forceResetScroll();
  };

  // Aprobación de Campaña y Débito de Créditos
  const handleApproveStrategy = async (strategyToDeploy: GeneratedCampaignStrategy) => {
    if (!userSession || workspaceOwner !== userSession.id) return;
    const owner = userSession.id;
    setIsDeploying(true);

    try {
      let result: any;
      if (strategyToDeploy.metaBuilderPayload) {
        const deployResponse = await deployMetaBuilderApi(
          strategyToDeploy.metaBuilderPayload,
          metaState.userAccessToken,
          metaState.adAccountId
        );
        result = {
          success: deployResponse.success,
          deployedAt: new Date().toISOString(),
          results: {
            meta: {
              mode: deployResponse.mode,
              status: deployResponse.status || 'PAUSED',
              campaignId: deployResponse.campaignId,
              adsetId: deployResponse.adSets?.[0]?.metaId || deployResponse.adSetId,
              adId: deployResponse.ads?.[0]?.metaId || deployResponse.adId,
              message: deployResponse.message,
              adsManagerUrl: deployResponse.adsManagerUrl
            }
          }
        };
      } else {
        result = await deployCampaignApi(strategyToDeploy);
      }

      if (activeOwner.current !== owner) return;
      setDeployResult(result);
      setCurrentStep('deployed');

      const recorded = { 
        ...strategyToDeploy, 
        deployedMetaCampaignId: result.results?.meta?.campaignId,
        deployedGoogleCampaignId: result.results?.google?.campaignId, 
        status: 'approved' as const 
      };
      const id = await saveCampaign(owner, recorded, result);
      if (activeOwner.current !== owner) return;
      setStrategy({ ...recorded, id });
      setDeployedCampaignsList(previous => [{ ...recorded, id }, ...previous.filter(item => item.id !== id)]);

      const el = document.getElementById('workflow-container');
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'No se pudo desplegar la campaña.');
    } finally {
      setIsDeploying(false);
    }
  };

  // Manejo de envío desde el MetaAdBuilderForm
  const handleMetaBuilderSubmit = async (payload: MetaBuilderPayload) => {
    if (!userSession?.isAuthenticated) {
      setAuthModalTitle('Inicia sesión para estructurar tu pauta');
      setAuthModalSubtitle('Para formular tus anuncios con Tico IA y desplegarlos en Meta Ads, inicia sesión con tu cuenta.');
      setIsAuthModalOpen(true);
      return;
    }

    setDashboardTab('agent');
    setIsLoadingStrategy(true);
    const owner = userSession.id;

    try {
      const { strategy: generated, enrichedPayload } = await generateMetaBuilderStrategyApi(payload);
      if (activeOwner.current !== owner) return;
      const identified = { ...generated, id: crypto.randomUUID(), metaBuilderPayload: enrichedPayload };
      await saveCampaign(owner, identified);
      await saveWorkspace(owner, { briefing: savedBrief, strategy: identified, step: 'strategy' });
      if (activeOwner.current !== owner) return;
      setStrategy(identified);
      setDeployedCampaignsList(previous => [identified, ...previous]);
      setCurrentStep('strategy');
      const el = document.getElementById('workflow-container');
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'No se pudo generar la estrategia de Meta Ads.');
    } finally {
      setIsLoadingStrategy(false);
    }
  };

  // Recarga de Créditos
  const handleAddCredits = (_amount: number) => {
    window.alert('Las recargas estarán disponibles cuando se integre el sistema de créditos.');
  };

  const handleResetStudio = () => {
    setStrategy(null);
    setDeployResult(null);
    setCurrentStep('briefing');
  };

  const scrollToBriefing = () => {
    const el = document.getElementById('briefing-section');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  // =========================================================================
  // VISTA 1: PLATAFORMA / DASHBOARD AUTENTICADO
  // =========================================================================
  if (userSession?.isAuthenticated) {
    if (workspaceOwner !== userSession.id) return (
      <main className="min-h-screen grid place-items-center bg-slate-50 p-6">
        <div role="status" className="text-center space-y-4">
          <p>{workspaceError || 'Cargando tu espacio y tus datos…'}</p>
          {workspaceError && <button className="rounded-full bg-slate-950 text-white px-6 py-2" onClick={() => setWorkspaceRetry(value => value + 1)}>Reintentar</button>}
          <button className="block mx-auto text-sm underline" onClick={handleLogout}>Cerrar sesión</button>
        </div>
      </main>
    );
    return (
      <DashboardLayout
        userSession={userSession}
        metaState={metaState}
        googleState={googleState}
        creditTransactions={creditTransactions}
        onAddCredits={handleAddCredits}
        onLogout={handleLogout}
        activeTab={dashboardTab}
        onSelectTab={setDashboardTab}
        isCreditsModalOpen={isCreditsModalOpen}
        onCreditsModalOpenChange={setIsCreditsModalOpen}
      >
        <div className="mb-4 flex gap-3 items-center text-xs text-slate-600">
          <span role="status">{saveStatus}</span>
          <button type="button" className="underline" onClick={() => {
            const owner = userSession.id;
            setSaveStatus('Guardando…');
            void saveWorkspace(owner, { briefing: savedBrief, strategy, step: currentStep })
              .then(() => { if (activeOwner.current === owner) setSaveStatus('Cambios guardados'); })
              .catch(error => { if (activeOwner.current === owner) setSaveStatus(error.message); });
          }}>Guardar ahora</button>
        </div>
        {authNotice && (
          <div role="status" className="mb-6 flex items-center justify-between gap-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-900">
            <span>{authNotice}</span>
            <button type="button" onClick={() => setAuthNotice(null)} className="text-emerald-700 hover:text-emerald-950 cursor-pointer">Cerrar</button>
          </div>
        )}

        {/* 1. SECCIÓN INICIO: RESUMEN ESTADO, PASOS PENDIENTES Y CRÉDITOS DISPONIBLES */}
        {dashboardTab === 'home' && (
          <HomeOverview
            userSession={userSession}
            metaState={metaState}
            googleState={googleState}
            creditTransactions={creditTransactions}
            deployedCampaignsCount={deployedCampaignsList.length}
            onNavigateTab={setDashboardTab}
            onOpenCreditsModal={() => setIsCreditsModalOpen(true)}
            onAddCredits={handleAddCredits}
          />
        )}

        {dashboardTab === 'agent' && (
          <div className="space-y-8" id="workflow-container">
            {/* Stepper indicators */}
            <div className="max-w-2xl mx-auto grid grid-cols-3 gap-3 text-left mb-6">
              <div
                className={`p-3.5 rounded-2xl border transition-all ${currentStep === 'briefing'
                  ? 'border-slate-950 bg-slate-950 text-white shadow-md'
                  : 'border-slate-200 bg-white text-slate-600'
                  }`}
              >
                <div className="flex items-center gap-2 text-xs font-bold">
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-black ${currentStep === 'briefing' ? 'bg-white text-slate-950' : 'bg-slate-100 text-slate-700'
                    }`}>1</span>
                  <span>Briefing</span>
                </div>
                <p className={`text-[11px] mt-1 ${currentStep === 'briefing' ? 'text-slate-300' : 'text-slate-400'}`}>
                  Marca & presupuesto
                </p>
              </div>

              <div
                className={`p-3.5 rounded-2xl border transition-all ${currentStep === 'strategy'
                  ? 'border-slate-950 bg-slate-950 text-white shadow-md'
                  : 'border-slate-200 bg-white text-slate-600'
                  }`}
              >
                <div className="flex items-center gap-2 text-xs font-bold">
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-black ${currentStep === 'strategy' ? 'bg-white text-slate-950' : 'bg-slate-100 text-slate-700'
                    }`}>2</span>
                  <span>Plan & Creativos</span>
                </div>
                <p className={`text-[11px] mt-1 ${currentStep === 'strategy' ? 'text-slate-300' : 'text-slate-400'}`}>
                  Copies, piezas & Excel
                </p>
              </div>

              <div
                className={`p-3.5 rounded-2xl border transition-all ${currentStep === 'deployed'
                  ? 'border-emerald-600 bg-emerald-600 text-white shadow-md'
                  : 'border-slate-200 bg-white text-slate-600'
                  }`}
              >
                <div className="flex items-center gap-2 text-xs font-bold">
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-black ${currentStep === 'deployed' ? 'bg-white text-emerald-800' : 'bg-slate-100 text-slate-700'
                    }`}>3</span>
                  <span>Despliegue PAUSED</span>
                </div>
                <p className={`text-[11px] mt-1 ${currentStep === 'deployed' ? 'text-emerald-100' : 'text-slate-400'}`}>
                  Meta Graph API
                </p>
              </div>
            </div>

            {/* Dynamic Step Content */}
            {currentStep === 'briefing' && (
              <div className="space-y-6">
                {/* Switcher de Modos: Meta Ads Builder vs Briefing General */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-2 bg-slate-100/90 rounded-2xl border border-slate-200/90">
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setBuilderMode('meta_builder')}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                        builderMode === 'meta_builder'
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                      }`}
                    >
                      <Share2 className="w-3.5 h-3.5" />
                      <span>Meta Ads Builder (Campaña / Anuncio con Tico IA)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setBuilderMode('quick_brief')}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                        builderMode === 'quick_brief'
                          ? 'bg-slate-950 text-white shadow-xs'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                      }`}
                    >
                      <Layers className="w-3.5 h-3.5" />
                      <span>Briefing General Rápido (Meta + Google)</span>
                    </button>
                  </div>
                  <span className="text-[11px] text-slate-500 font-medium px-2">
                    {builderMode === 'meta_builder' ? 'Jerarquía oficial Campaña → AdSet → Anuncio' : 'Estrategia rápida'}
                  </span>
                </div>

                {builderMode === 'meta_builder' ? (
                  <MetaAdBuilderForm
                    metaState={metaState}
                    onSubmit={handleMetaBuilderSubmit}
                    isLoading={isLoadingStrategy}
                  />
                ) : (
                  <BriefingForm
                    initialData={savedBrief}
                    onDraftChange={setSavedBrief}
                    onSubmit={handleBriefSubmit}
                    isLoading={isLoadingStrategy}
                    submitButtonText="Formular Plan de Pauta con TICO"
                  />
                )}
              </div>
            )}

            {currentStep === 'strategy' && strategy && (
              <StrategyPreview
                key={strategy.id || strategy.briefingId}
                onChange={handleStrategyChange}
                strategy={strategy}
                onApprove={handleApproveStrategy}
                onBack={() => setCurrentStep('briefing')}
                isDeploying={isDeploying}
                userCredits={userSession.credits}
              />
            )}

            {currentStep === 'deployed' && strategy && (
              <DeploymentConsole
                strategy={strategy}
                deployResult={deployResult}
                onReset={handleResetStudio}
                creditsRemaining={userSession.credits}
              />
            )}
          </div>
        )}

        {/* 3. SECCIÓN CONEXIONES: CONEXIÓN TANTO DE META COMO DE GOOGLE */}
        {dashboardTab === 'connections' && (
          <UnifiedConnections
            metaState={metaState}
            onUpdateMetaState={state => void persistConnection('meta', state)}
            googleState={googleState}
            onUpdateGoogleState={state => void persistConnection('google', state)}
          />
        )}

        {/* 4. SECCIÓN CAMPAÑAS: APARTADO DE CAMPAÑAS DESPLEGADAS EN PAUSA */}
        {dashboardTab === 'campaigns' && (
          <div className="bg-white rounded-3xl border border-slate-200/90 p-6 md:p-8 shadow-xs space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-xl font-extrabold text-slate-900 font-['Outfit']">
                  Mis campañas
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Estrategias y campañas guardadas en tu espacio.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setDashboardTab('agent');
                  setCurrentStep('briefing');
                }}
                className="px-4 py-2 rounded-full bg-slate-950 hover:bg-slate-800 text-white text-xs font-bold transition-all cursor-pointer"
              >
                + Nueva Campaña
              </button>
            </div>

            {deployedCampaignsList.length > 0 ? (
              <div className="divide-y divide-slate-100">
                {deployedCampaignsList.map((c, idx) => (
                  <div key={idx} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-sm">{c.brandName}</span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                          {c.deployedMetaCampaignId?.includes('sandbox') || c.deployedGoogleCampaignId?.includes('sandbox') ? 'DEMO' : c.deployedMetaCampaignId || c.deployedGoogleCampaignId ? 'PAUSED' : 'BORRADOR'}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        ID Meta: <code className="font-mono text-slate-700">{c.deployedMetaCampaignId || 'Sin desplegar'}</code> • Presupuesto: ${c.totalBudget.toLocaleString()} {c.currency}
                      </div>
                    </div>

                    <button type="button" className="text-sm font-semibold text-indigo-600" onClick={() => {
                      const owner = userSession.id;
                      void restoreStrategy(c).then(restored => {
                        if (activeOwner.current !== owner) return;
                        setStrategy(restored); setCurrentStep('strategy'); setDashboardTab('agent');
                      }).catch(() => setSaveStatus('No se pudo abrir la estrategia. Inténtalo de nuevo.'));
                    }}>Abrir estrategia</button>
                    <a
                      href="https://adsmanager.facebook.com"
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-800 hover:underline"
                    >
                      <span>Abrir en Meta Ads Manager</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-10 text-center border border-dashed border-slate-200 rounded-2xl">
                <FolderKanban className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="text-xs font-semibold text-slate-700">No hay campañas guardadas todavía</p>
                <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                  Ve a la sección <strong>"Tico Agent"</strong> para ingresar un brief y formular tu primera campaña publicitaria en pausa.
                </p>
              </div>
            )}
          </div>
        )}

        {/* 5. SECCIÓN DASHBOARDS: DASHBOARDS CON LOS DATOS ACTUALES DE CADA ACTIVO */}
        {dashboardTab === 'dashboards' && (
          <AssetDashboard
            metaState={metaState}
            googleState={googleState}
          />
        )}
      </DashboardLayout>
    );
  }

  // =========================================================================
  // VISTA 2: LANDING PAGE PÚBLICA + SANDBOX GUIADO (TIC TAC PERFORMANCE)
  // =========================================================================
  return (
    <div className="min-h-screen bg-white text-slate-900 flex flex-col font-['Plus_Jakarta_Sans'] selection:bg-indigo-600 selection:text-white">
      {/* Pantalla de carga animada de Tico */}
      {showLoader && (
        <TicoLoader
          forceMotion
          isLoaded={isAppLoaded}
          minDuration={1200}
          onFinish={() => setShowLoader(false)}
        />
      )}

      {/* Modal de Autenticación Flexible */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onSuccess={handleAuthSuccess}
        customTitle={authModalTitle}
        customSubtitle={authModalSubtitle}
      />

      {/* Top Navbar */}
      <Header
        backendOnline={backendOnline}
        userSession={userSession}
        onOpenLogin={() => {
          setAuthModalTitle('Inicia sesión');
          setAuthModalSubtitle(undefined);
          setIsAuthModalOpen(true);
        }}
        onGoToPlatform={() => setDashboardTab('home')}
        onOpenNewCampaign={scrollToBriefing}
      />

      {authNotice && (
        <div role="status" className="max-w-5xl mx-auto w-full px-4 pt-4">
          <div className="flex items-center justify-between gap-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-3.5 text-sm font-semibold text-emerald-900 shadow-xs animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="flex items-center gap-2.5">
              <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>{authNotice}</span>
            </div>
            <button
              type="button"
              onClick={() => setAuthNotice(null)}
              className="text-emerald-700 hover:text-emerald-950 font-bold text-xs px-2 py-1 rounded-lg hover:bg-emerald-100 transition-colors cursor-pointer"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* HERO SECTION: ENFOQUE REAL EN PAUTA Y PUBLICIDAD DE PERFORMANCE           */}
      {/* ========================================================================= */}
      <section className="relative overflow-hidden pt-1 sm:pt-8 pb-24 sm:pb-32 bg-white">

        {/* Subtle prismatic beam background */}
        <div
          className="absolute -bottom-24 right-[-10%] sm:right-[-5%] w-[850px] h-[550px] pointer-events-none -z-0 opacity-85"
          style={{
            background: 'linear-gradient(125deg, rgba(34, 197, 94, 0.15) 0%, rgba(56, 189, 248, 0.45) 20%, rgba(99, 102, 241, 0.45) 45%, rgba(192, 132, 252, 0.45) 70%, rgba(244, 114, 182, 0.35) 90%, rgba(251, 191, 36, 0.25) 100%)',
            filter: 'blur(75px)',
            transform: 'rotate(-16deg)'
          }}
        />

        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">

          {/* MAIN HERO HEADLINE */}
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold text-slate-900 tracking-tight font-['Outfit'] leading-[1.15]">
            <span>Deja tu{' '}</span>
            <span className="relative inline-block whitespace-nowrap">
              <span
                className={`inline-block transition-all duration-300 ease-out transform ${isKeywordFading
                  ? 'opacity-0 -translate-y-2 scale-95 blur-[1px]'
                  : 'opacity-100 translate-y-0 scale-100 blur-0'
                  }`}
              >
                <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
                  {keywords[activeKeywordIndex]}
                </span>
              </span>
              <span className="absolute left-0 -bottom-1 sm:-bottom-2 w-full h-1 sm:h-1.5 bg-gradient-to-r from-blue-500/40 via-indigo-500/40 to-purple-500/40 rounded-full transition-all duration-300" />
            </span>
            <br className="hidden sm:inline" />
            <span> en manos de TICO</span>
          </h1>

          {/* Subhead based on README */}
          <h2 className="text-2xl sm:text-4xl lg:text-5xl font-extrabold text-slate-800 tracking-tight font-['Outfit'] mt-4 sm:mt-6">
            Planeación e Implementación Publicitaria con IA
          </h2>

          <p className="mt-4 sm:mt-5 text-base sm:text-lg text-slate-600 max-w-3xl mx-auto leading-relaxed font-normal">
            Transforma un brief, documentos de marca y presupuesto en un plan publicitario editable. Asigna creativos y orquesta tus campañas en <strong>Meta Ads en estado pausado</strong> para revisión y activación humana garantizada.
          </p>

          {/* Action Buttons */}
          <div className="mt-8 sm:mt-10 flex flex-col sm:flex-row items-center justify-center gap-3.5 sm:gap-4">
            <a
              href="#briefing-section"
              onClick={scrollToBriefing}
              className="w-full sm:w-auto inline-flex items-center justify-center px-8 py-3.5 sm:py-4 rounded-full bg-slate-950 hover:bg-slate-800 text-white font-semibold text-sm sm:text-base shadow-sm hover:shadow-md transition-all gap-2 group cursor-pointer"
            >
              <span>Probar Sandbox Guiado</span>
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </a>

            <button
              type="button"
              onClick={() => {
                setAuthModalTitle('Inicia sesión');
                setAuthModalSubtitle(undefined);
                setIsAuthModalOpen(true);
              }}
              className="w-full sm:w-auto inline-flex items-center justify-center px-8 py-3.5 sm:py-4 rounded-full border border-slate-300 hover:border-slate-400 bg-white hover:bg-slate-50 text-slate-800 font-semibold text-sm sm:text-base transition-all shadow-2xs cursor-pointer gap-2"
            >
              <Lock className="w-4 h-4 text-slate-500" />
              <span>Iniciar Sesión / Registro</span>
            </button>
          </div>

          {/* Trust Banner Bar */}
          <div className="mt-14 pt-8 border-t border-slate-100 grid grid-cols-2 md:grid-cols-4 gap-6 text-left">
            <div>
              <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-['Outfit']">6 Años</div>
              <p className="text-xs text-slate-500 mt-0.5">Experiencia publicitaria de agencia</p>
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-['Outfit']">Estado PAUSED</div>
              <p className="text-xs text-slate-500 mt-0.5">Control humano previo a activación</p>
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-['Outfit']">Exportación</div>
              <p className="text-xs text-slate-500 mt-0.5">Planes listos en Excel (.xlsx)</p>
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-['Outfit']">100% Oficial</div>
              <p className="text-xs text-slate-500 mt-0.5">Conectores Graph API & Google Ads</p>
            </div>
          </div>

        </div>
      </section>

      {/* ========================================================================= */}
      {/* TRES PILARES / PROPUESTA DE VALOR REAL TIC TAC PERFORMANCE                */}
      {/* ========================================================================= */}
      <section id="por-que-tico" className="py-20 bg-slate-50 border-y border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white border border-slate-200 text-slate-700 text-xs font-semibold mb-3 shadow-2xs">
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
              <span>Metodología TicTac Agency Performance</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 font-['Outfit'] tracking-tight">
              Diseñado para reducir fricción entre el brief y la pauta activa
            </h2>
            <p className="mt-3 text-slate-600 text-sm sm:text-base">
              TICO automatiza la configuración técnica manteniendo el criterio estratégico y el control del presupuesto en manos del equipo.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Pilar 1 */}
            <div className="bg-white rounded-3xl p-8 border border-slate-200/90 shadow-sm hover:shadow-md transition-all">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold mb-6">
                <FileCheck2 className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 font-['Outfit'] mb-2">
                De Brief a Plan Editable
              </h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                Estructura propuestas de copies, segmentaciones, objetivos y presupuestos proporcionales sin inventar métricas y con descarga a Excel.
              </p>
              <div className="mt-6 pt-4 border-t border-slate-100 flex items-center gap-2 text-xs font-semibold text-indigo-600">
                <span>Exportable a .xlsx</span>
                <ChevronRight className="w-4 h-4" />
              </div>
            </div>

            {/* Pilar 2 */}
            <div className="bg-white rounded-3xl p-8 border border-slate-200/90 shadow-sm hover:shadow-md transition-all">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold mb-6">
                <Share2 className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 font-['Outfit'] mb-2">
                Conexión Oficial con Meta Ads
              </h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                Vinculación directa con tu cuenta publicitaria, validación en tiempo real de permisos (ads_management) y orquestación en estado PAUSED.
              </p>
              <div className="mt-6 pt-4 border-t border-slate-100 flex items-center gap-2 text-xs font-semibold text-blue-600">
                <span>Facebook Business Ready</span>
                <ChevronRight className="w-4 h-4" />
              </div>
            </div>

            {/* Pilar 3 */}
            <div className="bg-white rounded-3xl p-8 border border-slate-200/90 shadow-sm hover:shadow-md transition-all">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold mb-6">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 font-['Outfit'] mb-2">
                Creación en Pausa & Créditos
              </h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                Las campañas nunca entregan anuncios automáticamente. Se crean en estado <code>PAUSED</code> para que tú las actives, con trazabilidad clara en créditos.
              </p>
              <div className="mt-6 pt-4 border-t border-slate-100 flex items-center gap-2 text-xs font-semibold text-emerald-600">
                <span>Control Humano Total</span>
                <ChevronRight className="w-4 h-4" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* SANDBOX SECTION: BRIEFING GUIADO CON LOGIN DE PRUEBA                      */}
      {/* ========================================================================= */}
      <section id="briefing-section" className="py-20 bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-10">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-50 text-indigo-700 text-xs font-bold mb-3 border border-indigo-100">
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
              <span>Sandbox Interactivo de Pauta</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 font-['Outfit'] tracking-tight">
              Prueba TICO con los Parámetros de tu Marca
            </h2>
            <p className="mt-2 text-slate-600 text-sm sm:text-base">
              Completa el brief y presiona el botón para avanzar. El sistema te solicitará ingresar para crear tu espacio de trabajo y abrir el editor de pauta.
            </p>
          </div>

          <BriefingForm
            onSubmit={handleBriefSubmit}
            isLoading={isLoadingStrategy}
            submitButtonText="Formular Estrategia en la Plataforma →"
          />
        </div>
      </section>

      {/* ========================================================================= */}
      {/* FOOTER                                                                    */}
      {/* ========================================================================= */}
      <footer className="border-t border-slate-200 bg-white py-14">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8 pb-10 border-b border-slate-100">
            <div>
              <TicoLogo size="md" showPoweredBy={true} />
              <p className="text-xs text-slate-500 mt-2 max-w-sm">
                Plataforma de planeación e implementación publicitaria de TicTac Agency Performance.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-6 sm:gap-8 text-xs font-semibold text-slate-600">
              <a href="#por-que-tico" className="hover:text-slate-950 transition-colors">Metodología</a>
              <a href="#briefing-section" className="hover:text-slate-950 transition-colors">Sandbox</a>
              <button
                type="button"
                onClick={() => setIsAuthModalOpen(true)}
                className="hover:text-slate-950 transition-colors cursor-pointer"
              >
                Acceso Plataforma
              </button>
              <a
                href="https://api.whatsapp.com/send?text=Hola%20TicTac%20Agency"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-slate-950 transition-colors"
              >
                Contacto
              </a>
            </div>
          </div>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 gap-4">
            <div>
              © {new Date().getFullYear()} TicTac Agency Performance. Todos los derechos reservados.
            </div>
            <div className="flex items-center gap-4">
              <span>Stack: React 19 + TypeScript + Tailwind CSS</span>
              <span>•</span>
              <span className="text-slate-600 font-medium">Meta Marketing API & Google Ads Partner</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
