import React from 'react';
import type { 
  UserSession, 
  MetaConnectionState, 
  CreditTransaction, 
  DashboardTab,
  GoogleConnectionState
} from '../../types';
import { 
  CheckCircle2, 
  ArrowRight, 
  Sparkles, 
  Zap, 
  Layers,
  Clock
} from 'lucide-react';
import { 
  TicoIconAgent, 
  TicoIconDashboards 
} from './TicoNavIcons';
import { MetaBrandLogo, GoogleBrandLogo } from '../BrandLogos';

interface HomeOverviewProps {
  userSession: UserSession;
  metaState: MetaConnectionState;
  googleState?: GoogleConnectionState;
  creditTransactions: CreditTransaction[];
  deployedCampaignsCount: number;
  onNavigateTab: (tab: DashboardTab) => void;
  onOpenCreditsModal: () => void;
  onAddCredits: (amount: number) => void;
}

export const HomeOverview: React.FC<HomeOverviewProps> = ({
  userSession,
  metaState,
  googleState,
  creditTransactions,
  deployedCampaignsCount,
  onNavigateTab,
  onOpenCreditsModal,
  onAddCredits
}) => {
  // Checklist de Pasos Pendientes
  const steps = [
    {
      id: 'meta-connect',
      title: 'Conectar Meta Ads API',
      description: metaState.status === 'ready_to_deploy'
        ? `Conectado: ${metaState.adAccountName || metaState.adAccountId || 'Cuenta activa'}`
        : metaState.status === 'connected_needs_perms'
        ? 'Token conectado pero faltan permisos de ads_management'
        : 'Vincula tu Token de Meta Graph API para desplegar en tu cuenta publicitaria.',
      isCompleted: metaState.status === 'ready_to_deploy',
      actionLabel: metaState.status === 'ready_to_deploy' ? 'Ver Conexión' : 'Conectar Meta',
      tabTarget: 'connections' as DashboardTab,
      platform: 'meta'
    },
    {
      id: 'assets-check',
      title: 'Asignar Fan Page y Píxel de Meta',
      description: metaState.pageId && metaState.pixelId
        ? `Página: ${metaState.pageName || metaState.pageId} • Píxel: ${metaState.pixelName || metaState.pixelId}`
        : metaState.pageId
        ? `Página seleccionada (${metaState.pageName || metaState.pageId}). Píxel pendiente.`
        : 'Selecciona la Fan Page de Facebook para asociar los anuncios creados.',
      isCompleted: Boolean(metaState.pageId),
      actionLabel: metaState.pageId ? 'Ver Activos' : 'Configurar Activos',
      tabTarget: 'connections' as DashboardTab,
      platform: 'meta'
    },
    {
      id: 'google-connect',
      title: 'Conectar Google Ads (Opcional)',
      description: googleState?.isConnected
        ? `Conectado con cuenta ${googleState.customerId || ''}`
        : 'Integra tu Customer ID o MCC para orquestar pauta omnicanal.',
      isCompleted: Boolean(googleState?.isConnected),
      actionLabel: googleState?.isConnected ? 'Gestionar' : 'Vincular Google',
      tabTarget: 'connections' as DashboardTab,
      platform: 'google'
    },
    {
      id: 'credits-check',
      title: 'Verificar Créditos TICO Disponibles',
      description: userSession.credits > 0
        ? `Cuentas con ${userSession.credits} créditos disponibles para formular y desplegar pauta.`
        : 'Tu saldo de créditos está en 0. Recarga para formular planes con IA o desplegar en Meta.',
      isCompleted: userSession.credits > 0,
      actionLabel: userSession.credits > 0 ? 'Gestionar Saldo' : 'Recargar Saldo',
      isCustomAction: true,
      onClick: onOpenCreditsModal
    },
    {
      id: 'first-campaign',
      title: 'Formular tu primera campaña con Tico Agent',
      description: deployedCampaignsCount > 0
        ? `Tienes ${deployedCampaignsCount} campaña(s) estructuradas en estado PAUSED.`
        : 'Ingresa los objetivos y presupuesto de tu marca para que el agente genere copies, segmentación y plan.',
      isCompleted: deployedCampaignsCount > 0,
      actionLabel: deployedCampaignsCount > 0 ? 'Ver Campañas' : 'Iniciar con Tico Agent',
      tabTarget: deployedCampaignsCount > 0 ? ('campaigns' as DashboardTab) : ('agent' as DashboardTab)
    }
  ];

  const completedStepsCount = steps.filter(s => s.isCompleted).length;
  const progressPercentage = Math.round((completedStepsCount / steps.length) * 100);

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      
      {/* 1. Header de Bienvenida y Estado General */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-950 to-indigo-950 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden border border-slate-800">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        <div className="absolute bottom-0 right-1/4 w-72 h-72 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-[11px] font-semibold text-blue-200">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Plataforma Activa • {userSession.workspaceName}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight font-['Outfit']">
              Hola, {userSession.name} 👋
            </h1>
            <p className="text-slate-300 text-xs sm:text-sm max-w-xl leading-relaxed">
              Bienvenido a tu centro de comando publicitario. Aquí tienes el resumen de estado de tu cuenta, los pasos pendientes de configuración y tu saldo de créditos.
            </p>
          </div>

          {/* Quick Metrics Header Pill */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Meta Status */}
            <div className="px-4 py-2.5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md">
              <div className="flex items-center gap-1.5 mb-1">
                <MetaBrandLogo className="w-3.5 h-3.5 shrink-0" />
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Meta Ads API</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${
                  metaState.status === 'ready_to_deploy' ? 'bg-emerald-400' :
                  metaState.status === 'connected_needs_perms' ? 'bg-amber-400' : 'bg-slate-400'
                }`} />
                <span className="text-xs font-bold capitalize">
                  {metaState.status === 'ready_to_deploy' ? 'Listo para PAUSED' :
                   metaState.status === 'connected_needs_perms' ? 'Requiere permisos' : 'Desconectado'}
                </span>
              </div>
            </div>

            {/* Google Status */}
            <div className="px-4 py-2.5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md">
              <div className="flex items-center gap-1.5 mb-1">
                <GoogleBrandLogo className="w-3.5 h-3.5 shrink-0" />
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Google Ads</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${googleState?.isConnected ? 'bg-emerald-400' : 'bg-slate-400'}`} />
                <span className="text-xs font-bold">
                  {googleState?.isConnected ? 'Conectado' : 'Pendiente'}
                </span>
              </div>
            </div>

            {/* Créditos en Header */}
            <div 
              onClick={onOpenCreditsModal}
              className="px-4 py-3 rounded-2xl bg-amber-400/10 border border-amber-400/20 backdrop-blur-md cursor-pointer hover:bg-amber-400/20 transition-all"
            >
              <span className="text-[10px] text-amber-300 font-bold uppercase tracking-wider block">Créditos IA</span>
              <div className="flex items-center gap-1.5 mt-0.5 text-amber-400 font-black text-xs font-['Outfit']">
                <Zap className="w-3.5 h-3.5 fill-amber-400" />
                <span>{userSession.credits} disponibles</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Grid Principal: Pasos Pendientes (Izquierda) + Créditos Disponibles (Derecha) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Pasos Pendientes de Configuración (2 Columnas) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-7 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100">
              <div>
                <h2 className="text-lg font-extrabold text-slate-900 font-['Outfit'] flex items-center gap-2">
                  <span>Pasos Pendientes & Onboarding</span>
                  <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 font-sans">
                    {completedStepsCount}/{steps.length} completados
                  </span>
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Completa estas configuraciones para aprovechar al máximo la orquestación automatizada de Tico.
                </p>
              </div>

              {/* Progress bar visual */}
              <div className="sm:w-44 space-y-1.5">
                <div className="flex justify-between text-[11px] font-bold text-slate-700">
                  <span>Progreso</span>
                  <span>{progressPercentage}%</span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full transition-all duration-500"
                    style={{ width: `${progressPercentage}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Steps List */}
            <div className="divide-y divide-slate-100 mt-2">
              {steps.map((step, idx) => (
                <div key={step.id} className="py-4.5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 group">
                  <div className="flex items-start gap-3.5">
                    <div className="mt-0.5 shrink-0">
                      {step.isCompleted ? (
                        <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
                          <CheckCircle2 className="w-4 h-4" />
                        </div>
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center text-xs font-bold">
                          {idx + 1}
                        </div>
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        {step.platform === 'meta' && <MetaBrandLogo className="w-4 h-4 shrink-0" />}
                        {step.platform === 'google' && <GoogleBrandLogo className="w-4 h-4 shrink-0" />}
                        <span className={`text-sm font-bold ${step.isCompleted ? 'text-slate-900' : 'text-slate-800'}`}>
                          {step.title}
                        </span>
                        {step.isCompleted && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Listo
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5 leading-relaxed max-w-xl">
                        {step.description}
                      </p>
                    </div>
                  </div>

                  <div className="shrink-0 pl-9 sm:pl-0">
                    <button
                      type="button"
                      onClick={() => {
                        if (step.isCustomAction && step.onClick) {
                          step.onClick();
                        } else if (step.tabTarget) {
                          onNavigateTab(step.tabTarget);
                        }
                      }}
                      className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                        step.isCompleted
                          ? 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                          : 'bg-slate-950 text-white hover:bg-slate-800 shadow-xs'
                      }`}
                    >
                      <span>{step.actionLabel}</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Accesos Rápidos (Quick Actions Grid) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div 
              onClick={() => onNavigateTab('agent')}
              className="p-5 rounded-3xl bg-white border border-slate-200/90 hover:border-indigo-300 hover:shadow-md transition-all cursor-pointer group"
            >
              <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                <TicoIconAgent className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-extrabold text-slate-900 font-['Outfit'] group-hover:text-indigo-600 transition-colors">
                Lanzar Tico Agent
              </h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Formula un briefing guiado para que la IA elabore copies, presupuesto y despliegue en PAUSED.
              </p>
            </div>

            <div 
              onClick={() => onNavigateTab('dashboards')}
              className="p-5 rounded-3xl bg-white border border-slate-200/90 hover:border-blue-300 hover:shadow-md transition-all cursor-pointer group"
            >
              <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                <TicoIconDashboards className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-extrabold text-slate-900 font-['Outfit'] group-hover:text-blue-600 transition-colors">
                Explorar Dashboards de Activos
              </h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Monitorea el rendimiento en vivo, gasto, clics y conversiones de tus cuentas publicitarias conectadas.
              </p>
            </div>
          </div>
        </div>

        {/* Panel de Créditos Disponibles (1 Columna) */}
        <div className="space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-xs space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-extrabold text-slate-900 font-['Outfit'] flex items-center gap-2">
                <span>Créditos Disponibles</span>
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                Uso IA & Orquestación
              </span>
            </div>

            {/* Saldo Card */}
            <div className="p-5 rounded-2xl bg-gradient-to-br from-amber-500 via-amber-600 to-indigo-700 text-white shadow-md relative overflow-hidden">
              <div className="text-xs font-semibold text-amber-100 uppercase tracking-wider">
                Saldo de Cuenta
              </div>
              <div className="text-4xl font-black font-['Outfit'] mt-1 flex items-baseline gap-2">
                <span>{userSession.credits}</span>
                <span className="text-sm font-medium text-amber-200">créditos</span>
              </div>
              <p className="text-[11px] text-amber-100/90 mt-2">
                {userSession.credits >= 5 
                  ? `Suficiente para ~${Math.floor(userSession.credits / 5)} despliegues completos en Meta Ads.`
                  : 'Saldo bajo. Recarga para continuar creando campañas.'}
              </p>

              <div className="mt-4 pt-3 border-t border-white/20 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => onAddCredits(20)}
                  className="flex-1 py-2 px-3 rounded-xl bg-white hover:bg-amber-50 text-slate-950 text-xs font-extrabold transition-all shadow-xs cursor-pointer text-center"
                >
                  Recargar (+20 cr)
                </button>
                <button
                  type="button"
                  onClick={onOpenCreditsModal}
                  className="py-2 px-3 rounded-xl bg-black/20 hover:bg-black/30 text-white text-xs font-bold transition-all cursor-pointer"
                >
                  Detalles
                </button>
              </div>
            </div>

            {/* Costos por Acción */}
            <div className="space-y-2.5">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                Tarifas de Consumo
              </span>
              <div className="space-y-2 text-xs">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-slate-700">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Formulación con IA</span>
                  </div>
                  <span className="font-mono font-bold text-slate-900">1 cr</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-slate-700">
                    <Layers className="w-3.5 h-3.5 text-blue-600" />
                    <span>Despliegue Graph API (PAUSED)</span>
                  </div>
                  <span className="font-mono font-bold text-slate-900">5 cr</span>
                </div>
              </div>
            </div>

            {/* Nota Informativa */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 text-[11px] text-slate-600 leading-relaxed">
              <strong className="text-slate-900 block mb-0.5">Nota importante:</strong>
              Los créditos aplican al software de IA. La inversión publicitaria se factura directamente en tu cuenta de Meta o Google.
            </div>

            {/* Últimas Transacciones */}
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <span>Movimientos Recientes</span>
                <Clock className="w-3 h-3" />
              </div>
              {creditTransactions.length > 0 ? (
                <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                  {creditTransactions.slice(0, 3).map(tx => (
                    <div key={tx.id} className="p-2 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-between text-[11px]">
                      <span className="truncate max-w-[150px] text-slate-700 font-medium">{tx.description}</span>
                      <span className={`font-mono font-bold ${tx.type === 'credit' ? 'text-emerald-600' : 'text-slate-900'}`}>
                        {tx.type === 'credit' ? `+${tx.amount}` : `-${tx.amount}`}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[11px] text-slate-400 py-2 text-center">Sin transacciones registradas aún</p>
              )}
            </div>
          </div>
        </div>

      </div>

    </div>
  );
};
