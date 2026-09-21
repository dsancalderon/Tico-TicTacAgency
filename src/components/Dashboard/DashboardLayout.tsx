import React, { useEffect } from 'react';
import { TicoLogo } from '../TicoLogo';
import { CreditsWidget } from './CreditsWidget';
import { 
  Sparkles, 
  LogOut, 
  Share2, 
  FolderKanban
} from 'lucide-react';
import { forceResetScroll } from '../../utils/scrollLock';
import type { UserSession, MetaConnectionState, CreditTransaction } from '../../types';

interface DashboardLayoutProps {
  userSession: UserSession;
  metaState: MetaConnectionState;
  creditTransactions: CreditTransaction[];
  onAddCredits: (amount: number) => void;
  onLogout: () => void;
  activeTab: 'studio' | 'meta-connect' | 'campaigns';
  onSelectTab: (tab: 'studio' | 'meta-connect' | 'campaigns') => void;
  children: React.ReactNode;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({
  userSession,
  metaState,
  creditTransactions,
  onAddCredits,
  onLogout,
  activeTab,
  onSelectTab,
  children
}) => {
  useEffect(() => {
    // Asegurar que el scroll del body esté 100% activo al entrar o refrescar el panel
    forceResetScroll();
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-['Plus_Jakarta_Sans']">
      {/* Top Application Bar */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200/80 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between gap-4">
          
          {/* Logo */}
          <div className="flex items-center gap-6">
            <TicoLogo size="md" showPoweredBy={true} scale={0.8} />
          </div>

          {/* Right Area: Meta Status, Credits, User & Logout */}
          <div className="flex items-center gap-3 sm:gap-4">
            {/* Meta Status Indicator Button */}
            <button
              type="button"
              onClick={() => onSelectTab('meta-connect')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border transition-colors cursor-pointer ${
                metaState.status === 'ready_to_deploy'
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                  : metaState.status === 'connected_needs_perms'
                  ? 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
                  : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
              }`}
              title="Ver estado de conexión con Meta Ads API"
            >
              <Share2 className="w-3.5 h-3.5 text-blue-600" />
              <span className="hidden sm:inline">Meta Ads:</span>
              <span className="capitalize">{metaState.status === 'ready_to_deploy' ? 'Listo' : metaState.status === 'connected_needs_perms' ? 'Permisos' : 'Desconectado'}</span>
            </button>

            {/* Credits Widget */}
            <CreditsWidget
              credits={userSession.credits}
              transactions={creditTransactions}
              onAddCredits={onAddCredits}
            />

            {/* User Session and Logout */}
            <div className="flex items-center gap-3 pl-3 border-l border-slate-200">
              <div className="hidden lg:block text-right">
                <div className="text-xs font-extrabold text-slate-900 leading-tight">
                  {userSession.name}
                </div>
                <div className="text-[10px] text-slate-500 font-medium truncate max-w-[140px]">
                  {userSession.workspaceName}
                </div>
              </div>

              <button
                type="button"
                onClick={onLogout}
                title="Cerrar Sesión y volver a la Landing"
                className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Tab Navigation Navigation */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center gap-1 sm:gap-4 overflow-x-auto text-xs font-bold">
          <button
            type="button"
            onClick={() => onSelectTab('studio')}
            className={`py-3 px-4 border-b-2 transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
              activeTab === 'studio'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>Estudio de Pauta (Brief & Plan)</span>
          </button>

          <button
            type="button"
            onClick={() => onSelectTab('meta-connect')}
            className={`py-3 px-4 border-b-2 transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
              activeTab === 'meta-connect'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Share2 className="w-4 h-4" />
            <span>Diagnóstico & Conexión Meta Ads</span>
            {metaState.status === 'ready_to_deploy' && (
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
            )}
          </button>

          <button
            type="button"
            onClick={() => onSelectTab('campaigns')}
            className={`py-3 px-4 border-b-2 transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
              activeTab === 'campaigns'
                ? 'border-emerald-600 text-emerald-600'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <FolderKanban className="w-4 h-4" />
            <span>Campañas Desplegadas (PAUSED)</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-6 text-center text-xs text-slate-400">
        <p>TICO — Plataforma de Planeación e Implementación Publicitaria • TicTac Agency Performance</p>
      </footer>
    </div>
  );
};
