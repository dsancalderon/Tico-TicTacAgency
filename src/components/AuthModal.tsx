import React, { useState, useEffect } from 'react';
import { X, Lock, Mail, User, Briefcase } from 'lucide-react';
import { TicoMascot } from './TicoMascot';
import { requireSupabase, loadUserSession, supabase } from '../services/auth';
import { useScrollLock } from '../utils/scrollLock';
import type { UserSession } from '../types';
import './AuthModal.css';

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
  customTitle
}) => {
  const [isLogin, setIsLogin] = useState(initialMode === 'login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [workspace, setWorkspace] = useState('');
  const [loading, setLoading] = useState(false);

  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  useScrollLock(isOpen);

  useEffect(() => {
    if (isOpen) {
      setIsLogin(initialMode === 'login');
      setError('');
      setNotice('');
      setPassword('');
    }
  }, [isOpen, initialMode]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setError('');
    setNotice('');

    try {
      if (!isLogin && !/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{12,}$/.test(password)) {
        throw new Error('Usa al menos 12 caracteres, con mayúscula, minúscula, número y símbolo.');
      }
      const client = requireSupabase();
      const { data, error: authError } = isLogin
        ? await client.auth.signInWithPassword({ email: email.trim(), password })
        : await client.auth.signUp({
            email: email.trim(),
            password,
            options: {
              data: { display_name: name.trim(), workspace_name: workspace.trim() },
              emailRedirectTo: new URL('?auth=confirmed', window.location.origin + import.meta.env.BASE_URL).toString(),
            }
          });

      if (authError) throw authError;
      setPassword('');
      if (!data.session) {
        setNotice('Revisa tu correo para confirmar el registro. Si ya tienes cuenta, inicia sesión.');
        return;
      }
      onSuccess(await loadUserSession());
      onClose();
    } catch (err) {
      const code = (err as { code?: string }).code;
      setError(code === 'invalid_credentials' ? 'Correo o contraseña incorrectos.'
        : code === 'email_not_confirmed' ? 'Confirma tu correo antes de iniciar sesión.'
        : err instanceof Error ? err.message : 'No se pudo completar el acceso. Inténtalo de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/30 backdrop-blur-md animate-in fade-in duration-200 overflow-y-auto"
      onClick={onClose}
    >
      {/* Ambient background glow orbs for the dreamy pastel aesthetic */}
      <div className="fixed -top-24 -left-24 w-96 h-96 bg-blue-400/20 rounded-full blur-3xl pointer-events-none" />
      <div className="fixed -bottom-24 -right-24 w-96 h-96 bg-purple-400/20 rounded-full blur-3xl pointer-events-none" />
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-indigo-300/15 rounded-full blur-[100px] pointer-events-none" />

      {/* Glassmorphic Card */}
      <div 
        className="relative w-full max-w-[400px] rounded-[36px] bg-white/75 backdrop-blur-2xl border border-white/80 shadow-[0_25px_60px_-15px_rgba(91,103,250,0.25)] p-7 sm:p-9 flex flex-col items-center my-auto transition-all z-10"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/50 rounded-full transition-colors cursor-pointer z-20"
          title="Cerrar"
        >
          <X className="w-4 h-4" />
        </button>

        {/* 1. Mascot Logo (ONLY the logo, NO text nor powered by) */}
        <div className={`auth-mascot-container ${loading ? 'auth-mascot-loading' : ''}`}>
          <div className="auth-mascot-aura" />
          <div className="auth-mascot-float">
            <TicoMascot />
          </div>
          <div className="auth-mascot-shadow" />
          <div className="auth-loader-track" aria-hidden="true">
            <span />
          </div>
        </div>

        {/* 2. Title */}
        <h2 className="text-2xl font-bold text-slate-800 tracking-tight font-['Outfit'] mt-3 mb-6 text-center">
          {customTitle || (isLogin ? 'Inicia sesión' : 'Crear una cuenta')}
        </h2>

        {/* Error / Notice feedback */}
        {error && (
          <div className="w-full mb-4 p-3 rounded-2xl bg-rose-50/90 border border-rose-200 text-rose-700 text-xs text-center font-medium leading-relaxed animate-in fade-in duration-150">
            {error}
          </div>
        )}
        {notice && (
          <div className="w-full mb-4 p-3 rounded-2xl bg-emerald-50/90 border border-emerald-200 text-emerald-800 text-xs text-center font-medium leading-relaxed animate-in fade-in duration-150">
            {notice}
          </div>
        )}

        {/* 3. Form */}
        <form onSubmit={handleSubmit} className="w-full space-y-3.5">
          {!isLogin && (
            <>
              {/* Tu Nombre */}
              <div className="relative flex items-center bg-[#f0f3fa]/90 border border-[#e2e8f5] focus-within:border-[#5B67FA] focus-within:bg-white focus-within:ring-4 focus-within:ring-[#5B67FA]/15 rounded-2xl transition-all duration-200">
                <div className="pl-4 pr-1 text-slate-400">
                  <User className="w-[18px] h-[18px]" />
                </div>
                <input
                  type="text"
                  required
                  maxLength={120}
                  placeholder="Tu Nombre o Agencia"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-transparent py-3.5 pr-4 pl-2 text-sm text-slate-800 placeholder-slate-400 font-medium focus:outline-none"
                />
              </div>

              {/* Nombre del Espacio de Trabajo */}
              <div className="relative flex items-center bg-[#f0f3fa]/90 border border-[#e2e8f5] focus-within:border-[#5B67FA] focus-within:bg-white focus-within:ring-4 focus-within:ring-[#5B67FA]/15 rounded-2xl transition-all duration-200">
                <div className="pl-4 pr-1 text-slate-400">
                  <Briefcase className="w-[18px] h-[18px]" />
                </div>
                <input
                  type="text"
                  placeholder="Nombre de tu Espacio de Trabajo"
                  value={workspace}
                  onChange={(e) => setWorkspace(e.target.value)}
                  className="w-full bg-transparent py-3.5 pr-4 pl-2 text-sm text-slate-800 placeholder-slate-400 font-medium focus:outline-none"
                />
              </div>
            </>
          )}

          {/* Correo electrónico */}
          <div className="relative flex items-center bg-[#f0f3fa]/90 border border-[#e2e8f5] focus-within:border-[#5B67FA] focus-within:bg-white focus-within:ring-4 focus-within:ring-[#5B67FA]/15 rounded-2xl transition-all duration-200">
            <div className="pl-4 pr-1 text-slate-400">
              <Mail className="w-[18px] h-[18px]" />
            </div>
            <input
              type="email"
              required
              placeholder="Correo electrónico"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-transparent py-3.5 pr-4 pl-2 text-sm text-slate-800 placeholder-slate-400 font-medium focus:outline-none"
            />
          </div>

          {/* Contraseña */}
          <div className="relative flex items-center bg-[#f0f3fa]/90 border border-[#e2e8f5] focus-within:border-[#5B67FA] focus-within:bg-white focus-within:ring-4 focus-within:ring-[#5B67FA]/15 rounded-2xl transition-all duration-200">
            <div className="pl-4 pr-1 text-slate-400">
              <Lock className="w-[18px] h-[18px]" />
            </div>
            <input
              type="password"
              minLength={isLogin ? undefined : 12}
              autoComplete={isLogin ? "current-password" : "new-password"}
              required
              placeholder="Contraseña"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-transparent py-3.5 pr-4 pl-2 text-sm text-slate-800 placeholder-slate-400 font-medium focus:outline-none"
            />
          </div>

          {!isLogin && (
            <p className="text-[11px] text-slate-500 text-center px-1">
              Mínimo 12 caracteres con mayúscula, minúscula, número y símbolo.
            </p>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading || !supabase}
            className="w-full mt-2 py-3.5 px-6 rounded-2xl bg-gradient-to-r from-[#2F80ED] via-[#5B67FA] to-[#A751F1] hover:opacity-95 active:scale-[0.99] text-white font-bold text-sm tracking-wide shadow-[0_12px_28px_rgba(91,103,250,0.35)] hover:shadow-[0_16px_34px_rgba(91,103,250,0.45)] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Validando credenciales...</span>
              </>
            ) : (
              <span>{isLogin ? 'Entrar a TICO' : 'Crear cuenta en TICO'}</span>
            )}
          </button>
        </form>

        {/* 4. Toggle Link */}
        <div className="mt-5 text-center">
          {isLogin ? (
            <button
              type="button"
              disabled={loading}
              onClick={() => { setIsLogin(false); setError(''); setNotice(''); }}
              className="text-xs font-bold text-[#5B67FA] hover:text-[#424fe8] transition-colors cursor-pointer"
            >
              Crear una cuenta
            </button>
          ) : (
            <button
              type="button"
              disabled={loading}
              onClick={() => { setIsLogin(true); setError(''); setNotice(''); }}
              className="text-xs font-bold text-[#5B67FA] hover:text-[#424fe8] transition-colors cursor-pointer"
            >
              ¿Ya tienes cuenta? Inicia sesión
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

