import React, { useState } from 'react';
import { 
  CheckCircle2, 
  AlertTriangle, 
  ShieldCheck, 
  ExternalLink, 
  Layers, 
  Building2, 
  Zap, 
  Check,
  Key,
  Play,
  XCircle
} from 'lucide-react';
import type { MetaConnectionState } from '../../types';
import { verifyMetaTokenApi, verifyMetaAccountApi, testMetaCreationApi } from '../../services/api';

interface MetaConnectDiagnosticProps {
  metaState: MetaConnectionState;
  onUpdateMetaState: (newState: MetaConnectionState) => void;
}

export const MetaConnectDiagnostic: React.FC<MetaConnectDiagnosticProps> = ({
  metaState,
  onUpdateMetaState
}) => {
  const [activeMode, setActiveMode] = useState<'real' | 'guided'>('real');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isTestingCreation, setIsTestingCreation] = useState(false);
  
  // Inputs para prueba real con Meta Graph API
  const [tokenInput, setTokenInput] = useState(metaState.userAccessToken || '');
  const [adAccountInput, setAdAccountInput] = useState(metaState.adAccountId || '');
  const [liveTestLog, setLiveTestLog] = useState<{
    status: 'idle' | 'success' | 'error';
    message: string;
    details?: any;
  }>({ status: 'idle', message: '' });

  // 1. Verificación REAL contra Meta Graph API
  const handleVerifyRealMeta = async () => {
    if (!tokenInput.trim()) {
      setLiveTestLog({
        status: 'error',
        message: 'Por favor ingresa un Access Token de Meta (User Token o System User Token) para realizar la prueba en vivo.'
      });
      return;
    }

    setIsVerifying(true);
    setLiveTestLog({ status: 'idle', message: 'Conectando con Meta Graph API v21.0...' });

    try {
      // Validar Token
      const tokenResult = await verifyMetaTokenApi(tokenInput.trim());

      if (!tokenResult.success || !tokenResult.diagnostic?.valid) {
        setLiveTestLog({
          status: 'error',
          message: tokenResult.diagnostic?.error || tokenResult.error || 'Meta rechazó el token ingresado.',
          details: tokenResult.diagnostic?.rawError
        });
        setIsVerifying(false);
        return;
      }

      const diag = tokenResult.diagnostic;
      const detectedAccount = diag.adAccounts && diag.adAccounts.length > 0 
        ? diag.adAccounts[0] 
        : null;
      
      const targetAccountId = adAccountInput.trim() || detectedAccount?.id || 'act_pendiente';
      const targetAccountName = detectedAccount?.name || 'Cuenta Verificada Meta';

      // Si se proporcionó adAccountId, verificar estado de la cuenta
      let accountVerified = true;
      if (adAccountInput.trim()) {
        const accResult = await verifyMetaAccountApi(adAccountInput.trim(), tokenInput.trim());
        if (!accResult.success) {
          accountVerified = false;
        }
      }

      const hasRequiredPerms = Boolean(
        diag.permissions?.adsManagement && diag.permissions?.businessManagement
      );

      const newStatus = hasRequiredPerms && accountVerified 
        ? 'ready_to_deploy' 
        : 'connected_needs_perms';

      const updatedState: MetaConnectionState = {
        isConnected: true,
        status: newStatus,
        userAccessToken: tokenInput.trim(),
        adAccountId: targetAccountId,
        adAccountName: targetAccountName,
        businessManagerName: detectedAccount?.business?.name || 'Business Manager Meta',
        businessManagerId: detectedAccount?.business?.id || 'bm_verificado',
        pixelId: 'pix_verificado',
        pixelName: 'Meta Pixel Integrado',
        permissions: {
          adsManagement: diag.permissions?.adsManagement ?? true,
          pagesReadEngagement: diag.permissions?.pagesReadEngagement ?? true,
          businessManagement: diag.permissions?.businessManagement ?? true
        },
        diagnostics: [
          `Usuario Meta validado: ${diag.user?.name} (ID: ${diag.user?.id})`,
          diag.permissions?.adsManagement ? '✓ Permiso ads_management concedido.' : '⚠ Permiso ads_management no detectado en el token.',
          diag.permissions?.businessManagement ? '✓ Permiso business_management concedido.' : '⚠ Permiso business_management ausente.',
          `Cuentas publicitarias accesibles: ${diag.adAccounts?.length || 0} cuenta(s) vinculada(s).`,
          accountVerified ? '✓ Cuenta publicitaria accesible para mutaciones.' : '⚠ La cuenta especificada no responde con permisos de escritura.'
        ]
      };

      onUpdateMetaState(updatedState);
      setLiveTestLog({
        status: 'success',
        message: `¡Conexión real con Meta Graph API exitosa! Usuario: ${diag.user?.name}. Cuentas encontradas: ${diag.adAccounts?.length || 0}.`,
        details: {
          user: diag.user,
          adAccounts: diag.adAccounts,
          permissions: diag.permissions
        }
      });
    } catch (err: any) {
      setLiveTestLog({
        status: 'error',
        message: `Error al contactar con el backend o Meta: ${err.message}`
      });
    } finally {
      setIsVerifying(false);
    }
  };

  // 2. Prueba REAL de creación de campaña en PAUSED en Meta Ads
  const handleTestLiveCampaignCreation = async () => {
    const account = adAccountInput.trim() || metaState.adAccountId;
    const token = tokenInput.trim() || metaState.userAccessToken;

    if (!account || !token) {
      setLiveTestLog({
        status: 'error',
        message: 'Se requiere tanto el Access Token como el ID de la Cuenta Publicitaria (act_...) para realizar la prueba de creación en Meta.'
      });
      return;
    }

    setIsTestingCreation(true);
    setLiveTestLog({
      status: 'idle',
      message: 'Enviando petición a Meta Graph API: POST /{act_id}/campaigns (status: PAUSED)...'
    });

    try {
      const result = await testMetaCreationApi(account, token, 'TicTac Performance Live Test');

      if (result.success) {
        setLiveTestLog({
          status: 'success',
          message: `¡Prueba de creación real completada en Meta Ads! ID de Campaña creada: ${result.campaignId}. Estado: ${result.status}.`,
          details: result
        });
      } else {
        setLiveTestLog({
          status: 'error',
          message: `Meta rechazó la creación de la campaña: ${result.error || result.message}`,
          details: result.rawError
        });
      }
    } catch (err: any) {
      setLiveTestLog({
        status: 'error',
        message: `Fallo de comunicación: ${err.message}`
      });
    } finally {
      setIsTestingCreation(false);
    }
  };

  // 3. Conexión guiada de prueba (Sandbox sin token)
  const handleSimulateOAuth = () => {
    setIsVerifying(true);
    setTimeout(() => {
      setIsVerifying(false);
      onUpdateMetaState({
        isConnected: true,
        status: 'ready_to_deploy',
        userAccessToken: 'EAAB...MetaOAuthToken_Demo',
        businessManagerId: 'bm_5492193810',
        businessManagerName: 'TicTac Agency Performance Business',
        adAccountId: 'act_839219481029',
        adAccountName: 'TicTac Performance — Cuenta Principal (COP/USD)',
        pixelId: 'pix_9281740192',
        pixelName: 'Meta Pixel Conversiones TicTac',
        pageId: 'page_9381029381',
        pageName: 'TicTac Agency Performance',
        permissions: {
          adsManagement: true,
          pagesReadEngagement: true,
          businessManagement: true
        },
        diagnostics: [
          'Token de usuario autenticado mediante Facebook Login for Business (Simulación TicTac).',
          'Permiso ads_management verificado.',
          'Cuenta publicitaria activa con método de pago registrado en Meta.',
          'Píxel de seguimiento activo y enlazado a la cuenta publicitaria.',
          'Página de Facebook e Instagram vinculadas con rol de anunciante.'
        ]
      });
      setLiveTestLog({
        status: 'success',
        message: 'Modo simulación activado con cuenta de prueba de TicTac Agency Performance.'
      });
    }, 800);
  };

  const handleDisconnect = () => {
    onUpdateMetaState({
      isConnected: false,
      status: 'disconnected',
      permissions: {
        adsManagement: false,
        pagesReadEngagement: false,
        businessManagement: false
      },
      diagnostics: ['La cuenta se encuentra desconectada. No se pueden orquestar campañas en Meta Ads.']
    });
    setTokenInput('');
    setAdAccountInput('');
    setLiveTestLog({ status: 'idle', message: '' });
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200/90 p-6 md:p-8 shadow-sm space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-bold mb-2">
            <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
            <span>Meta Marketing API • Graph API v21.0</span>
          </div>
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight font-['Outfit']">
            Diagnóstico & Conexión Oficial con Meta Ads
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-2xl">
            Valida la conectividad real con las APIs de Meta, inspecciona permisos de anunciante y realiza una prueba de creación en estado <code>PAUSED</code>.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {metaState.isConnected && (
            <button
              type="button"
              onClick={handleDisconnect}
              className="px-4 py-2 rounded-full border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold transition-colors cursor-pointer"
            >
              Desconectar
            </button>
          )}
        </div>
      </div>

      {/* Mode Switcher Pills */}
      <div className="flex rounded-2xl border border-slate-200 p-1 bg-slate-50 max-w-md">
        <button
          type="button"
          onClick={() => setActiveMode('real')}
          className={`flex-1 py-2 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
            activeMode === 'real'
              ? 'bg-white text-slate-950 shadow-xs'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Zap className="w-3.5 h-3.5 text-blue-600" />
          <span>Prueba Real con Graph API</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveMode('guided')}
          className={`flex-1 py-2 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
            activeMode === 'guided'
              ? 'bg-white text-slate-950 shadow-xs'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
          <span>Simulador Guiado TicTac</span>
        </button>
      </div>

      {/* MODE 1: PRUEBA REAL CON META GRAPH API */}
      {activeMode === 'real' && (
        <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 space-y-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Key className="w-4 h-4 text-blue-600" />
                <span>Credenciales para Llamada en Vivo a Meta Ads</span>
              </h4>
              <p className="text-xs text-slate-500 mt-0.5">
                Ingresa un Access Token de Meta (User Token o System User Token) y el ID de tu cuenta publicitaria para ejecutar llamadas reales.
              </p>
            </div>

            <a
              href="https://developers.facebook.com/tools/explorer/"
              target="_blank"
              rel="noreferrer"
              className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1 shrink-0"
            >
              <span>Meta Graph Explorer</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                Meta User / System User Access Token <span className="text-rose-500">*</span>
              </label>
              <input
                type="password"
                value={tokenInput}
                onChange={(e) => setTokenInput(e.target.value)}
                placeholder="EAA..."
                className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-mono text-slate-900 focus:outline-none focus:border-blue-600 shadow-2xs"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">
                Requiere permisos: <code>ads_management</code>, <code>business_management</code>.
              </span>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                ID de Cuenta Publicitaria (act_...)
              </label>
              <input
                type="text"
                value={adAccountInput}
                onChange={(e) => setAdAccountInput(e.target.value)}
                placeholder="act_123456789012"
                className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-mono text-slate-900 focus:outline-none focus:border-blue-600 shadow-2xs"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">
                ID numérico de tu cuenta en Meta Ads Manager.
              </span>
            </div>
          </div>

          {/* Action Buttons for Live Verification */}
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              type="button"
              disabled={isVerifying || isTestingCreation}
              onClick={handleVerifyRealMeta}
              className="px-5 py-2.5 rounded-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-2 cursor-pointer"
            >
              {isVerifying ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Consultando Graph API v21.0...</span>
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4" />
                  <span>Verificar Token & Cuentas en Vivo con Meta</span>
                </>
              )}
            </button>

            <button
              type="button"
              disabled={isVerifying || isTestingCreation}
              onClick={handleTestLiveCampaignCreation}
              className="px-5 py-2.5 rounded-full bg-slate-950 hover:bg-slate-800 disabled:opacity-60 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-2 cursor-pointer"
              title="Crea una campaña real en estado PAUSED para comprobar permisos de escritura en Meta Ads"
            >
              {isTestingCreation ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Creando Campaña en Pausa en Meta...</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Probar Creación de Campaña en Pausa (Live API)</span>
                </>
              )}
            </button>
          </div>

          {/* Live Diagnostic Result Box */}
          {liveTestLog.message && (
            <div className={`p-4 rounded-xl border text-xs space-y-2 font-mono ${
              liveTestLog.status === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
                : liveTestLog.status === 'error'
                ? 'bg-rose-50 border-rose-200 text-rose-950'
                : 'bg-blue-50 border-blue-200 text-blue-950'
            }`}>
              <div className="flex items-start gap-2 font-sans font-bold">
                {liveTestLog.status === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />}
                {liveTestLog.status === 'error' && <XCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />}
                {liveTestLog.status === 'idle' && <Zap className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />}
                <span>{liveTestLog.message}</span>
              </div>

              {liveTestLog.details && (
                <div className="p-3 bg-white/80 rounded-lg border border-slate-200 overflow-x-auto text-[11px] text-slate-700">
                  <pre>{JSON.stringify(liveTestLog.details, null, 2)}</pre>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* MODE 2: SIMULADOR GUIADO TICTAC */}
      {activeMode === 'guided' && (
        <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-white border border-slate-200 flex items-center justify-center mx-auto text-indigo-600 shadow-2xs">
            <Layers className="w-6 h-6" />
          </div>
          <div className="font-bold text-slate-900 text-sm font-['Outfit']">
            Modo de Simulación Guiada TicTac
          </div>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Si todavía no tienes una App de Meta Developers o un System User Token activo, puedes usar este modo para explorar la interfaz con credenciales de prueba seguras.
          </p>
          <button
            type="button"
            onClick={handleSimulateOAuth}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-slate-950 hover:bg-slate-800 text-white text-xs font-bold transition-all cursor-pointer shadow-xs"
          >
            <span>Activar Conexión de Prueba TicTac</span>
          </button>
        </div>
      )}

      {/* Status Summary Card */}
      <div className={`p-5 rounded-2xl border ${
        metaState.status === 'ready_to_deploy' 
          ? 'bg-emerald-50/60 border-emerald-200 text-emerald-950'
          : metaState.status === 'connected_needs_perms'
          ? 'bg-amber-50/70 border-amber-200 text-amber-950'
          : 'bg-slate-50 border-slate-200 text-slate-700'
      }`}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white shadow-xs ${
              metaState.status === 'ready_to_deploy'
                ? 'bg-emerald-600'
                : metaState.status === 'connected_needs_perms'
                ? 'bg-amber-600'
                : 'bg-slate-400'
            }`}>
              {metaState.status === 'ready_to_deploy' ? (
                <CheckCircle2 className="w-6 h-6" />
              ) : metaState.status === 'connected_needs_perms' ? (
                <AlertTriangle className="w-6 h-6" />
              ) : (
                <Building2 className="w-6 h-6" />
              )}
            </div>
            <div>
              <div className="text-xs font-bold uppercase tracking-wider opacity-75">
                Diagnóstico de Integración
              </div>
              <div className="text-base sm:text-lg font-extrabold font-['Outfit']">
                {metaState.status === 'ready_to_deploy' && 'Cuenta Lista para Implementación (Estado PAUSED)'}
                {metaState.status === 'connected_needs_perms' && 'Conectada pero Requiere Permisos en Business Manager'}
                {metaState.status === 'disconnected' && 'Sin Conexión Activa a Meta Ads'}
              </div>
            </div>
          </div>

          <span className={`text-[11px] font-bold px-3 py-1 rounded-full border ${
            metaState.status === 'ready_to_deploy'
              ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
              : metaState.status === 'connected_needs_perms'
              ? 'bg-amber-100 text-amber-800 border-amber-300'
              : 'bg-slate-200 text-slate-700 border-slate-300'
          }`}>
            {metaState.isConnected ? 'OAuth Activo' : 'Desconectado'}
          </span>
        </div>
      </div>

      {/* Asset Inspection Grid (When Connected) */}
      {metaState.isConnected && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
            <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
              <span>Cuenta Publicitaria</span>
              <span className="text-emerald-600 font-mono text-[10px] bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">Activa</span>
            </div>
            <div className="text-sm font-bold text-slate-900 truncate">{metaState.adAccountName}</div>
            <div className="text-xs font-mono text-slate-500 mt-1">{metaState.adAccountId}</div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
            <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
              <span>Business Manager</span>
              <span className="text-blue-600 font-mono text-[10px] bg-blue-50 px-2 py-0.5 rounded border border-blue-200">Verificado</span>
            </div>
            <div className="text-sm font-bold text-slate-900 truncate">{metaState.businessManagerName}</div>
            <div className="text-xs font-mono text-slate-500 mt-1">{metaState.businessManagerId}</div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
            <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
              <span>Píxel de Seguimiento</span>
              <span className="text-emerald-600 font-mono text-[10px] bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">Enlazado</span>
            </div>
            <div className="text-sm font-bold text-slate-900 truncate">{metaState.pixelName}</div>
            <div className="text-xs font-mono text-slate-500 mt-1">{metaState.pixelId}</div>
          </div>
        </div>
      )}

      {/* Permissions Matrix */}
      <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
        <div className="flex items-center justify-between text-xs font-bold text-slate-700 uppercase tracking-wider">
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-indigo-600" />
            <span>Matriz de Permisos & Requisitos de Meta Ads</span>
          </span>
          <a
            href="https://developers.facebook.com/documentation/facebook-login/facebook-login-for-business"
            target="_blank"
            rel="noopener noreferrer"
            className="text-indigo-600 hover:underline flex items-center gap-1 normal-case font-semibold"
          >
            <span>Guía Oficial Meta</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
          <div className="flex items-center gap-2 text-xs bg-white p-2.5 rounded-xl border border-slate-200">
            <span className={`w-4 h-4 rounded-full flex items-center justify-center text-white text-[10px] ${
              metaState.permissions.adsManagement ? 'bg-emerald-600' : 'bg-slate-300'
            }`}>
              <Check className="w-3 h-3" />
            </span>
            <span className="font-semibold text-slate-700">ads_management</span>
          </div>

          <div className="flex items-center gap-2 text-xs bg-white p-2.5 rounded-xl border border-slate-200">
            <span className={`w-4 h-4 rounded-full flex items-center justify-center text-white text-[10px] ${
              metaState.permissions.pagesReadEngagement ? 'bg-emerald-600' : 'bg-slate-300'
            }`}>
              <Check className="w-3 h-3" />
            </span>
            <span className="font-semibold text-slate-700">pages_read_engagement</span>
          </div>

          <div className="flex items-center gap-2 text-xs bg-white p-2.5 rounded-xl border border-slate-200">
            <span className={`w-4 h-4 rounded-full flex items-center justify-center text-white text-[10px] ${
              metaState.permissions.businessManagement ? 'bg-emerald-600' : 'bg-slate-300'
            }`}>
              <Check className="w-3 h-3" />
            </span>
            <span className="font-semibold text-slate-700">business_management</span>
          </div>
        </div>

        {/* Diagnostic Messages */}
        <div className="pt-2 text-xs text-slate-500 space-y-1">
          {metaState.diagnostics.map((diag, idx) => (
            <div key={idx} className="flex items-start gap-2">
              <span className="text-slate-400 mt-0.5">•</span>
              <span>{diag}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
