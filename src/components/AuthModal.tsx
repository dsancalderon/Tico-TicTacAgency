import React, { useState } from 'react';
import { X, Lock, Mail, User, ArrowRight, ShieldCheck } from 'lucide-react';
import { TicoLogo } from './TicoLogo';
import type { UserSession } from '../types';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (session: UserSession) => void;
  initialMode?: 'login' | 'register';
  customTitle?: string;
  customSubtitle?: string;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialMode = 'login',
  customTitle,
  customSubtitle
}) => {
  const [isLogin, setIsLogin] = useState(initialMode === 'login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [workspace, setWorkspace] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // En esta fase de prueba se acepta cualquier correo y contraseña
    setTimeout(() => {
      const sessionName = name.trim() || email.split('@')[0] || 'Especialista TicTac';
      const userSession: UserSession = {
        id: `user_${Date.now()}`,
        email: email || 'demo@tictacagency.com',
        name: sessionName.charAt(0).toUpperCase() + sessionName.slice(1),
        role: 'agency_admin',
        workspaceName: workspace.trim() || 'TicTac Agency — Performance Hub',
        credits: 50, // Saldo inicial para pruebas
        isAuthenticated: true
      };

      localStorage.setItem('tico_user_session', JSON.stringify(userSession));
      setLoading(false);
      onSuccess(userSession);
      onClose();
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-slate-950/65 backdrop-blur-sm animate-in fade-in duration-150 overflow-y-auto">
      <div 
        className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden text-slate-900 my-auto max-h-[88vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Decorative Top Line */}
        <div className="h-1.5 w-full bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 shrink-0" />

        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-3.5 right-3.5 p-1.5 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-100 transition-colors cursor-pointer z-10"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="p-5 sm:p-6 overflow-y-auto">
          {/* Logo & Header */}
          <div className="flex items-center gap-2 mb-2.5">
            <TicoLogo size="sm" variant="stacked" />
          </div>

          <h3 className="text-xl sm:text-2xl font-extrabold tracking-tight font-['Outfit'] text-slate-900">
            {customTitle || (isLogin ? 'Acceso a la Plataforma TICO' : 'Crear Cuenta en TICO')}
          </h3>
          <p className="text-[11px] sm:text-xs text-slate-500 mt-1 leading-relaxed">
            {customSubtitle || (isLogin 
              ? 'Ingresa tus credenciales para gestionar briefings, autorizar cuentas de Meta Ads y desplegar pauta.'
              : 'Registra tu agencia o marca para acceder al agente de planeación publicitaria con créditos incluidos.')
            }
          </p>

          {/* Test notice banner */}
          <div className="mt-3 p-2 rounded-xl bg-indigo-50/80 border border-indigo-100 flex items-center gap-2 text-[11px] text-indigo-900 font-medium">
            <ShieldCheck className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
            <span>
              <strong>Modo de prueba:</strong> Ingresa cualquier correo y contraseña para continuar.
            </span>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="mt-4 space-y-3">
            {!isLogin && (
              <>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                    Tu Nombre o Agencia
                  </label>
                  <div className="relative">
                    <User className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      placeholder="Ej. Santiago Mejía"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-indigo-600 transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                    Nombre del Espacio de Trabajo
                  </label>
                  <input
                    type="text"
                    placeholder="Ej. TicTac Agency Performance"
                    value={workspace}
                    onChange={(e) => setWorkspace(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-indigo-600 transition-all"
                  />
                </div>
              </>
            )}

            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                Correo Electrónico
              </label>
              <div className="relative">
                <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="email"
                  required
                  placeholder="ejemplo@tictacagency.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-indigo-600 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                Contraseña
              </label>
              <div className="relative">
                <Lock className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-indigo-600 transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-1.5 py-2.5 px-4 rounded-xl bg-slate-950 hover:bg-slate-800 text-white font-bold text-xs shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
            >
              {loading ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Validando acceso...</span>
                </>
              ) : (
                <>
                  <span>{isLogin ? 'Ingresar a la Plataforma' : 'Crear Cuenta y Continuar'}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </form>

          {/* Toggle between login & register */}
          <div className="mt-4 pt-3 border-t border-slate-100 text-center text-xs text-slate-500">
            {isLogin ? (
              <p>
                ¿No tienes una cuenta aún?{' '}
                <button
                  type="button"
                  onClick={() => setIsLogin(false)}
                  className="font-bold text-indigo-600 hover:text-indigo-700 hover:underline cursor-pointer"
                >
                  Regístrate aquí
                </button>
              </p>
            ) : (
              <p>
                ¿Ya tienes una cuenta registrada?{' '}
                <button
                  type="button"
                  onClick={() => setIsLogin(true)}
                  className="font-bold text-indigo-600 hover:text-indigo-700 hover:underline cursor-pointer"
                >
                  Inicia sesión aquí
                </button>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
