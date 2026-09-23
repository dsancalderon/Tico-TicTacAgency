import React, { useState, useEffect } from 'react';
import type { GeneratedCampaignStrategy, CreativeAsset } from '../types';
import { 
  CheckCircle2, 
  ShieldAlert, 
  Rocket, 
  Share2, 
  Search, 
  ArrowLeft, 
  FileSpreadsheet, 
  Edit3, 
  Coins, 
  Layers
} from 'lucide-react';
import { exportStrategyToExcel } from '../utils/excelExporter';
import { CreativeAssignment } from './Dashboard/CreativeAssignment';

interface StrategyPreviewProps {
  strategy: GeneratedCampaignStrategy;
  onApprove: (strategy: GeneratedCampaignStrategy) => void;
  onBack: () => void;
  isDeploying: boolean;
  userCredits?: number;
  onAddCredits?: (amount?: number) => void;
  onChange?: (strategy: GeneratedCampaignStrategy) => void;
}

export const StrategyPreview: React.FC<StrategyPreviewProps> = ({
  strategy: initialStrategy,
  onApprove,
  onBack,
  isDeploying,
  userCredits = 0,
  onAddCredits,
  onChange
}) => {
  const [strategy, setStrategy] = useState<GeneratedCampaignStrategy>(initialStrategy);
  useEffect(() => { onChange?.(strategy); }, [strategy, onChange]);
  const [confirmedTerms, setConfirmedTerms] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'meta' | 'google'>('all');
  const [isEditingCopies, setIsEditingCopies] = useState(false);
  const [activeAdIndex, setActiveAdIndex] = useState(0);

  const handleCopyTextChange = (index: number, newText: string) => {
    if (!strategy.metaAds) return;
    const updated = [...strategy.metaAds.primaryTexts];
    updated[index] = newText;

    const updatedBuilderPayload = strategy.metaBuilderPayload ? {
      ...strategy.metaBuilderPayload,
      ads: strategy.metaBuilderPayload.ads.map((ad, i) => i === index ? { ...ad, primaryText: newText } : ad)
    } : undefined;

    setStrategy({
      ...strategy,
      metaBuilderPayload: updatedBuilderPayload,
      metaAds: {
        ...strategy.metaAds,
        primaryTexts: updated
      }
    });
  };

  const handleHeadlineChange = (index: number, newHeadline: string) => {
    if (!strategy.metaAds) return;
    const updated = [...strategy.metaAds.headlines];
    updated[index] = newHeadline;

    const updatedBuilderPayload = strategy.metaBuilderPayload ? {
      ...strategy.metaBuilderPayload,
      ads: strategy.metaBuilderPayload.ads.map((ad, i) => i === index ? { ...ad, headline: newHeadline } : ad)
    } : undefined;

    setStrategy({
      ...strategy,
      metaBuilderPayload: updatedBuilderPayload,
      metaAds: {
        ...strategy.metaAds,
        headlines: updated
      }
    });
  };

  const handleUpdateCreatives = (creatives: CreativeAsset[]) => {
    const updatedBuilderPayload = strategy.metaBuilderPayload ? {
      ...strategy.metaBuilderPayload,
      ads: strategy.metaBuilderPayload.ads.map(ad => {
        const match = creatives.find(c => c.assignedAdTitle === ad.headline) || creatives[0];
        return match ? { ...ad, creativeAsset: match } : ad;
      })
    } : undefined;

    setStrategy({
      ...strategy,
      creatives,
      metaBuilderPayload: updatedBuilderPayload,
      metaAds: strategy.metaAds ? {
        ...strategy.metaAds,
        creatives
      } : undefined
    });
  };

  const handleExportExcel = () => {
    exportStrategyToExcel(strategy);
  };

  const creditCost = strategy.creditCost || 5;
  const hasEnoughCredits = userCredits >= creditCost;

  return (
    <div className="space-y-8">
      {/* Top Banner: Strategy Ready & Actions */}
      <div className="rounded-3xl border border-indigo-100 bg-gradient-to-r from-indigo-50/80 via-purple-50/50 to-blue-50/80 p-6 md:p-8 shadow-sm relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> 
                Plan Publicitario Formulado por TICO
              </span>
              <span className="text-xs text-slate-500 font-mono">
                {new Date(strategy.createdAt).toLocaleDateString()}
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight font-['Outfit']">
              Estrategia de Pauta: {strategy.brandName}
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-3xl leading-relaxed">
              {strategy.strategySummary}
            </p>
          </div>

          {/* Action Buttons: Export Excel & Back */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={handleExportExcel}
              className="flex items-center gap-2 px-4 py-2 rounded-full border border-emerald-300 bg-white hover:bg-emerald-50 text-emerald-800 text-xs font-bold transition-all shadow-2xs cursor-pointer"
              title="Descargar hoja de cálculo con el plan publicitario completo"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span>Exportar Excel (.xlsx)</span>
            </button>

            <button
              type="button"
              onClick={() => setIsEditingCopies(!isEditingCopies)}
              className="flex items-center gap-2 px-4 py-2 rounded-full border border-slate-300 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 transition-all shadow-2xs cursor-pointer"
            >
              <Edit3 className="w-3.5 h-3.5 text-indigo-600" />
              <span>{isEditingCopies ? 'Guardar Cambios' : 'Editar Copies'}</span>
            </button>

            <button
              type="button"
              onClick={onBack}
              className="flex items-center gap-2 px-4 py-2 rounded-full border border-slate-300 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 transition-all shadow-2xs cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> 
              <span>Modificar Brief</span>
            </button>
          </div>
        </div>

        {/* Budget Allocation Summary */}
        <div className="mt-6 pt-5 border-t border-slate-200/80 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Presupuesto Asignado</span>
            <div className="text-2xl font-black text-slate-900 mt-1 font-['Outfit']">
              ${strategy.totalBudget.toLocaleString()} <span className="text-xs font-semibold text-slate-500">{strategy.currency}</span>
            </div>
            <span className="text-[11px] text-slate-400 block mt-0.5">Control de gasto directo en cuenta publicitaria</span>
          </div>

          {strategy.metaAds && (
            <div className="p-4 rounded-2xl bg-white border border-blue-100 shadow-2xs">
              <div className="flex justify-between items-center text-xs font-bold text-blue-600 uppercase tracking-wider">
                <span>Meta Ads (IG / FB)</span>
                <span>{strategy.metaAds.budgetSharePercentage}%</span>
              </div>
              <div className="text-2xl font-black text-slate-900 mt-1 font-['Outfit']">
                ${((strategy.totalBudget * strategy.metaAds.budgetSharePercentage) / 100).toLocaleString()} {strategy.currency}
              </div>
              <span className="text-[11px] text-slate-500 mt-0.5 block">
                Sugerido diario: ~${strategy.metaAds.dailyBudget?.toLocaleString() || Math.round(strategy.totalBudget / 30)} {strategy.currency}/día
              </span>
            </div>
          )}

          {strategy.googleAds && (
            <div className="p-4 rounded-2xl bg-white border border-amber-100 shadow-2xs">
              <div className="flex justify-between items-center text-xs font-bold text-amber-600 uppercase tracking-wider">
                <span>Google Ads (Search)</span>
                <span>{strategy.googleAds.budgetSharePercentage}%</span>
              </div>
              <div className="text-2xl font-black text-slate-900 mt-1 font-['Outfit']">
                ${((strategy.totalBudget * strategy.googleAds.budgetSharePercentage) / 100).toLocaleString()} {strategy.currency}
              </div>
              <span className="text-[11px] text-slate-500 mt-0.5 block">
                Ubicación: {strategy.googleAds.targetLocations.join(', ')}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Tabs Filter */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
        <button
          onClick={() => setActiveTab('all')}
          className={`px-4 py-2 rounded-full text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'all'
              ? 'bg-slate-950 text-white shadow-2xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          Vista General
        </button>
        {strategy.metaAds && (
          <button
            onClick={() => setActiveTab('meta')}
            className={`px-4 py-2 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'meta'
                ? 'bg-blue-600 text-white shadow-2xs'
                : 'text-slate-600 hover:text-blue-600 hover:bg-blue-50'
            }`}
          >
            <Share2 className="w-3.5 h-3.5" /> Meta Ads
          </button>
        )}
        {strategy.googleAds && (
          <button
            onClick={() => setActiveTab('google')}
            className={`px-4 py-2 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'google'
                ? 'bg-amber-600 text-white shadow-2xs'
                : 'text-slate-600 hover:text-amber-600 hover:bg-amber-50'
            }`}
          >
            <Search className="w-3.5 h-3.5" /> Google Ads
          </button>
        )}
      </div>

      {/* Creative Assignment Module for Meta Ads */}
      {strategy.metaAds && (
        <CreativeAssignment
          creatives={strategy.creatives || []}
          onUpdateCreatives={handleUpdateCreatives}
          adHeadlines={strategy.metaAds.headlines}
        />
      )}

      {/* Strategy Details Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Meta Ads Card */}
        {strategy.metaAds && (activeTab === 'all' || activeTab === 'meta') && (
          <div className="rounded-3xl border border-slate-200 bg-white p-6 md:p-8 shadow-sm flex flex-col justify-between space-y-6">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 border border-blue-200 flex items-center justify-center font-black text-sm">
                    M
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-base font-['Outfit']">
                      {strategy.metaBuilderPayload?.mode === 'single_ad' ? 'Anuncio Individual en Meta Ads' : 'Campaña en Meta Ads'}
                    </h3>
                    <p className="text-xs text-slate-500">
                      {strategy.metaBuilderPayload?.campaignName || 'Instagram Feed/Stories & Facebook Reels'}
                    </p>
                  </div>
                </div>
                <span className="text-xs px-3 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200 font-semibold">
                  CTA: {strategy.metaBuilderPayload?.ads[activeAdIndex]?.callToAction || strategy.metaAds.callToAction}
                </span>
              </div>

              {/* Selector de Anuncio si hay más de 1 */}
              {strategy.metaBuilderPayload && strategy.metaBuilderPayload.ads.length > 1 && (
                <div className="mt-4 flex items-center gap-2 p-1.5 rounded-xl bg-slate-100 overflow-x-auto">
                  <span className="text-[11px] font-bold text-slate-500 px-2 shrink-0">Variante:</span>
                  {strategy.metaBuilderPayload.ads.map((ad, idx) => (
                    <button
                      key={ad.id}
                      type="button"
                      onClick={() => setActiveAdIndex(idx)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer ${
                        activeAdIndex === idx 
                          ? 'bg-blue-600 text-white shadow-2xs' 
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
                      }`}
                    >
                      {ad.name || `Anuncio 0${idx + 1}`}
                    </button>
                  ))}
                </div>
              )}

              {/* Targeting / Audiencias */}
              <div className="mt-5 space-y-5">
                <div>
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                    Segmentación & Audiencias Sugeridas
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {strategy.metaAds.interestsAndBehaviors.map((item, idx) => (
                      <span key={idx} className="px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-xs font-medium text-slate-700">
                        {item}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Proposed Ad Copy */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                      Texto Principal del Anuncio ({activeAdIndex + 1} de {strategy.metaAds.primaryTexts.length})
                    </h4>
                    {isEditingCopies && (
                      <span className="text-[10px] text-indigo-600 font-bold bg-indigo-50 px-2 py-0.5 rounded">Modo Edición</span>
                    )}
                  </div>
                  <div>
                    {isEditingCopies ? (
                      <textarea
                        rows={3}
                        value={strategy.metaAds.primaryTexts[activeAdIndex] || ''}
                        onChange={(e) => handleCopyTextChange(activeAdIndex, e.target.value)}
                        className="w-full p-3 rounded-xl bg-slate-50 border border-indigo-200 text-xs text-slate-900 focus:outline-none focus:bg-white focus:border-indigo-600"
                      />
                    ) : (
                      <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-800 leading-relaxed font-normal">
                        "{strategy.metaAds.primaryTexts[activeAdIndex] || strategy.metaAds.primaryTexts[0]}"
                      </div>
                    )}
                  </div>
                </div>

                {/* Headlines */}
                <div>
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                    Titular del Anuncio (Headline)
                  </h4>
                  <div>
                    {isEditingCopies ? (
                      <input
                        type="text"
                        value={strategy.metaAds.headlines[activeAdIndex] || ''}
                        onChange={(e) => handleHeadlineChange(activeAdIndex, e.target.value)}
                        className="w-full p-2.5 rounded-xl bg-slate-50 border border-indigo-200 text-xs font-bold text-slate-900 focus:outline-none focus:bg-white focus:border-indigo-600"
                      />
                    ) : (
                      <div className="text-xs font-semibold text-slate-700 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
                        {strategy.metaAds.headlines[activeAdIndex] || strategy.metaAds.headlines[0]}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Social Ad Visual Mockup */}
            <div className="pt-4 border-t border-slate-100">
              <span className="text-xs text-slate-400 uppercase tracking-wider block mb-2.5 font-bold">
                Aproximación Visual (Instagram & Facebook Feed Preview)
              </span>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-yellow-400 to-pink-600 p-0.5">
                    <div className="w-full h-full bg-white rounded-full flex items-center justify-center text-[10px] text-slate-900 font-bold">
                      {strategy.brandName.slice(0, 1)}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900 leading-none">{strategy.brandName}</div>
                    <span className="text-[10px] text-slate-400">Publicidad oficial • PAUSED</span>
                  </div>
                </div>
                <p className="text-xs text-slate-700">
                  {strategy.metaAds.primaryTexts[activeAdIndex] || strategy.metaAds.primaryTexts[0]}
                </p>
                <div className="h-44 rounded-xl bg-slate-900 overflow-hidden flex items-center justify-center border border-slate-200 relative">
                  {(strategy.creatives && strategy.creatives[activeAdIndex]) || (strategy.creatives && strategy.creatives[0]) ? (
                    <img 
                      src={(strategy.creatives[activeAdIndex] || strategy.creatives[0]).url} 
                      alt="Creativo Asignado" 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="text-xs text-slate-400 font-medium flex flex-col items-center gap-1.5 p-4 text-center">
                      <Layers className="w-5 h-5 text-slate-500" />
                      <span>Creativo visual pendiente</span>
                      <span className="text-[10px] text-slate-500">Usa el módulo de arriba para asignar imagen Feed 1:1 o Story 9:16</span>
                    </div>
                  )}
                </div>
                <div className="flex items-center justify-between pt-1">
                  <span className="text-xs font-bold text-slate-900 truncate max-w-[200px]">
                    {strategy.metaAds.headlines[activeAdIndex] || strategy.metaAds.headlines[0]}
                  </span>
                  <span className="text-xs font-bold px-3 py-1 rounded-full bg-blue-600 text-white">
                    {strategy.metaBuilderPayload?.ads[activeAdIndex]?.callToAction || strategy.metaAds.callToAction}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Google Ads Card */}
        {strategy.googleAds && (activeTab === 'all' || activeTab === 'google') && (
          <div className="rounded-3xl border border-slate-200 bg-white p-6 md:p-8 shadow-sm flex flex-col justify-between space-y-6">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center font-black text-sm">
                    G
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-base font-['Outfit']">Campaña en Google Ads</h3>
                    <p className="text-xs text-slate-500">{strategy.googleAds.campaignType} Network</p>
                  </div>
                </div>
                <span className="text-xs px-3 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200 font-semibold">
                  Search & Keyword Intent
                </span>
              </div>

              {/* Keywords */}
              <div className="mt-5 space-y-5">
                <div>
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                    Palabras Clave Propuestas
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {strategy.googleAds.keywords.map((kw, idx) => (
                      <span key={idx} className="px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-xs font-mono font-medium text-slate-800">
                        {kw}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Headlines */}
                <div>
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                    Titulares Adaptables
                  </h4>
                  <div className="space-y-1.5">
                    {strategy.googleAds.headlines.map((hl, idx) => (
                      <div key={idx} className="text-xs font-medium text-slate-800 flex items-center gap-2 p-2 rounded-xl bg-slate-50 border border-slate-200">
                        <span className="text-slate-400 font-mono text-[10px] font-bold">T{idx + 1}</span>
                        {hl}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Descriptions */}
                <div>
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                    Descripciones
                  </h4>
                  <div className="space-y-2">
                    {strategy.googleAds.descriptions.map((desc, idx) => (
                      <div key={idx} className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 leading-relaxed">
                        {desc}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Google Search Mockup */}
            <div className="pt-4 border-t border-slate-100">
              <span className="text-xs text-slate-400 uppercase tracking-wider block mb-2.5 font-bold">
                Vista Previa (Google Search)
              </span>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-1.5">
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <span className="font-bold text-slate-900 text-[11px] px-1.5 py-0.5 bg-slate-200 rounded">Patrocinado</span>
                  <span>https://{strategy.brandName.toLowerCase().replace(/\s+/g, '')}.com</span>
                </div>
                <div className="text-sm font-bold text-blue-600 hover:underline cursor-pointer">
                  {strategy.googleAds.headlines.join(' | ')}
                </div>
                <p className="text-xs text-slate-600 leading-snug">
                  {strategy.googleAds.descriptions[0]}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Approval & Deployment Gate with Credit Debit Preview */}
      <div className="rounded-3xl border-2 border-slate-900 bg-white p-6 md:p-8 shadow-xl space-y-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-700 border border-indigo-200 flex items-center justify-center shrink-0 mt-0.5">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <h3 className="text-xl font-extrabold text-slate-900 font-['Outfit']">
                Aprobación Formal & Despliegue en Estado PAUSED
              </h3>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-900 text-xs font-bold">
                <Coins className="w-3.5 h-3.5 text-amber-600" />
                <span>Costo: {creditCost} créditos</span>
              </div>
            </div>
            <p className="text-xs sm:text-sm text-slate-600 mt-1 leading-relaxed">
              Al aprobar, TICO creará la estructura de campaña en tu cuenta publicitaria autorizada de Meta mediante Graph API dejándola <strong>pausada</strong> para que un asesor humano revise presupuestos, creativos y la active manualmente.
            </p>
          </div>
        </div>

        {/* Confirmation terms & credit balance preview */}
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs pb-3 border-b border-slate-200 text-slate-600">
            <span>Saldo actual: <strong>{userCredits} créditos</strong></span>
            <span>Saldo tras implementación: <strong>{userCredits - creditCost} créditos</strong></span>
          </div>

          <label className="flex items-start gap-3 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={confirmedTerms}
              onChange={(e) => setConfirmedTerms(e.target.checked)}
              className="w-5 h-5 rounded mt-0.5 accent-indigo-600 cursor-pointer"
            />
            <span className="text-xs sm:text-sm text-slate-700 leading-relaxed font-medium">
              Confirmo la aprobación del plan para <strong>{strategy.brandName}</strong> con presupuesto de <strong>${strategy.totalBudget.toLocaleString()} {strategy.currency}</strong>. Autorizo el débito de <strong>{creditCost} créditos</strong> de mi suscripción de software TICO y la creación de la campaña en estado <code>PAUSED</code>.
            </span>
          </label>
        </div>

        {!hasEnoughCredits && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs">
            <div className="flex items-center gap-2.5 font-medium">
              <Coins className="w-5 h-5 text-amber-600 shrink-0" />
              <span>
                <strong>Saldo insuficiente:</strong> Tienes <strong>{userCredits} créditos</strong> y la aprobación requiere <strong>{creditCost} créditos</strong>.
              </span>
            </div>
            {onAddCredits && (
              <button
                type="button"
                onClick={() => onAddCredits(20)}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-all shadow-xs cursor-pointer flex items-center justify-center gap-1.5 self-start sm:self-auto"
              >
                <span>+ Recargar 20 Créditos de Prueba</span>
              </button>
            )}
          </div>
        )}

        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
          <div className="text-xs font-semibold text-emerald-700 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Validación de políticas publicitarias superada (0 infracciones de marca)</span>
          </div>

          <button
            type="button"
            disabled={!confirmedTerms || isDeploying || !hasEnoughCredits}
            onClick={() => onApprove(strategy)}
            className="w-full sm:w-auto px-8 py-3.5 rounded-full bg-slate-950 hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-sm tracking-wide shadow-md hover:shadow-lg flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            {isDeploying ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Orquestando en Meta Marketing API (PAUSED)...</span>
              </>
            ) : (
              <>
                <Rocket className="w-4 h-4 text-indigo-400" />
                <span>Aprobar y Desplegar ({creditCost} Créditos)</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
