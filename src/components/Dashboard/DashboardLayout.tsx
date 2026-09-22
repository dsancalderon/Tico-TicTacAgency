import React, { useEffect, useState } from 'react';
import { TicoLogo } from '../TicoLogo';
import { TicoMascot } from '../TicoMascot';
import { CreditsWidget } from './CreditsWidget';
import { 
  LogOut, 
  Menu, 
  X,
  ChevronRight
} from 'lucide-react';
import { MetaBrandLogo, GoogleBrandLogo } from '../BrandLogos';
import { forceResetScroll } from '../../utils/scrollLock';
import type { UserSession, MetaConnectionState, GoogleConnectionState, CreditTransaction, DashboardTab } from '../../types';
import { 
  TicoIconHome, 
  TicoIconAgent, 
  TicoIconConnections, 
  TicoIconCampaigns, 
  TicoIconDashboards 
} from './TicoNavIcons';

interface DashboardLayoutProps {
  userSession: UserSession;
  metaState: MetaConnectionState;
  googleState?: GoogleConnectionState;
  creditTransactions: CreditTransaction[];
  onAddCredits: (amount: number) => void;
  onLogout: () => void;
  activeTab: DashboardTab;
  onSelectTab: (tab: DashboardTab) => void;
  isCreditsModalOpen?: boolean;
  onCreditsModalOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({
  userSession,
  metaState,
  googleState,
  creditTransactions,
  onAddCredits,
  onLogout,
  activeTab,
  onSelectTab,
  isCreditsModalOpen,
  onCreditsModalOpenChange,
  children
}) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSidebarHovered, setIsSidebarHovered] = useState(false);

  useEffect(() => {
    forceResetScroll();
  }, []);

  const navItems: {
    id: DashboardTab;
    label: string;
    description: string;
    icon: React.ComponentType<{ className?: string; size?: number }>;
    badge?: string;
    badgeColor?: string;
    showDot?: boolean;
    dotColor?: string;
  }[] = [
    {
      id: 'home',
      label: 'Inicio',
      description: 'Estado, tareas y créditos',
      icon: TicoIconHome
    },
    {
      id: 'agent',
      label: 'Tico Agent',
      description: 'Campaña con IA',
      icon: TicoIconAgent,
      badge: 'IA',
      badgeColor: 'bg-indigo-100 text-indigo-700 border-indigo-200'
    },
    {
      id: 'connections',
      label: 'Conexiones',
      description: 'Meta & Google Ads',
      icon: TicoIconConnections,
      showDot: true,
      dotColor: metaState.status === 'ready_to_deploy' ? 'bg-emerald-500' : 'bg-amber-400'
    },
    {
      id: 'campaigns',
      label: 'Campañas',
      description: 'Desplegadas en pausa',
      icon: TicoIconCampaigns,
      badge: 'PAUSED',
      badgeColor: 'bg-amber-100 text-amber-800 border-amber-200'
    },
    {
      id: 'dashboards',
      label: 'Dashboards',
      description: 'Datos actuales de activos',
      icon: TicoIconDashboards,
      showDot: true,
      dotColor: 'bg-emerald-500'
    }
  ];

  const currentTabMeta = navItems.find((item) => item.id === activeTab) || navItems[0];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex font-['Plus_Jakarta_Sans']">
      
      {/* ========================================================================= */}
      {/* 1. SIDEBAR IZQUIERDO DESKTOP (STICKY)                                     */}
      {/* ========================================================================= */}
      <aside 
        onMouseEnter={() => setIsSidebarHovered(true)}
        onMouseLeave={() => setIsSidebarHovered(false)}
        className={`hidden md:flex flex-col bg-white border-r border-slate-200/90 sticky top-0 h-screen z-30 shrink-0 transition-all duration-300 ease-in-out ${
          isSidebarHovered ? 'w-64 lg:w-72 shadow-xl' : 'w-20 shadow-2xs'
        }`}
      >
        {/* Brand Logo Header: Expandido muestra logo completo, Colapsado muestra silueta de Tico */}
        <div className="h-20 px-3 flex items-center justify-center border-b border-slate-100 overflow-hidden transition-all duration-300">
          {isSidebarHovered ? (
            <div className="w-full flex items-center justify-between px-3 animate-in fade-in duration-200">
              <TicoLogo size="md" showPoweredBy={false} scale={0.8} />
            </div>
          ) : (
            <div 
              className="w-10 h-10 rounded-2xl bg-slate-950 flex items-center justify-center shadow-xs cursor-pointer hover:scale-105 transition-transform animate-in zoom-in-95 duration-200" 
              title="TICO — Powered by TicTac Agency"
            >
              <TicoMascot className="w-6 h-6" />
            </div>
          )}
        </div>

        {/* Navigation Items (5 Secciones con iconos Squircle de Tico) */}
        <div className="flex-1 px-3 py-6 overflow-y-auto space-y-2">
          {isSidebarHovered && (
            <div className="px-3 pb-2 text-[10px] font-extrabold text-slate-400 uppercase tracking-widest animate-in fade-in duration-200">
              Menú de Plataforma
            </div>
          )}

          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectTab(item.id)}
                title={!isSidebarHovered ? `${item.label} — ${item.description}` : undefined}
                className={`w-full group flex items-center rounded-2xl text-left transition-all cursor-pointer relative ${
                  isSidebarHovered
                    ? 'px-3.5 py-3 justify-between'
                    : 'px-0 py-3 justify-center'
                } ${
                  isActive
                    ? 'bg-slate-950 text-white shadow-sm font-bold'
                    : 'text-slate-600 hover:text-slate-950 hover:bg-slate-100/80 font-semibold'
                }`}
              >
                <div className={`flex items-center ${isSidebarHovered ? 'gap-3 min-w-0' : 'justify-center'}`}>
                  <div
                    className={`shrink-0 transition-transform group-hover:scale-110 flex items-center justify-center ${
                      !isSidebarHovered ? 'w-10 h-10' : ''
                    } ${
                      isActive ? 'text-white' : 'text-slate-500 group-hover:text-slate-900'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                  </div>

                  {isSidebarHovered && (
                    <div className="truncate animate-in fade-in duration-200">
                      <div className="text-xs tracking-tight truncate leading-tight">
                        {item.label}
                      </div>
                      <div className="text-[10px] truncate text-slate-400">
                        {item.description}
                      </div>
                    </div>
                  )}
                </div>

                {isSidebarHovered ? (
                  <div className="flex items-center gap-1.5 shrink-0 ml-2 animate-in fade-in duration-200">
                    {item.badge && (
                      <span
                        className={`px-1.5 py-0.5 rounded-md text-[9px] font-extrabold border ${
                          isActive 
                            ? 'bg-white/20 text-white border-white/30' 
                            : item.badgeColor
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                    {item.showDot && (
                      <span
                        className={`w-2 h-2 rounded-full ${item.dotColor || 'bg-emerald-500'} ${
                          isActive ? 'ring-2 ring-white/30' : ''
                        }`}
                      />
                    )}
                  </div>
                ) : (
                  item.showDot && (
                    <span
                      className={`absolute top-2.5 right-2.5 w-2 h-2 rounded-full ${item.dotColor || 'bg-emerald-500'}`}
                    />
                  )
                )}
              </button>
            );
          })}
        </div>

        {/* Sidebar Footer: Usuario y Cerrar Sesión */}
        <div className="p-3 border-t border-slate-100 space-y-3 bg-slate-50/50 transition-all duration-300">
          {isSidebarHovered ? (
            <div className="flex items-center justify-between p-2.5 rounded-2xl bg-white border border-slate-200/80 shadow-2xs animate-in fade-in duration-200">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-extrabold text-xs shrink-0 shadow-xs">
                  {userSession.name?.charAt(0).toUpperCase() || 'U'}
                </div>
                <div className="truncate">
                  <div className="text-xs font-bold text-slate-900 truncate leading-tight">
                    {userSession.name}
                  </div>
                  <div className="text-[10px] text-slate-500 truncate">
                    {userSession.workspaceName}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={onLogout}
                title="Cerrar Sesión"
                className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 py-1 animate-in fade-in duration-200">
              <div 
                className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-extrabold text-xs shadow-xs"
                title={`${userSession.name} (${userSession.workspaceName})`}
              >
                {userSession.name?.charAt(0).toUpperCase() || 'U'}
              </div>
              <button
                type="button"
                onClick={onLogout}
                title="Cerrar Sesión"
                className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* ========================================================================= */}
      {/* 2. SIDEBAR MOBILE DRAWER                                                  */}
      {/* ========================================================================= */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden bg-slate-950/60 backdrop-blur-xs flex">
          <div className="w-72 bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-left duration-200">
            <div className="h-18 px-6 flex items-center justify-between border-b border-slate-100">
              <TicoLogo size="sm" showPoweredBy={false} scale={0.8} />
              <button
                type="button"
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-2 text-slate-500 hover:bg-slate-100 rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 px-4 py-4 space-y-1.5 overflow-y-auto">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      onSelectTab(item.id);
                      setIsMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3.5 py-3 rounded-2xl text-left transition-all ${
                      isActive
                        ? 'bg-slate-950 text-white font-bold'
                        : 'text-slate-600 hover:bg-slate-100 font-semibold'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className="w-5 h-5 shrink-0" />
                      <div>
                        <div className="text-xs">{item.label}</div>
                        <div className="text-[10px] text-slate-400">{item.description}</div>
                      </div>
                    </div>

                    {item.badge && (
                      <span className={`px-2 py-0.5 rounded-md text-[9px] font-bold ${item.badgeColor}`}>
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="p-4 border-t border-slate-100">
              <button
                type="button"
                onClick={onLogout}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-slate-100 hover:bg-rose-50 hover:text-rose-600 text-slate-700 text-xs font-bold transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span>Cerrar Sesión</span>
              </button>
            </div>
          </div>

          <div className="flex-1" onClick={() => setIsMobileMenuOpen(false)} />
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. CONTENIDO PRINCIPAL (DERECHA DEL SIDEBAR)                              */}
      {/* ========================================================================= */}
      <div className="flex-1 flex flex-col min-w-0 overflow-x-hidden">
        
        {/* Top Header Bar */}
        <header className="sticky top-0 z-20 bg-white/90 backdrop-blur-md border-b border-slate-200/80">
          <div className="px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between gap-4">
            
            {/* Left Header: Mobile Toggle & Breadcrumb de Sección Activa */}
            <div className="flex items-center gap-3 min-w-0">
              <button
                type="button"
                onClick={() => setIsMobileMenuOpen(true)}
                className="p-2 rounded-xl border border-slate-200 md:hidden text-slate-600 hover:bg-slate-100"
                aria-label="Abrir menú"
              >
                <Menu className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-2 truncate">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider hidden sm:inline">
                  TICO
                </span>
                <ChevronRight className="w-3.5 h-3.5 text-slate-300 hidden sm:inline" />
                <span className="text-sm sm:text-base font-extrabold text-slate-900 font-['Outfit'] truncate">
                  {currentTabMeta.label}
                </span>
              </div>
            </div>

            {/* Right Header: Indicadores Rápidos, Créditos y Perfil */}
            <div className="flex items-center gap-2.5 sm:gap-3">
              
              {/* Meta Status Pill */}
              <button
                type="button"
                onClick={() => onSelectTab('connections')}
                className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border transition-colors cursor-pointer ${
                  metaState.status === 'ready_to_deploy'
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                    : metaState.status === 'connected_needs_perms'
                    ? 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
                    : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                }`}
                title="Ver estado de conexión con Meta Ads API"
              >
                <MetaBrandLogo className="w-3.5 h-3.5 shrink-0" />
                <span>Meta Ads:</span>
                <span className="capitalize font-semibold">
                  {metaState.status === 'ready_to_deploy' ? 'Listo' : metaState.status === 'connected_needs_perms' ? 'Permisos' : 'Desconectado'}
                </span>
              </button>

              {/* Google Status Pill */}
              <button
                type="button"
                onClick={() => onSelectTab('connections')}
                className={`hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border transition-colors cursor-pointer ${
                  googleState?.isConnected
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                    : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                }`}
                title="Ver estado de conexión con Google Ads API"
              >
                <GoogleBrandLogo className="w-3.5 h-3.5 shrink-0" />
                <span>Google:</span>
                <span className="capitalize font-semibold">
                  {googleState?.isConnected ? 'Conectado' : 'Pendiente'}
                </span>
              </button>

              {/* Credits Widget */}
              <CreditsWidget
                credits={userSession.credits}
                transactions={creditTransactions}
                onAddCredits={onAddCredits}
                isOpen={isCreditsModalOpen}
                onOpenChange={onCreditsModalOpenChange}
              />
            </div>

          </div>
        </header>

        {/* Main Content View */}
        <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </main>

        {/* Footer */}
        <footer className="bg-white border-t border-slate-200 py-6 text-center text-xs text-slate-400">
          <p>TICO — Plataforma de Planeación e Implementación Publicitaria • TicTac Agency Performance</p>
        </footer>

      </div>

    </div>
  );
};
