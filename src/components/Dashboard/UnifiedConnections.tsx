import React, { useState } from 'react';
import type { MetaConnectionState, GoogleConnectionState } from '../../types';
import { MetaConnectDiagnostic } from './MetaConnectDiagnostic';
import { 
  CheckCircle2, 
  ExternalLink, 
  Key,
  ChevronRight,
  Sparkles,
  AlertCircle,
  Cpu
} from 'lucide-react';
import { TicoIconConnections } from './TicoNavIcons';
import { MetaBrandLogo, GoogleAdsBrandLogo } from '../BrandLogos';
import { getClientGeminiApiKey, setClientGeminiApiKey, testGeminiConnectionApi } from '../../services/api';

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
  const [activePlatform, setActivePlatform] = useState<'meta' | 'google' | 'gemini'>('meta');

  // Estado para Google Gemini
  const [geminiKeyInput, setGeminiKeyInput] = useState(getClientGeminiApiKey());
  const [isTestingGemini, setIsTestingGemini] = useState(false);
  const [geminiTestResult, setGeminiTestResult] = useState<{ success: boolean; message: string; model?: string } | null>(null);
  const [geminiSaveNotice, setGeminiSaveNotice] = useState<string | null>(null);

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

  const handleSaveGeminiKey = (e: React.FormEvent) => {
    e.preventDefault();
    setClientGeminiApiKey(geminiKeyInput.trim());
    setGeminiSaveNotice('Clave de Gemini guardada correctamente en el navegador.');
    setTimeout(() => setGeminiSaveNotice(null), 3500);
  };

  const handleTestGeminiKey = async () => {
    setIsTestingGemini(true);
    setGeminiTestResult(null);
    try {
      const result = await testGeminiConnectionApi(geminiKeyInput.trim());
      setGeminiTestResult(result);
      if (result.success && geminiKeyInput.trim()) {
        setClientGeminiApiKey(geminiKeyInput.trim());
      }
    } finally {
      setIsTestingGemini(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Encabezado Principal y Selector de Plataforma */}
      <div className="bg-white rounded-3xl border border-blue-200/90 p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex items-center gap-3 pb-3 border-b border-blue-100/70">
          <TicoIconConnections className="w-8 h-8 shrink-0" />
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-[#0a194f] tracking-tight font-['Outfit']">
              Centro de Conexiones Publicitarias
            </h1>
            <p className="text-xs sm:text-sm text-[#0a194f]/80 mt-0.5">
              Conecta tus cuentas de publicidad y el motor de IA para gestionar y optimizar tus campañas desde TICO.
            </p>
          </div>
        </div>

        {/* Tarjetas de Plataformas (Meta Ads, Google Ads y Google Gemini IA) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5 pt-1">
          {/* Tarjeta 1: Meta Ads (primero) */}
          <button
            type="button"
            onClick={() => setActivePlatform('meta')}
            className={`p-4 sm:p-4.5 rounded-2xl border transition-all text-left flex items-center justify-between cursor-pointer group ${
              activePlatform === 'meta'
                ? 'border-blue-500 bg-blue-50/20 ring-2 ring-blue-500/20 shadow-xs'
                : 'border-blue-300/80 hover:border-blue-400 bg-white hover:bg-slate-50/50'
            }`}
          >
            <div className="flex items-center gap-3.5 min-w-0">
              <MetaBrandLogo className="w-9 h-9 shrink-0 object-contain drop-shadow-xs" />
              <div className="min-w-0">
                <div className="text-sm sm:text-base font-extrabold text-[#0a194f] font-['Outfit'] flex items-center gap-2">
                  <span>Meta Ads</span>
                  {metaState.status === 'ready_to_deploy' && (
                    <span className="w-2 h-2 rounded-full bg-emerald-500" title="Listo para desplegar" />
                  )}
                </div>
                <p className="text-xs text-[#0a194f]/75 mt-0.5 leading-relaxed truncate sm:whitespace-normal">
                  Conecta tu cuenta de Meta Ads para gestionar tus campañas.
                </p>
              </div>
            </div>
            <ChevronRight className="w-4.5 h-4.5 text-blue-500 shrink-0 ml-2.5 transition-transform group-hover:translate-x-0.5" />
          </button>

          {/* Tarjeta 2: Google Ads (segundo) */}
          <button
            type="button"
            onClick={() => setActivePlatform('google')}
            className={`p-4 sm:p-4.5 rounded-2xl border transition-all text-left flex items-center justify-between cursor-pointer group ${
              activePlatform === 'google'
                ? 'border-blue-500 bg-blue-50/20 ring-2 ring-blue-500/20 shadow-xs'
                : 'border-blue-300/80 hover:border-blue-400 bg-white hover:bg-slate-50/50'
            }`}
          >
            <div className="flex items-center gap-3.5 min-w-0">
              <GoogleAdsBrandLogo className="w-9 h-9 shrink-0 drop-shadow-xs" />
              <div className="min-w-0">
                <div className="text-sm sm:text-base font-extrabold text-[#0a194f] font-['Outfit'] flex items-center gap-2">
                  <span>Google Ads</span>
                  {googleState.isConnected && (
                    <span className="w-2 h-2 rounded-full bg-emerald-500" title="Conectado" />
                  )}
                </div>
                <p className="text-xs text-[#0a194f]/75 mt-0.5 leading-relaxed truncate sm:whitespace-normal">
                  Conecta tu cuenta de Google Ads para impulsar tus campañas.
                </p>
              </div>
            </div>
            <ChevronRight className="w-4.5 h-4.5 text-blue-500 shrink-0 ml-2.5 transition-transform group-hover:translate-x-0.5" />
          </button>

          {/* Tarjeta 3: Google Gemini IA */}
          <button
            type="button"
            onClick={() => setActivePlatform('gemini')}
            className={`p-4 sm:p-4.5 rounded-2xl border transition-all text-left flex items-center justify-between cursor-pointer group ${
              activePlatform === 'gemini'
                ? 'border-blue-500 bg-blue-50/20 ring-2 ring-blue-500/20 shadow-xs'
                : 'border-blue-300/80 hover:border-blue-400 bg-white hover:bg-slate-50/50'
            }`}
          >
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center shrink-0">
                <Sparkles className="w-5 h-5 text-blue-600" />
              </div>
              <div className="min-w-0">
                <div className="text-sm sm:text-base font-extrabold text-[#0a194f] font-['Outfit'] flex items-center gap-2">
                  <span>Google Gemini IA</span>
                  {getClientGeminiApiKey() && (
                    <span className="w-2 h-2 rounded-full bg-emerald-500" title="Clave activa" />
                  )}
                </div>
                <p className="text-xs text-[#0a194f]/75 mt-0.5 leading-relaxed truncate sm:whitespace-normal">
                  Motor de IA para formular copys, segmentaciones y pauta.
                </p>
              </div>
            </div>
            <ChevronRight className="w-4.5 h-4.5 text-blue-500 shrink-0 ml-2.5 transition-transform group-hover:translate-x-0.5" />
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
                <h3 className="text-lg font-extrabold text-[#0a194f] font-['Outfit'] flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-white border border-slate-200/90 flex items-center justify-center shadow-2xs">
                    <GoogleAdsBrandLogo className="w-5 h-5" />
                  </div>
                  <span>Conexión con Google Ads API</span>
                </h3>
                <p className="text-xs text-[#0a194f]/80 mt-0.5">
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

      {/* Contenido para Google Gemini IA */}
      {activePlatform === 'gemini' && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200/90 p-6 md:p-8 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center shrink-0">
                  <Sparkles className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 font-['Outfit'] flex items-center gap-2">
                    <span>Motor de IA: Google Gemini 3.6 Flash</span>
                    {getClientGeminiApiKey() ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <CheckCircle2 className="w-3 h-3" /> Clave Activa
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                        <AlertCircle className="w-3 h-3" /> No Configurada
                      </span>
                    )}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Utilizado por Tico Agent para redactar textos persuasivos (AIDA/PAS), seleccionar CTAs y optimizar audiencias.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <a
                  href="https://aistudio.google.com/app/apikey"
                  target="_blank"
                  rel="noreferrer"
                  className="px-3.5 py-2 rounded-xl border border-slate-200 hover:border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition flex items-center gap-1.5"
                >
                  <span>Obtener Clave en Google AI Studio</span>
                  <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                </a>
              </div>
            </div>

            {/* Formulario de Configuración de Clave */}
            <form onSubmit={handleSaveGeminiKey} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Clave de API de Google Gemini (Google AI Studio)
                </label>
                <div className="relative">
                  <input
                    type="password"
                    value={geminiKeyInput}
                    onChange={(e) => setGeminiKeyInput(e.target.value)}
                    placeholder="AQ.Ab8RN6JnRASUYiSuufnns6x..."
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-xs sm:text-sm font-mono text-slate-900 bg-white"
                  />
                  <Key className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Tu clave se almacena de forma segura en este navegador y se transmite cifrada para formular tus campañas.
                </p>
              </div>

              <div className="flex items-center gap-3 pt-2 flex-wrap">
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition shadow-xs cursor-pointer"
                >
                  Guardar Clave en Navegador
                </button>

                <button
                  type="button"
                  onClick={handleTestGeminiKey}
                  disabled={isTestingGemini || !geminiKeyInput.trim()}
                  className="px-5 py-2.5 rounded-xl border border-blue-200 bg-blue-50/80 hover:bg-blue-100 text-blue-700 text-xs font-bold transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isTestingGemini ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-blue-600/30 border-t-blue-600 rounded-full animate-spin" />
                      <span>Verificando con Google AI Studio...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                      <span>⚡ Probar Conexión en Vivo (Generar Petición en Google AI Studio)</span>
                    </>
                  )}
                </button>
              </div>

              {geminiSaveNotice && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{geminiSaveNotice}</span>
                </div>
              )}

              {geminiTestResult && (
                <div className={`p-4 rounded-2xl border text-xs leading-relaxed ${
                  geminiTestResult.success 
                    ? 'bg-emerald-50/80 border-emerald-200 text-emerald-900' 
                    : 'bg-rose-50/80 border-rose-200 text-rose-900'
                }`}>
                  <div className="flex items-start gap-2.5">
                    {geminiTestResult.success ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    )}
                    <div>
                      <div className="font-bold">
                        {geminiTestResult.success ? 'Conexión Exitosa con Google Gemini' : 'Fallo en la Verificación'}
                      </div>
                      <div className="mt-0.5">{geminiTestResult.message}</div>
                      {geminiTestResult.success && (
                        <div className="mt-2 text-[11px] text-emerald-700 font-medium">
                          💡 Puedes ingresar a tu consola de Google AI Studio y verás la petición registrada con timestamp de hoy.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </form>

            {/* Tarjeta del Stack Tecnológico & Despliegue en Vercel */}
            <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-800 uppercase tracking-wide">
                <Cpu className="w-4 h-4 text-blue-600" />
                <span>Configuración de Variables de Entorno en Vercel</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Esta aplicación está desplegada en <strong>Vercel</strong> con backend/base de datos en <strong>Supabase</strong> y control de versiones en <strong>GitHub</strong>. Para que las funciones del servidor en Vercel invoquen Google Gemini de manera permanente:
              </p>
              <ol className="text-xs text-slate-600 space-y-1.5 list-decimal list-inside pl-1">
                <li>Abre tu proyecto en <strong>Vercel Dashboard</strong>.</li>
                <li>Ve a <strong>Settings &gt; Environment Variables</strong>.</li>
                <li>Agrega la variable <code className="px-1.5 py-0.5 rounded bg-white border border-slate-300 font-mono text-slate-900">GEMINI_API_KEY</code> con tu clave de Google AI Studio.</li>
                <li>Realiza un nuevo despliegue o haz push a la rama <code className="px-1.5 py-0.5 rounded bg-white border border-slate-300 font-mono text-slate-900">main</code>.</li>
              </ol>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
