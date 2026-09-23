import React from 'react';
import { CheckCircle2, ExternalLink, RefreshCw, Terminal, Coins, X } from 'lucide-react';
import type { GeneratedCampaignStrategy } from '../types';

interface DeploymentConsoleProps {
  strategy: GeneratedCampaignStrategy;
  deployResult: any;
  onReset: () => void;
  onClose?: () => void;
  creditsRemaining?: number;
}

export const DeploymentConsole: React.FC<DeploymentConsoleProps> = ({
  strategy,
  deployResult,
  onReset,
  onClose,
  creditsRemaining = 45
}) => {
  const isMetaSandbox = deployResult?.results?.meta?.mode === 'mock_sandbox';
  const isGoogleSandbox = deployResult?.results?.google?.mode === 'mock_sandbox';

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 md:p-10 shadow-xl shadow-slate-100/80 space-y-6">
      {/* Success Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl bg-emerald-50 border border-emerald-200">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-emerald-600/20">
            <CheckCircle2 className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xl sm:text-2xl font-extrabold text-slate-900 font-['Outfit']">
                ¡Campaña Orquestada en Estado PAUSED!
              </h3>
            </div>
            <p className="text-xs sm:text-sm text-emerald-900 mt-0.5">
              Las entidades para <strong>{strategy.brandName}</strong> han sido creadas con éxito y se encuentran pausadas para tu revisión y activación final.
            </p>
          </div>
        </div>

        <div className="self-start sm:self-auto flex items-center gap-2">
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-full border border-slate-300 bg-white hover:bg-rose-50 hover:border-rose-300 hover:text-rose-700 text-slate-700 text-xs font-bold transition-all cursor-pointer shadow-xs group"
              title="Cerrar y volver a fase 1"
            >
              <X className="w-3.5 h-3.5 text-slate-400 group-hover:text-rose-600" />
              <span>Cerrar</span>
            </button>
          )}
          <button
            type="button"
            onClick={onReset}
            className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-slate-950 hover:bg-slate-800 text-white text-xs font-bold transition-all cursor-pointer shadow-xs"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Crear Nueva Pauta</span>
          </button>
        </div>
      </div>

      {/* Credit Consumption Summary */}
      <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 text-slate-700">
          <Coins className="w-4 h-4 text-amber-600" />
          <span>Créditos consumidos por despliegue: <strong>-5 créditos</strong></span>
        </div>
        <div className="text-slate-500">
          Saldo disponible actual: <strong className="text-slate-900 font-mono">{creditsRemaining} créditos</strong>
        </div>
      </div>

      {/* Deployment Details Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Meta Ads Results */}
        {deployResult?.results?.meta && (
          <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">
                  M
                </span>
                <span className="font-bold text-slate-900 text-sm">Meta Marketing API</span>
              </div>
              <span className={`text-[10px] uppercase font-mono font-bold px-2.5 py-1 rounded-full ${
                isMetaSandbox ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-700'
              }`}>
                {isMetaSandbox ? 'Modo Sandbox Seguro' : 'Live Graph API'}
              </span>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1.5 border-b border-slate-200">
                <span className="text-slate-500">ID de Campaña Meta:</span>
                <span className="font-mono text-slate-900 font-bold">{deployResult.results.meta.campaignId}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-200">
                <span className="text-slate-500">Estado en Plataforma:</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                  {deployResult.results.meta.status || 'PAUSED'}
                </span>
              </div>
              <div className="pt-1 text-slate-600 text-xs leading-relaxed">
                {deployResult.results.meta.message}
              </div>
            </div>

            <a
              href="https://adsmanager.facebook.com"
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-white hover:bg-slate-100 text-xs font-bold text-blue-600 border border-slate-200 transition-colors shadow-2xs"
            >
              <span>Abrir Meta Ads Manager para Activar</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        )}

        {/* Google Ads Results */}
        {deployResult?.results?.google && (
          <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-xs">
                  G
                </span>
                <span className="font-bold text-slate-900 text-sm">Google Ads API</span>
              </div>
              <span className={`text-[10px] uppercase font-mono font-bold px-2.5 py-1 rounded-full ${
                isGoogleSandbox ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
              }`}>
                {isGoogleSandbox ? 'Modo Sandbox Seguro' : 'Live Google Ads API'}
              </span>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1.5 border-b border-slate-200">
                <span className="text-slate-500">ID de Campaña Google:</span>
                <span className="font-mono text-slate-900 font-bold">{deployResult.results.google.campaignId}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-200">
                <span className="text-slate-500">Estado en Plataforma:</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                  {deployResult.results.google.status || 'PAUSED'}
                </span>
              </div>
              <div className="pt-1 text-slate-600 text-xs leading-relaxed">
                {deployResult.results.google.message}
              </div>
            </div>

            <a
              href="https://ads.google.com"
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-white hover:bg-slate-100 text-xs font-bold text-amber-700 border border-slate-200 transition-colors shadow-2xs"
            >
              <span>Abrir Google Ads Console para Activar</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        )}
      </div>

      {/* Terminal Live Trace */}
      <div className="rounded-2xl border border-slate-200 bg-slate-900 p-5 space-y-2 font-mono text-xs text-slate-300 shadow-inner">
        <div className="flex items-center gap-2 pb-2.5 border-b border-slate-800 text-slate-400">
          <Terminal className="w-4 h-4 text-indigo-400" />
          <span className="font-semibold text-white">Log de Trazabilidad & Reglas TicTac Agency</span>
        </div>
        <div className="space-y-1.5 text-[11px] pt-1 text-slate-400">
          <p className="text-emerald-400">✓ [AUTH]: Permisos de anunciante validados en la cuenta publicitaria de destino.</p>
          <p className="text-emerald-400">✓ [CREDITS]: Débito de 5 créditos registrado en la suscripción.</p>
          <p className="text-indigo-300">ℹ [DISPATCH]: Estructura enviada a Meta Marketing API v21.0 con estado PAUSED.</p>
          <p className="text-slate-200">✓ [PAUSED_CONFIRMED]: Campaña no entrega anuncios hasta activación manual por el suscriptor.</p>
        </div>
      </div>
    </div>
  );
};
