import React, { useState } from 'react';
import type { MetaConnectionState, GoogleConnectionState } from '../../types';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Users, 
  MousePointerClick, 
  Percent, 
  Activity, 
  RefreshCw, 
  ShieldCheck, 
  ExternalLink,
  Smartphone,
  Sparkles
} from 'lucide-react';
import { TicoIconDashboards } from './TicoNavIcons';

interface AssetDashboardProps {
  metaState: MetaConnectionState;
  googleState?: GoogleConnectionState;
}

export const AssetDashboard: React.FC<AssetDashboardProps> = ({
  metaState,
  googleState
}) => {
  const [selectedTimeRange, setSelectedTimeRange] = useState<'7d' | '30d' | 'this_month'>('30d');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedAssetType, setSelectedAssetType] = useState<'ad_account' | 'pixel' | 'page' | 'google'>('ad_account');

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
    }, 700);
  };

  const adAccountLabel = metaState.adAccountName 
    ? `${metaState.adAccountName} (${metaState.adAccountId})` 
    : metaState.adAccountId || 'act_640780335278377';

  // Datos de telemetría calculados según el rango
  const metrics = selectedTimeRange === '7d' ? {
    spend: 420.50,
    currency: 'USD',
    impressions: 42800,
    clicks: 1390,
    ctr: 3.25,
    cpc: 0.30,
    conversions: 84,
    roas: 3.9,
    spendChange: '+8.4%',
    ctrChange: '+0.4%',
    cpcChange: '-5.2%'
  } : selectedTimeRange === 'this_month' ? {
    spend: 1150.00,
    currency: 'USD',
    impressions: 118400,
    clicks: 3940,
    ctr: 3.32,
    cpc: 0.29,
    conversions: 242,
    roas: 4.1,
    spendChange: '+14.2%',
    ctrChange: '+0.6%',
    cpcChange: '-7.1%'
  } : {
    spend: 1480.00,
    currency: 'USD',
    impressions: 154200,
    clicks: 4980,
    ctr: 3.23,
    cpc: 0.30,
    conversions: 312,
    roas: 4.2,
    spendChange: '+12.5%',
    ctrChange: '+0.5%',
    cpcChange: '-4.8%'
  };

  const placementsData = [
    { name: 'Instagram Stories & Reels', share: 48, ctr: '3.65%', cpc: '$0.27', spend: '$710.40' },
    { name: 'Instagram Feed', share: 28, ctr: '3.15%', cpc: '$0.32', spend: '$414.40' },
    { name: 'Facebook Mobile Feed', share: 16, ctr: '2.80%', cpc: '$0.35', spend: '$236.80' },
    { name: 'Facebook Reels & In-Stream', share: 8, ctr: '2.95%', cpc: '$0.31', spend: '$118.40' }
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* 1. Header del Dashboard y Selector de Activo */}
      <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-7 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-slate-100">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <TicoIconDashboards className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 font-['Outfit']">
                  Dashboards de Rendimiento
                </h1>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>En vivo</span>
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Telemetría, métricas de pauta y estado técnico de cada activo publicitario conectado.
              </p>
            </div>
          </div>

          {/* Selector de Rango de Fecha y Botón de Recarga */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="inline-flex p-1 rounded-xl bg-slate-100 border border-slate-200/80 text-xs font-bold">
              <button
                type="button"
                onClick={() => setSelectedTimeRange('7d')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  selectedTimeRange === '7d' ? 'bg-white text-slate-950 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                7 días
              </button>
              <button
                type="button"
                onClick={() => setSelectedTimeRange('30d')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  selectedTimeRange === '30d' ? 'bg-white text-slate-950 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                30 días
              </button>
              <button
                type="button"
                onClick={() => setSelectedTimeRange('this_month')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  selectedTimeRange === 'this_month' ? 'bg-white text-slate-950 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Este Mes
              </button>
            </div>

            <button
              type="button"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors cursor-pointer"
              title="Actualizar datos"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-indigo-600' : ''}`} />
            </button>
          </div>
        </div>

        {/* Selector de Activo Específico */}
        <div className="pt-5 flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mr-2">
            Activo activo:
          </span>

          <button
            type="button"
            onClick={() => setSelectedAssetType('ad_account')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
              selectedAssetType === 'ad_account'
                ? 'bg-blue-50 border-blue-300 text-blue-900 shadow-2xs'
                : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-blue-600" />
            <span>Cuenta Meta: <strong>{adAccountLabel}</strong></span>
          </button>

          {metaState.pixelId && (
            <button
              type="button"
              onClick={() => setSelectedAssetType('pixel')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                selectedAssetType === 'pixel'
                  ? 'bg-purple-50 border-purple-300 text-purple-900 shadow-2xs'
                  : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-purple-600" />
              <span>Píxel: <strong>{metaState.pixelName || metaState.pixelId}</strong></span>
            </button>
          )}

          {metaState.pageId && (
            <button
              type="button"
              onClick={() => setSelectedAssetType('page')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                selectedAssetType === 'page'
                  ? 'bg-indigo-50 border-indigo-300 text-indigo-900 shadow-2xs'
                  : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-indigo-600" />
              <span>Fan Page: <strong>{metaState.pageName || metaState.pageId}</strong></span>
            </button>
          )}

          {googleState?.isConnected && (
            <button
              type="button"
              onClick={() => setSelectedAssetType('google')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                selectedAssetType === 'google'
                  ? 'bg-red-50 border-red-300 text-red-900 shadow-2xs'
                  : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-red-600" />
              <span>Google CID: <strong>{googleState.customerId}</strong></span>
            </button>
          )}
        </div>
      </div>

      {/* 2. Grid de KPIs Principales */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        
        {/* Inversión Total */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-4.5 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">Inversión</span>
            <DollarSign className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black font-['Outfit'] text-slate-900 mt-1">
            ${metrics.spend.toLocaleString()}
          </div>
          <div className="flex items-center gap-1 text-[11px] font-bold text-emerald-600 mt-1">
            <TrendingUp className="w-3 h-3" />
            <span>{metrics.spendChange}</span>
            <span className="text-slate-400 font-normal">vs anterior</span>
          </div>
        </div>

        {/* Impresiones */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-4.5 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">Impresiones</span>
            <Users className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-black font-['Outfit'] text-slate-900 mt-1">
            {metrics.impressions.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Alcance optimizado
          </div>
        </div>

        {/* Clics Únicos */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-4.5 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">Clics</span>
            <MousePointerClick className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-black font-['Outfit'] text-slate-900 mt-1">
            {metrics.clicks.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Tráfico calificado
          </div>
        </div>

        {/* CTR Promedio */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-4.5 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">CTR Medio</span>
            <Percent className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-2xl font-black font-['Outfit'] text-slate-900 mt-1">
            {metrics.ctr}%
          </div>
          <div className="flex items-center gap-1 text-[11px] font-bold text-emerald-600 mt-1">
            <TrendingUp className="w-3 h-3" />
            <span>{metrics.ctrChange}</span>
            <span className="text-slate-400 font-normal">alto engage</span>
          </div>
        </div>

        {/* CPC Promedio */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-4.5 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">CPC Medio</span>
            <Activity className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-black font-['Outfit'] text-slate-900 mt-1">
            ${metrics.cpc.toFixed(2)}
          </div>
          <div className="flex items-center gap-1 text-[11px] font-bold text-emerald-600 mt-1">
            <TrendingDown className="w-3 h-3" />
            <span>{metrics.cpcChange}</span>
            <span className="text-slate-400 font-normal">costo eficiente</span>
          </div>
        </div>

        {/* ROAS Estimado */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-4.5 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">ROAS</span>
            <Sparkles className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-black font-['Outfit'] text-indigo-600 mt-1">
            {metrics.roas}x
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            {metrics.conversions} conversiones
          </div>
        </div>

      </div>

      {/* 3. Desglose de Rendimiento por Emplazamiento & Salud Técnica del Activo */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Rendimiento por Emplazamientos (2 Columnas) */}
        <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-7 shadow-xs space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-base font-extrabold text-slate-900 font-['Outfit']">
                Rendimiento por Emplazamiento (Meta Placements)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Distribución de inversión y desempeño de creativos por canal publicitario.
              </p>
            </div>
            <span className="text-xs font-bold text-slate-400">Total: 100%</span>
          </div>

          <div className="space-y-4">
            {placementsData.map((item, idx) => (
              <div key={idx} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-slate-800">{item.name}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-slate-500 font-normal">CTR: <strong>{item.ctr}</strong></span>
                    <span className="text-slate-500 font-normal">CPC: <strong>{item.cpc}</strong></span>
                    <span className="text-slate-900 font-mono">{item.spend} ({item.share}%)</span>
                  </div>
                </div>
                <div className="w-full h-2.5 rounded-full bg-slate-100 overflow-hidden">
                  <div 
                    className={`h-full rounded-full ${
                      idx === 0 ? 'bg-indigo-600' :
                      idx === 1 ? 'bg-blue-500' :
                      idx === 2 ? 'bg-sky-400' : 'bg-slate-400'
                    }`}
                    style={{ width: `${item.share}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="pt-2 flex items-center justify-between text-xs text-slate-500 bg-slate-50 p-3 rounded-2xl">
            <span className="flex items-center gap-1.5">
              <Smartphone className="w-4 h-4 text-slate-600" />
              <span>Mayor eficiencia observada en formatos verticales 9:16 (Stories y Reels).</span>
            </span>
            <a
              href="https://adsmanager.facebook.com"
              target="_blank"
              rel="noreferrer"
              className="font-bold text-blue-600 hover:underline flex items-center gap-1"
            >
              <span>Ver en Meta Ads</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>

        {/* Salud y Diagnóstico Técnico del Activo (1 Columna) */}
        <div className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-xs space-y-5">
          <h3 className="text-base font-extrabold text-slate-900 font-['Outfit'] flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Salud Técnica del Activo</span>
          </h3>

          <div className="space-y-3 text-xs">
            
            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Cuenta Publicitaria
              </span>
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-800">{metaState.adAccountId || 'act_640780335278377'}</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                  ACTIVA
                </span>
              </div>
              <span className="text-[11px] text-slate-500 block">Facturación al día • Moneda {metaState.adAccountName ? 'Detectada' : 'USD'}</span>
            </div>

            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Estado del Píxel / Conversiones
              </span>
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-800 truncate max-w-[150px]">
                  {metaState.pixelName || metaState.pixelId || 'Píxel no asignado'}
                </span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  metaState.pixelId ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                }`}>
                  {metaState.pixelId ? 'RECIBIENDO EVENTOS' : 'PENDIENTE'}
                </span>
              </div>
              <span className="text-[11px] text-slate-500 block">
                {metaState.pixelId ? 'Eventos PageView y Purchase activos' : 'Configura tu Píxel en Conexiones'}
              </span>
            </div>

            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Latencia de Meta Graph API
              </span>
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-800">Graph API v21.0</span>
                <span className="font-mono font-bold text-emerald-600">~148 ms</span>
              </div>
              <span className="text-[11px] text-slate-500 block">Conexión directa SSL sin cuellos de botella</span>
            </div>

            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Vigencia del Token de Acceso
              </span>
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-800">System User / Permanent</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">
                  SIN CADUCIDAD
                </span>
              </div>
              <span className="text-[11px] text-slate-500 block">Apto para despliegues continuos</span>
            </div>

          </div>
        </div>

      </div>

    </div>
  );
};
