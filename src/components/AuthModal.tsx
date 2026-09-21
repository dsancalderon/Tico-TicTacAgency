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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden text-slate-900"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Decorative Top Line */}
        <div className="h-1.5 w-full bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600" />

        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-100 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-7 sm:p-8">
          {/* Logo & Header */}
          <div className="flex items-center gap-3 mb-5">
            <TicoLogo size="sm" variant="stacked" />
          </div>

          <h3 className="text-2xl font-extrabold tracking-tight font-['Outfit'] text-slate-900">
            {customTitle || (isLogin ? 'Acceso a la Plataforma TICO' : 'Crear Cuenta en TICO')}
          </h3>
          <p className="text-xs text-slate-500 mt-1 leading-relaxed">
            {customSubtitle || (isLogin 
              ? 'Ingresa tus credenciales para gestionar briefings, autorizar cuentas de Meta Ads y desplegar pauta.'
              : 'Registra tu agencia o marca para acceder al agente de planeación publicitaria con créditos incluidos.')
            }
          </p>

          {/* Test notice banner */}
          <div className="mt-4 p-2.5 rounded-xl bg-indigo-50/80 border border-indigo-100 flex items-start gap-2 text-xs text-indigo-900 font-medium">
            <ShieldCheck className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
            <span>
              <strong>Modo de prueba activo:</strong> Puedes ingresar cualquier correo y contraseña para continuar al dashboard.
            </span>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            {!isLogin && (
              <>
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                    Tu Nombre o Agencia
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                    <input
                      type="text"
                      placeholder="Ej. Santiago Mejía"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-indigo-600 transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                    Nombre del Espacio de Trabajo
                  </label>
                  <input
                    type="text"
                    placeholder="Ej. TicTac Agency Performance"
                    value={workspace}
                    onChange={(e) => setWorkspace(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-indigo-600 transition-all"
                  />
                </div>
              </>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                Correo Electrónico
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="email"
                  required
                  placeholder="ejemplo@tictacagency.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-indigo-600 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                Contraseña
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-indigo-600 transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 px-5 rounded-xl bg-slate-950 hover:bg-slate-800 text-white font-bold text-sm shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Validando acceso...</span>
                </>
              ) : (
                <>
                  <span>{isLogin ? 'Ingresar a la Plataforma' : 'Crear Cuenta y Continuar'}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Toggle between login & register */}
          <div className="mt-6 pt-5 border-t border-slate-100 text-center text-xs text-slate-500">
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
