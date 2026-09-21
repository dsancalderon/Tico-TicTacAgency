import React, { useState } from 'react';
import { TicoLogo } from './TicoLogo';
import { ChevronDown, Megaphone, ShieldCheck, LogIn, LayoutDashboard, Sparkles } from 'lucide-react';
import type { UserSession } from '../types';

interface HeaderProps {
  backendOnline: boolean;
  userSession: UserSession | null;
  onOpenLogin: () => void;
  onGoToPlatform: () => void;
  onOpenNewCampaign?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  backendOnline,
  userSession,
  onOpenLogin,
  onGoToPlatform,
  onOpenNewCampaign
}) => {
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

  return (
    <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-slate-100 transition-all duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        
        {/* Brand Logo */}
        <div className="flex items-center gap-8">
          <a href="#" className="flex items-center gap-2">
            <TicoLogo size="md" showPoweredBy={true} scale={0.82} />
          </a>

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center gap-7 text-[14px] font-medium text-slate-700">
            {/* Producto Dropdown */}
            <div
              className="relative"
              onMouseEnter={() => setActiveDropdown('producto')}
              onMouseLeave={() => setActiveDropdown(null)}
            >
              <button
                type="button"
                className="flex items-center gap-1 hover:text-slate-950 transition-colors py-2 cursor-pointer"
              >
                <span>Producto</span>
                <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${activeDropdown === 'producto' ? 'rotate-180' : ''}`} />
              </button>

              {activeDropdown === 'producto' && (
                <div className="absolute top-full -left-4 w-80 bg-white rounded-2xl shadow-2xl border border-slate-100 p-3 py-4 grid gap-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                  <a
                    href="#briefing-section"
                    onClick={onOpenNewCampaign}
                    className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-slate-50 transition-colors group"
                  >
                    <div className="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                      <Megaphone className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-semibold text-slate-900 text-sm flex items-center gap-1">
                        Pauta Automatizada
                        <span className="text-[10px] bg-indigo-100 text-indigo-700 font-bold px-1.5 py-0.5 rounded-full">Oficial</span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">Creación de campañas en Meta Ads en estado PAUSED</p>
                    </div>
                  </a>

                  <a
                    href="#por-que-tico"
                    className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-slate-50 transition-colors group"
                  >
                    <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                      <ShieldCheck className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-semibold text-slate-900 text-sm">Control & Seguridad</div>
                      <p className="text-xs text-slate-500 mt-0.5">Aprobación humana previa y trazabilidad en créditos</p>
                    </div>
                  </a>

                  <div className="pt-2 border-t border-slate-100 mt-1 px-2.5 flex items-center justify-between text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <span className={`w-2 h-2 rounded-full ${backendOnline ? 'bg-emerald-500' : 'bg-amber-400'}`} />
                      Motor IA: {backendOnline ? 'Online' : 'Standby'}
                    </span>
                    <a href="#briefing-section" className="text-indigo-600 font-medium hover:underline">
                      Probar Sandbox →
                    </a>
                  </div>
                </div>
              )}
            </div>

            <a href="#briefing-section" className="hover:text-slate-950 transition-colors">
              Sandbox Interactivo
            </a>
            <a href="#por-que-tico" className="hover:text-slate-950 transition-colors">
              Por Qué TICO
            </a>
            <a 
              href="https://api.whatsapp.com/send?text=Hola%20equipo%20TicTac%20Agency,%20quisiera%20conocer%20m%C3%A1s%20de%20TICO"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-slate-950 transition-colors"
            >
              Contacto Agencia
            </a>
          </nav>
        </div>

        {/* Right CTA Area: Login & Platform Actions */}
        <div className="flex items-center gap-3">
          {userSession?.isAuthenticated ? (
            <div className="flex items-center gap-3">
              <span className="hidden sm:inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 bg-slate-100 px-3 py-1.5 rounded-full">
                <span>Hola, {userSession.name}</span>
                <span className="text-amber-600 font-black">({userSession.credits} cr)</span>
              </span>

              <button
                type="button"
                onClick={onGoToPlatform}
                className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-slate-950 hover:bg-slate-800 text-white text-xs font-bold shadow-sm transition-all cursor-pointer"
              >
                <LayoutDashboard className="w-3.5 h-3.5 text-indigo-400" />
                <span>Ir al Dashboard</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={onOpenLogin}
                className="flex items-center gap-1.5 px-4 py-2 rounded-full border border-slate-300 hover:border-slate-400 text-slate-700 text-xs font-bold hover:bg-slate-50 transition-colors cursor-pointer"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Iniciar Sesión</span>
              </button>

              <a
                href="#briefing-section"
                onClick={onOpenNewCampaign}
                className="hidden sm:inline-flex items-center gap-1.5 px-5 py-2 rounded-full bg-slate-950 hover:bg-slate-800 text-white text-xs font-bold shadow-xs transition-all cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                <span>Probar Gratis</span>
              </a>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
