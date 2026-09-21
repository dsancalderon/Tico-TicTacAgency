import { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { BriefingForm } from './components/BriefingForm';
import { StrategyPreview } from './components/StrategyPreview';
import { DeploymentConsole } from './components/DeploymentConsole';
import { TicoLogo } from './components/TicoLogo';
import { AuthModal } from './components/AuthModal';
import { DashboardLayout } from './components/Dashboard/DashboardLayout';
import { MetaConnectDiagnostic } from './components/Dashboard/MetaConnectDiagnostic';
import type { 
  ClientBriefing, 
  GeneratedCampaignStrategy, 
  UserSession, 
  MetaConnectionState, 
  CreditTransaction 
} from './types';
import { checkBackendHealth, generateStrategyApi, deployCampaignApi } from './services/api';
import {
  ArrowRight,
  Sparkles,
  ShieldCheck,
  ExternalLink,
  ChevronRight,
  Share2,
  FolderKanban,
  FileCheck2,
  Lock
} from 'lucide-react';
import { TicoLoader } from './components/TicoLoader';

export function App() {
  const [backendOnline, setBackendOnline] = useState<boolean>(false);
  const [currentStep, setCurrentStep] = useState<'briefing' | 'strategy' | 'deployed'>('briefing');
  const [isLoadingStrategy, setIsLoadingStrategy] = useState<boolean>(false);
  const [isDeploying, setIsDeploying] = useState<boolean>(false);
  const [strategy, setStrategy] = useState<GeneratedCampaignStrategy | null>(null);
  const [deployResult, setDeployResult] = useState<any>(null);

  // Sesión de Usuario
  const [userSession, setUserSession] = useState<UserSession | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [pendingBrief, setPendingBrief] = useState<ClientBriefing | null>(null);
  const [authModalTitle, setAuthModalTitle] = useState<string | undefined>(undefined);
  const [authModalSubtitle, setAuthModalSubtitle] = useState<string | undefined>(undefined);

  // Estado de Navegación del Dashboard
  const [dashboardTab, setDashboardTab] = useState<'studio' | 'meta-connect' | 'campaigns'>('studio');

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
  const [creditTransactions, setCreditTransactions] = useState<CreditTransaction[]>([
    {
      id: 'tx_init',
      date: new Date().toISOString(),
      amount: 50,
      type: 'credit',
      description: 'Asignación de créditos de bienvenida (Suscripción TicTac)'
    }
  ]);

  // Historial de Campañas Desplegadas
  const [deployedCampaignsList, setDeployedCampaignsList] = useState<GeneratedCampaignStrategy[]>([]);

  // Estado de la pantalla de carga animada de Tico
  const [isAppLoaded, setIsAppLoaded] = useState<boolean>(false);
  const [showLoader, setShowLoader] = useState<boolean>(true);

  // Carga inicial y persistencia de sesión
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsAppLoaded(true);
    }, 2000);

    const savedSession = localStorage.getItem('tico_user_session');
    if (savedSession) {
      try {
        const parsed = JSON.parse(savedSession);
        setUserSession(parsed);
      } catch {
        // Ignorar si hay error en json
      }
    }

    checkBackendHealth().then((status) => setBackendOnline(status));
    return () => clearTimeout(timer);
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
      setAuthModalSubtitle('Para estructurar tu plan publicitario y asignarle créditos a tu marca, ingresa cualquier correo y contraseña en este modo de prueba.');
      setIsAuthModalOpen(true);
      return;
    }

    // Usuario autenticado: procesar la estrategia de pauta
    setIsLoadingStrategy(true);
    try {
      const generated = await generateStrategyApi(brief);
      setStrategy(generated);
      setCurrentStep('strategy');
      const el = document.getElementById('workflow-container');
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    } catch (error) {
      console.error('Error formulando estrategia:', error);
    } finally {
      setIsLoadingStrategy(false);
    }
  };

  // Login exitoso
  const handleAuthSuccess = (session: UserSession) => {
    setUserSession(session);
    // Si había un brief pendiente del sandbox, ejecutarlo de inmediato
    if (pendingBrief) {
      const briefToProcess = pendingBrief;
      setPendingBrief(null);
      setTimeout(() => {
        handleBriefSubmit(briefToProcess);
      }, 300);
    }
  };

  // Desconexión / Cerrar Sesión
  const handleLogout = () => {
    localStorage.removeItem('tico_user_session');
    setUserSession(null);
    setCurrentStep('briefing');
    setStrategy(null);
  };

  // Aprobación de Campaña y Débito de Créditos
  const handleApproveStrategy = async (strategyToDeploy: GeneratedCampaignStrategy) => {
    setIsDeploying(true);
    const cost = strategyToDeploy.creditCost || 5;

    try {
      const result = await deployCampaignApi(strategyToDeploy);
      setDeployResult(result);
      setCurrentStep('deployed');

      // Descontar créditos del usuario
      if (userSession) {
        const updatedCredits = Math.max(0, userSession.credits - cost);
        const updatedSession = { ...userSession, credits: updatedCredits };
        setUserSession(updatedSession);
        localStorage.setItem('tico_user_session', JSON.stringify(updatedSession));

        // Registrar transacción de débito
        const newTx: CreditTransaction = {
          id: `tx_${Date.now()}`,
          date: new Date().toISOString(),
          amount: cost,
          type: 'debit',
          description: `Despliegue de campaña en Meta Ads (PAUSED): ${strategyToDeploy.brandName}`
        };
        setCreditTransactions((prev) => [newTx, ...prev]);

        // Registrar en historial de campañas
        setDeployedCampaignsList((prev) => [
          {
            ...strategyToDeploy,
            deployedMetaCampaignId: result.results?.meta?.campaignId,
            status: 'active'
          },
          ...prev
        ]);
      }

      const el = document.getElementById('workflow-container');
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    } catch (error) {
      console.error('Error desplegando campaña:', error);
    } finally {
      setIsDeploying(false);
    }
  };

  // Recarga de Créditos
  const handleAddCredits = (amount: number) => {
    if (!userSession) return;
    const newAmount = userSession.credits + amount;
    const updated = { ...userSession, credits: newAmount };
    setUserSession(updated);
    localStorage.setItem('tico_user_session', JSON.stringify(updated));

    const newTx: CreditTransaction = {
      id: `tx_${Date.now()}`,
      date: new Date().toISOString(),
      amount,
      type: 'credit',
      description: `Recarga manual de saldo (+${amount} créditos)`
    };
    setCreditTransactions((prev) => [newTx, ...prev]);
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
    return (
      <DashboardLayout
        userSession={userSession}
        metaState={metaState}
        creditTransactions={creditTransactions}
        onAddCredits={handleAddCredits}
        onLogout={handleLogout}
        activeTab={dashboardTab}
        onSelectTab={setDashboardTab}
      >
        {/* TAB 1: ESTUDIO DE PAUTA (BRIEF, ESTRATEGIA Y DESPLIEGUE) */}
        {dashboardTab === 'studio' && (
          <div className="space-y-8" id="workflow-container">
            {/* Stepper indicators */}
            <div className="max-w-2xl mx-auto grid grid-cols-3 gap-3 text-left mb-6">
              <div
                className={`p-3.5 rounded-2xl border transition-all ${
                  currentStep === 'briefing'
                    ? 'border-slate-950 bg-slate-950 text-white shadow-md'
                    : 'border-slate-200 bg-white text-slate-600'
                }`}
              >
                <div className="flex items-center gap-2 text-xs font-bold">
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-black ${
                    currentStep === 'briefing' ? 'bg-white text-slate-950' : 'bg-slate-100 text-slate-700'
                  }`}>1</span>
                  <span>Briefing</span>
                </div>
                <p className={`text-[11px] mt-1 ${currentStep === 'briefing' ? 'text-slate-300' : 'text-slate-400'}`}>
                  Marca & presupuesto
                </p>
              </div>

              <div
                className={`p-3.5 rounded-2xl border transition-all ${
                  currentStep === 'strategy'
                    ? 'border-slate-950 bg-slate-950 text-white shadow-md'
                    : 'border-slate-200 bg-white text-slate-600'
                }`}
              >
                <div className="flex items-center gap-2 text-xs font-bold">
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-black ${
                    currentStep === 'strategy' ? 'bg-white text-slate-950' : 'bg-slate-100 text-slate-700'
                  }`}>2</span>
                  <span>Plan & Creativos</span>
                </div>
                <p className={`text-[11px] mt-1 ${currentStep === 'strategy' ? 'text-slate-300' : 'text-slate-400'}`}>
                  Copies, piezas & Excel
                </p>
              </div>

              <div
                className={`p-3.5 rounded-2xl border transition-all ${
                  currentStep === 'deployed'
                    ? 'border-emerald-600 bg-emerald-600 text-white shadow-md'
                    : 'border-slate-200 bg-white text-slate-600'
                }`}
              >
                <div className="flex items-center gap-2 text-xs font-bold">
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-black ${
                    currentStep === 'deployed' ? 'bg-white text-emerald-800' : 'bg-slate-100 text-slate-700'
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
              <BriefingForm
                onSubmit={handleBriefSubmit}
                isLoading={isLoadingStrategy}
                submitButtonText="Formular Plan de Pauta con TICO"
              />
            )}

            {currentStep === 'strategy' && strategy && (
              <StrategyPreview
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

        {/* TAB 2: CONEXIÓN & DIAGNÓSTICO META ADS */}
        {dashboardTab === 'meta-connect' && (
          <MetaConnectDiagnostic
            metaState={metaState}
            onUpdateMetaState={setMetaState}
          />
        )}

        {/* TAB 3: CAMPAÑAS DESPLEGADAS EN PAUSA */}
        {dashboardTab === 'campaigns' && (
          <div className="bg-white rounded-3xl border border-slate-200 p-6 md:p-8 shadow-sm space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-xl font-extrabold text-slate-900 font-['Outfit']">
                  Campañas Orquestadas en Meta Ads
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Listado de entidades creadas en estado <code>PAUSED</code> para activación manual en Meta Ads Manager.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setDashboardTab('studio');
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
                          PAUSED
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        ID Meta: <code className="font-mono text-slate-700">{c.deployedMetaCampaignId || 'meta_cmp_active'}</code> • Presupuesto: ${c.totalBudget.toLocaleString()} {c.currency}
                      </div>
                    </div>

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
                <p className="text-xs font-semibold text-slate-700">No hay campañas desplegadas todavía</p>
                <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                  Ve a la pestaña <strong>"Estudio de Pauta"</strong> para ingresar un brief y crear tu primera campaña en pausa.
                </p>
              </div>
            )}
          </div>
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
          setAuthModalTitle('Acceso a la Plataforma TICO');
          setAuthModalSubtitle('Ingresa tus credenciales para administrar tus planes y campañas publicitarias.');
          setIsAuthModalOpen(true);
        }}
        onGoToPlatform={() => setDashboardTab('studio')}
        onOpenNewCampaign={scrollToBriefing}
      />

      {/* ========================================================================= */}
      {/* HERO SECTION: ENFOQUE REAL EN PAUTA Y PUBLICIDAD DE PERFORMANCE           */}
      {/* ========================================================================= */}
      <section className="relative overflow-hidden pt-12 sm:pt-16 pb-24 sm:pb-32 bg-white">
        
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
          
          {/* Eyebrow badge: TicTac Agency Performance */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-slate-800 text-xs sm:text-sm font-semibold shadow-2xs mb-6 sm:mb-8 transition-all">
            <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
            <span>TicTac Agency Performance</span>
            <span className="text-slate-300">|</span>
            <span className="text-slate-600 text-[11px] font-medium hidden sm:inline">Meta Marketing API & Google Ads</span>
          </div>

          {/* MAIN HERO HEADLINE */}
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold text-slate-900 tracking-tight font-['Outfit'] leading-[1.15]">
            <span>Deja tu{' '}</span>
            <span className="relative inline-block whitespace-nowrap">
              <span
                className={`inline-block transition-all duration-300 ease-out transform ${
                  isKeywordFading
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
                setAuthModalTitle('Acceso a la Plataforma TICO');
                setAuthModalSubtitle('Ingresa con cualquier credencial de prueba para explorar el dashboard.');
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
