import React, { useState, useEffect } from 'react';
import type { ClientBriefing, CampaignObjective } from '../types';
import { Target, DollarSign, Calendar, Globe, Building2, Users, Bot, Sparkles, Wand2, X } from 'lucide-react';

interface BriefingFormProps {
  onSubmit: (brief: ClientBriefing) => void;
  isLoading: boolean;
  initialData?: ClientBriefing | null;
  onDraftChange?: (brief: ClientBriefing) => void;
  onClose?: () => void;
  showCloseButton?: boolean;
  submitButtonText?: string;
}

export const BriefingForm: React.FC<BriefingFormProps> = ({ 
  onSubmit, 
  isLoading,
  initialData,
  onDraftChange,
  onClose,
  showCloseButton = false,
  submitButtonText
}) => {
  const [formData, setFormData] = useState<ClientBriefing>(initialData || {
    brandName: '',
    websiteUrl: '',
    industry: '',
    targetAudience: '',
    objective: 'lead_generation',
    budgetTotal: 1500,
    currency: 'USD',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    preferredPlatforms: 'meta',
    additionalNotes: ''
  });

  useEffect(() => { onDraftChange?.(formData); }, [formData, onDraftChange]);

  const loadPreset = () => {
    setFormData({
      brandName: 'UrbanFit Athletics',
      websiteUrl: 'https://urbanfit.example.com',
      industry: 'Ropa deportiva y fitness de alto rendimiento',
      targetAudience: 'Hombres y mujeres de 22 a 40 años interesados en entrenamiento funcional, crossfit y vida saludable',
      objective: 'conversions_sales',
      budgetTotal: 2000,
      currency: 'USD',
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      preferredPlatforms: 'meta',
      additionalNotes: 'Destacar nuestra nueva colección transpirable y 15% de descuento en la primera orden online.'
    });
  };

  const handleClose = () => {
    onClose?.();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.brandName || !formData.budgetTotal) return;
    onSubmit(formData);
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200/90 p-6 md:p-10 shadow-sm relative overflow-hidden">
      {/* Botón de Cierre Superior (Solo si showCloseButton es true) */}
      {showCloseButton && onClose && (
        <button
          type="button"
          onClick={handleClose}
          className="absolute top-4 right-4 z-20 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer text-xs font-semibold"
          title="Cerrar"
        >
          <X className="w-4 h-4 text-slate-500" />
          <span>Cerrar</span>
        </button>
      )}

      {/* Decorative subtle background aura */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-50/70 rounded-full blur-3xl pointer-events-none -z-0" />
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-purple-50/60 rounded-full blur-3xl pointer-events-none -z-0" />

      {/* Header bar with sample preset */}
      <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-semibold mb-2">
            <Bot className="w-3.5 h-3.5 text-indigo-600" />
            <span>Generador de Pauta Publicitaria</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight font-['Outfit']">
            Briefing de Marca y Pauta
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Ingresa los parámetros de tu marca para que <strong>TICO</strong> estructure copies, segmentación y presupuesto.
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto flex-wrap">
          <button
            type="button"
            onClick={loadPreset}
            className="flex items-center gap-2 px-4 py-2 rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-all shadow-2xs hover:border-slate-300 cursor-pointer"
          >
            <Wand2 className="w-3.5 h-3.5 text-indigo-600" />
            <span>Autocompletar Ejemplo</span>
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="relative z-10 mt-8 space-y-6">
        {/* Row 1: Brand & Website */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
              Nombre de la Marca <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <Building2 className="w-4 h-4 text-slate-400 absolute left-4 top-3.5" />
              <input
                type="text"
                required
                placeholder="Ej. UrbanFit Athletics o Nova Glow"
                value={formData.brandName}
                onChange={(e) => setFormData({ ...formData, brandName: e.target.value })}
                className="w-full bg-slate-50/70 hover:bg-white border border-slate-200 rounded-2xl pl-11 pr-4 py-3 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-indigo-600 focus:ring-3 focus:ring-indigo-100 transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
              Sitio Web o Landing Page Destino
            </label>
            <div className="relative">
              <Globe className="w-4 h-4 text-slate-400 absolute left-4 top-3.5" />
              <input
                type="url"
                placeholder="https://tumarca.com"
                value={formData.websiteUrl}
                onChange={(e) => setFormData({ ...formData, websiteUrl: e.target.value })}
                className="w-full bg-slate-50/70 hover:bg-white border border-slate-200 rounded-2xl pl-11 pr-4 py-3 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-indigo-600 focus:ring-3 focus:ring-indigo-100 transition-all"
              />
            </div>
          </div>
        </div>

        {/* Row 2: Industry & Target Audience */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
              Industria o Nicho
            </label>
            <input
              type="text"
              placeholder="Ej. E-commerce de moda, Servicios profesionales, Salud y belleza"
              value={formData.industry}
              onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
              className="w-full bg-slate-50/70 hover:bg-white border border-slate-200 rounded-2xl px-4 py-3 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-indigo-600 focus:ring-3 focus:ring-indigo-100 transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
              Público Objetivo
            </label>
            <div className="relative">
              <Users className="w-4 h-4 text-slate-400 absolute left-4 top-3.5" />
              <input
                type="text"
                placeholder="Ej. Personas de 22 a 45 años interesadas en fitness y estilo de vida activo"
                value={formData.targetAudience}
                onChange={(e) => setFormData({ ...formData, targetAudience: e.target.value })}
                className="w-full bg-slate-50/70 hover:bg-white border border-slate-200 rounded-2xl pl-11 pr-4 py-3 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-indigo-600 focus:ring-3 focus:ring-indigo-100 transition-all"
              />
            </div>
          </div>
        </div>

        {/* Row 3: Objective & Platforms */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2 flex items-center gap-1.5">
              <Target className="w-3.5 h-3.5 text-indigo-600" />
              <span>Objetivo Principal de Campaña</span>
            </label>
            <select
              value={formData.objective}
              onChange={(e) => setFormData({ ...formData, objective: e.target.value as CampaignObjective })}
              className="w-full bg-slate-50/70 hover:bg-white border border-slate-200 rounded-2xl px-4 py-3 text-sm text-slate-900 focus:outline-none focus:bg-white focus:border-indigo-600 focus:ring-3 focus:ring-indigo-100 transition-all cursor-pointer"
            >
              <option value="lead_generation">Generación de Clientes Potenciales (Leads / WhatsApp / Form)</option>
              <option value="conversions_sales">Ventas / Conversiones en Tienda Online</option>
              <option value="traffic">Tráfico Cualificado al Sitio Web</option>
              <option value="brand_awareness">Reconocimiento y Alcance de Marca</option>
              <option value="app_promotion">Instalaciones de Aplicación</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
              Canales Publicitarios
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, preferredPlatforms: 'meta' })}
                className={`py-2.5 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                  formData.preferredPlatforms === 'meta'
                    ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                Solo Meta Ads
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, preferredPlatforms: 'both' })}
                className={`py-2.5 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                  formData.preferredPlatforms === 'both'
                    ? 'bg-slate-950 text-white border-slate-950 shadow-sm'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                Meta + Google
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, preferredPlatforms: 'google' })}
                className={`py-2.5 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                  formData.preferredPlatforms === 'google'
                    ? 'bg-amber-600 text-white border-amber-600 shadow-sm'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                Solo Google
              </button>
            </div>
          </div>
        </div>

        {/* Row 4: Budget & Dates */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
              Presupuesto Total <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <DollarSign className="w-4 h-4 text-emerald-600 absolute left-4 top-3.5" />
              <input
                type="number"
                min="100"
                step="50"
                required
                value={formData.budgetTotal}
                onChange={(e) => setFormData({ ...formData, budgetTotal: Number(e.target.value) })}
                className="w-full bg-slate-50/70 hover:bg-white border border-slate-200 rounded-2xl pl-11 pr-24 py-3 text-sm text-slate-900 font-bold focus:outline-none focus:bg-white focus:border-indigo-600 focus:ring-3 focus:ring-indigo-100 transition-all"
              />
              <select
                value={formData.currency}
                onChange={(e) => setFormData({ ...formData, currency: e.target.value as any })}
                className="absolute right-2 top-2 bg-white text-xs font-semibold text-slate-700 rounded-xl px-2.5 py-1.5 border border-slate-200 shadow-2xs"
              >
                <option value="USD">USD ($)</option>
                <option value="COP">COP ($)</option>
                <option value="EUR">EUR (€)</option>
                <option value="MXN">MXN ($)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span>Fecha Inicio</span>
            </label>
            <input
              type="date"
              value={formData.startDate}
              onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
              className="w-full bg-slate-50/70 hover:bg-white border border-slate-200 rounded-2xl px-4 py-3 text-sm text-slate-900 focus:outline-none focus:bg-white focus:border-indigo-600 focus:ring-3 focus:ring-indigo-100 transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span>Fecha Fin</span>
            </label>
            <input
              type="date"
              value={formData.endDate}
              onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
              className="w-full bg-slate-50/70 hover:bg-white border border-slate-200 rounded-2xl px-4 py-3 text-sm text-slate-900 focus:outline-none focus:bg-white focus:border-indigo-600 focus:ring-3 focus:ring-indigo-100 transition-all"
            />
          </div>
        </div>

        {/* Row 5: Additional Notes */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
            Puntos Clave, Oferta y Restricciones de Marca
          </label>
          <textarea
            rows={2}
            placeholder="Menciona propuestas de valor, descuentos vigentes, diferenciadores o directrices de tono de marca para los anuncios..."
            value={formData.additionalNotes}
            onChange={(e) => setFormData({ ...formData, additionalNotes: e.target.value })}
            className="w-full bg-slate-50/70 hover:bg-white border border-slate-200 rounded-2xl px-4 py-3 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-indigo-600 focus:ring-3 focus:ring-indigo-100 transition-all"
          />
        </div>

        {/* Submit CTA */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-4 px-6 rounded-full bg-slate-950 hover:bg-slate-800 text-white font-bold text-sm tracking-wide shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2.5 disabled:opacity-50 cursor-pointer"
          >
            {isLoading ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>TICO está analizando el contexto y estructurando la pauta...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5 text-indigo-400" />
                <span>{submitButtonText || 'Formular Estrategia Publicitaria con TICO'}</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
