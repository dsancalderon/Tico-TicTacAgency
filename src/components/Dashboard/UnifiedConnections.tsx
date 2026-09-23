import React, { useState } from 'react';
import type { MetaConnectionState, GoogleConnectionState } from '../../types';
import { MetaConnectDiagnostic } from './MetaConnectDiagnostic';
import { 
  CheckCircle2, 
  ExternalLink, 
  Key,
  ChevronRight
} from 'lucide-react';
import { TicoIconAgent } from './TicoNavIcons';
import { MetaBrandLogo, GoogleAdsBrandLogo } from '../BrandLogos';

interface UnifiedConnectionsProps {
  metaState: MetaConnectionState;
  onUpdateMetaState: (newState: MetaConnectionState) => void;
  googleState?: GoogleConnectionState;
  onUpdateGoogleState?: (newState: GoogleConnectionState) => void;
}

export const UnifiedConnections: React.FC<UnifiedConnectionsProps> = ({
  metaState,
  onUpdateMetaState,
  googleState: propGoogleState,
  onUpdateGoogleState
}) => {
  const [activePlatform, setActivePlatform] = useState<'meta' | 'google'>('meta');

  // Estado local para Google Ads si no viene provisto externamente
  const [googleState, setGoogleState] = useState<GoogleConnectionState>(
    propGoogleState || {
      isConnected: false,
      status: 'disconnected',
      customerId: '',
      customerName: '',
      mccId: '',
      developerTokenStatus: 'approved',
      diagnostics: [
        'Google Ads API desconectado. Ingresa tu Customer ID (CID) y autoriza mediante OAuth 2.0 o Service Account para orquestar pauta en Google Search y PMax.'
      ]
    }
  );

  const [inputCustomerId, setInputCustomerId] = useState(googleState.customerId || '');
  const [inputMccId, setInputMccId] = useState(googleState.mccId || '');
  const [isConnectingGoogle, setIsConnectingGoogle] = useState(false);
  const [googleSuccessNotice, setGoogleSuccessNotice] = useState<string | null>(null);

  const handleConnectGoogle = (e: React.FormEvent) => {
    e.preventDefault();
    setIsConnectingGoogle(true);
    setGoogleSuccessNotice(null);

    setTimeout(() => {
      const updated: GoogleConnectionState = {
        isConnected: false,
        status: 'needs_auth',
        customerId: inputCustomerId.trim(),
        customerName: '',
        mccId: inputMccId.trim(),
        developerTokenStatus: 'pending',
        diagnostics: [
          'Datos de cuenta registrados. La autorización de Google Ads está pendiente.'
        ]
      };
      setGoogleState(updated);
      onUpdateGoogleState?.(updated);
      setIsConnectingGoogle(false);
      setGoogleSuccessNotice('Datos listos para guardar. Falta autorizar Google Ads.');
    }, 900);
  };

  const handleDisconnectGoogle = () => {
    const updated: GoogleConnectionState = {
      isConnected: false,
      status: 'disconnected',
      customerId: '',
      customerName: '',
      mccId: '',
      developerTokenStatus: 'approved',
      diagnostics: ['Cuenta desconectada por el usuario.']
    };
    setGoogleState(updated);
    onUpdateGoogleState?.(updated);
    setGoogleSuccessNotice(null);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header unificado de Conexiones */}
      <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 shadow-xs space-y-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-50/80 border border-blue-100 flex items-center justify-center text-blue-600 shadow-2xs shrink-0">
            <TicoIconAgent className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 font-['Outfit']">
              Centro de Conexiones Publicitarias
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Conecta tus cuentas de publicidad para gestionar y optimizar tus campañas desde TICO.
            </p>
          </div>
        </div>

        {/* Tarjetas de Plataformas (Google Ads & Meta Ads) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          {/* Tarjeta Google Ads */}
          <button
            type="button"
            onClick={() => setActivePlatform('google')}
            className={`p-5 sm:p-6 rounded-2xl border transition-all text-left flex items-center justify-between cursor-pointer group ${
              activePlatform === 'google'
                ? 'border-blue-500 bg-blue-50/20 ring-2 ring-blue-500/20 shadow-xs'
                : 'border-blue-300/80 hover:border-blue-400 bg-white hover:bg-slate-50/50'
            }`}
          >
            <div className="flex items-center gap-4 sm:gap-5 min-w-0">
              <GoogleAdsBrandLogo className="w-12 h-12 shrink-0 drop-shadow-xs" />
              <div className="min-w-0">
                <div className="text-base sm:text-lg font-extrabold text-slate-900 font-['Outfit'] flex items-center gap-2">
                  <span>Google Ads</span>
                  {googleState.isConnected && (
                    <span className="w-2 h-2 rounded-full bg-emerald-500" title="Conectado" />
                  )}
                </div>
                <p className="text-xs text-slate-500 mt-0.5 leading-relaxed truncate sm:whitespace-normal">
                  Conecta tu cuenta de Google Ads para impulsar tus campañas.
                </p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-blue-500 shrink-0 ml-3 transition-transform group-hover:translate-x-0.5" />
          </button>

          {/* Tarjeta Meta Ads */}
          <button
            type="button"
            onClick={() => setActivePlatform('meta')}
            className={`p-5 sm:p-6 rounded-2xl border transition-all text-left flex items-center justify-between cursor-pointer group ${
              activePlatform === 'meta'
                ? 'border-blue-500 bg-blue-50/20 ring-2 ring-blue-500/20 shadow-xs'
                : 'border-blue-300/80 hover:border-blue-400 bg-white hover:bg-slate-50/50'
            }`}
          >
            <div className="flex items-center gap-4 sm:gap-5 min-w-0">
              <MetaBrandLogo className="w-12 h-12 shrink-0 object-contain drop-shadow-xs" />
              <div className="min-w-0">
                <div className="text-base sm:text-lg font-extrabold text-slate-900 font-['Outfit'] flex items-center gap-2">
                  <span>Meta Ads</span>
                  {metaState.status === 'ready_to_deploy' && (
                    <span className="w-2 h-2 rounded-full bg-emerald-500" title="Listo para desplegar" />
                  )}
                </div>
                <p className="text-xs text-slate-500 mt-0.5 leading-relaxed truncate sm:whitespace-normal">
                  Conecta tu cuenta de Meta Ads para gestionar tus campañas.
                </p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-blue-500 shrink-0 ml-3 transition-transform group-hover:translate-x-0.5" />
          </button>
        </div>
      </div>

      {/* Contenido Dinámico según la pestaña activa */}
      {activePlatform === 'meta' && (
        <MetaConnectDiagnostic
          metaState={metaState}
          onUpdateMetaState={onUpdateMetaState}
        />
      )}

      {activePlatform === 'google' && (
        <div className="space-y-6">
          {googleSuccessNotice && (
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-bold flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>{googleSuccessNotice}</span>
              </div>
              <button 
                type="button" 
                onClick={() => setGoogleSuccessNotice(null)} 
                className="text-emerald-700 hover:text-emerald-950 font-extrabold cursor-pointer"
              >
                ✕
              </button>
            </div>
          )}

          <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 shadow-xs space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-lg font-extrabold text-slate-900 font-['Outfit'] flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-white border border-slate-200/90 flex items-center justify-center shadow-2xs">
                    <GoogleAdsBrandLogo className="w-5 h-5" />
                  </div>
                  <span>Conexión con Google Ads API</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Conecta tu ID de Cliente (Customer ID / CID) o Administrador MCC para orquestar campañas de Búsqueda y PMax.
                </p>
              </div>

              {googleState.isConnected && (
                <button
                  type="button"
                  onClick={handleDisconnectGoogle}
                  className="px-3.5 py-1.5 rounded-full text-xs font-bold text-rose-600 hover:bg-rose-50 border border-rose-200 transition-colors cursor-pointer"
                >
                  Desconectar Google
                </button>
              )}
            </div>

            {/* Formulario de Conexión Google Ads */}
            <form onSubmit={handleConnectGoogle} className="space-y-4 max-w-xl">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Google Ads Customer ID (CID)
                </label>
                <input
                  type="text"
                  value={inputCustomerId}
                  onChange={(e) => setInputCustomerId(e.target.value)}
                  placeholder="Ej. 123-456-7890 o 1234567890"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 font-mono"
                />
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Encuentra este número de 10 dígitos en la esquina superior derecha de tu cuenta de Google Ads.
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  ID de Administrador MCC (Opcional)
                </label>
                <input
                  type="text"
                  value={inputMccId}
                  onChange={(e) => setInputMccId(e.target.value)}
                  placeholder="Ej. 987-654-3210 (si gestionas mediante cuenta administradora)"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 font-mono"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isConnectingGoogle}
                  className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-xs transition-all cursor-pointer flex items-center gap-2"
                >
                  {isConnectingGoogle ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Verificando con Google Ads API...</span>
                    </>
                  ) : (
                    <>
                      <Key className="w-3.5 h-3.5" />
                      <span>{googleState.isConnected ? 'Actualizar Vinculación' : 'Vincular Google Ads'}</span>
                    </>
                  )}
                </button>
              </div>
            </form>

            {/* Diagnóstico de Google */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
              <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
                Diagnóstico de Integración Google Ads
              </span>
              <div className="space-y-1.5">
                {googleState.diagnostics.map((d, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs text-slate-600">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400 mt-1.5 shrink-0" />
                    <span>{d}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Enlace a Consola de Desarrolladores de Google */}
            <div className="pt-2 flex items-center gap-4 text-xs text-slate-500">
              <a
                href="https://ads.google.com"
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 font-bold text-red-600 hover:underline"
              >
                <span>Google Ads Manager</span>
                <ExternalLink className="w-3 h-3" />
              </a>
              <span>•</span>
              <a
                href="https://developers.google.com/google-ads/api/docs/first-call/overview"
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 font-bold text-slate-600 hover:underline"
              >
                <span>Documentación Google Ads API</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
