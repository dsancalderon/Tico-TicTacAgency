import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ShieldAlert, History, ArrowDownRight, ArrowUpRight, Plus, X } from 'lucide-react';
import { useScrollLock } from '../../utils/scrollLock';
import { TicoCoinIcon } from '../BrandLogos';
import type { CreditTransaction } from '../../types';

interface CreditsWidgetProps {
  credits: number;
  transactions: CreditTransaction[];
  onAddCredits: (amount: number) => void;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export const CreditsWidget: React.FC<CreditsWidgetProps> = ({
  credits,
  transactions,
  onAddCredits,
  isOpen,
  onOpenChange
}) => {
  const [internalShowModal, setInternalShowModal] = useState(false);
  const showModal = isOpen !== undefined ? isOpen : internalShowModal;
  
  const setShowModal = (val: boolean) => {
    if (onOpenChange) onOpenChange(val);
    setInternalShowModal(val);
  };

  useScrollLock(showModal);

  // Cerrar al presionar la tecla Escape
  useEffect(() => {
    if (!showModal) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowModal(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showModal]);

  const modalContent = showModal ? (
    <div 
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto"
      onClick={() => setShowModal(false)}
      role="dialog"
      aria-modal="true"
      aria-labelledby="credits-modal-title"
    >
      <div 
        className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden text-slate-900 my-auto animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Línea decorativa superior */}
        <div className="h-1.5 w-full bg-gradient-to-r from-amber-400 via-amber-500 to-indigo-600" />

        {/* Botón Cerrar (X) prominente y siempre clickeable */}
        <button
          type="button"
          onClick={() => setShowModal(false)}
          aria-label="Cerrar ventana de créditos"
          className="absolute top-4 right-4 z-20 p-2 text-slate-400 hover:text-slate-800 rounded-full hover:bg-slate-100 transition-colors cursor-pointer bg-white/80 backdrop-blur-xs border border-slate-200/60 shadow-2xs"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-6 sm:p-8 space-y-6 max-h-[85vh] overflow-y-auto">
          {/* Encabezado con el símbolo oficial de la moneda TICO */}
          <div className="flex items-center gap-3.5 pr-8">
            <TicoCoinIcon className="w-12 h-12 drop-shadow-md shrink-0" />
            <div>
              <h3 id="credits-modal-title" className="text-xl sm:text-2xl font-extrabold tracking-tight font-['Outfit'] text-slate-900">
                Gestión de Créditos TICO
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Control de saldo para formulación e implementación de pauta publicitaria.
              </p>
            </div>
          </div>

          {/* Tarjeta de Saldo Disponible con la Moneda Oficial */}
          <div className="p-6 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-950 text-white flex items-center justify-between shadow-lg relative overflow-hidden">
            {/* Resplandor decorativo de fondo */}
            <div className="absolute -right-6 -bottom-6 w-32 h-32 bg-amber-500/10 rounded-full blur-xl pointer-events-none" />

            <div className="relative z-10">
              <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold">
                Saldo Disponible
              </span>
              <div className="text-3xl sm:text-4xl font-black font-['Outfit'] text-amber-400 mt-1 flex items-center gap-2.5">
                <TicoCoinIcon className="w-8 h-8 drop-shadow-md shrink-0" />
                <span>{credits}</span>
                <span className="text-sm font-medium text-slate-300">créditos</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => onAddCredits(20)}
              className="relative z-10 flex items-center gap-1.5 px-4 py-2.5 rounded-full bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-bold transition-all shadow-xs cursor-pointer active:scale-95 shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Recargar (+20)</span>
            </button>
          </div>

          {/* Regla Fundamental de Consumo */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-600 space-y-1.5">
            <div className="flex items-center gap-2 font-bold text-slate-900">
              <ShieldAlert className="w-4 h-4 text-indigo-600 shrink-0" />
              <span>Regla fundamental de consumo:</span>
            </div>
            <p className="leading-relaxed text-[11px]">
              Los créditos corresponden al <strong>uso del software, IA y orquestación técnica</strong> de TICO. <strong>No constituyen dinero disponible para inversión publicitaria en Meta o Google Ads</strong> (el presupuesto de pauta se factura directamente en tu cuenta publicitaria conectada).
            </p>
          </div>

          {/* Desglose de Tarifas */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Costos de Acciones en la Plataforma
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex justify-between items-center">
                <span>Estructuración de Estrategia</span>
                <span className="inline-flex items-center gap-1 text-slate-900 font-bold font-mono">
                  <TicoCoinIcon className="w-3.5 h-3.5" />
                  <span>1 crédito</span>
                </span>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex justify-between items-center">
                <span>Despliegue a Meta (PAUSED)</span>
                <span className="inline-flex items-center gap-1 text-slate-900 font-bold font-mono">
                  <TicoCoinIcon className="w-3.5 h-3.5" />
                  <span>5 créditos</span>
                </span>
              </div>
            </div>
          </div>

          {/* Historial de Transacciones */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider">
              <span>Historial de Movimientos</span>
              <History className="w-3.5 h-3.5" />
            </div>

            <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
              {transactions.length === 0 ? (
                <div className="text-center py-4 text-xs text-slate-400">
                  No hay transacciones registradas aún.
                </div>
              ) : (
                transactions.map((t) => (
                  <div
                    key={t.id}
                    className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2.5 min-w-0 pr-2">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs shrink-0 ${
                        t.type === 'credit'
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-rose-100 text-rose-700'
                      }`}>
                        {t.type === 'credit' ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                      </div>
                      <div className="min-w-0">
                        <div className="font-semibold text-slate-900 truncate">{t.description}</div>
                        <span className="text-[10px] text-slate-400">{new Date(t.date).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <span className={`font-mono font-bold shrink-0 inline-flex items-center gap-1 ${
                      t.type === 'credit' ? 'text-emerald-600' : 'text-slate-900'
                    }`}>
                      <TicoCoinIcon className="w-3 h-3" />
                      <span>{t.type === 'credit' ? `+${t.amount}` : `-${t.amount}`}</span>
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Botón inferior de cierre rápido */}
          <div className="pt-2 flex justify-end border-t border-slate-100">
            <button
              type="button"
              onClick={() => setShowModal(false)}
              className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  ) : null;

  return (
    <>
      {/* Botón tipo Píldora en la Barra Superior */}
      <button
        type="button"
        onClick={() => setShowModal(true)}
        className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-50 hover:bg-amber-100/80 border border-amber-200/90 text-amber-950 text-xs font-bold transition-all shadow-2xs cursor-pointer group active:scale-[0.98]"
        title="Ver saldo y gestión de créditos TICO"
      >
        <TicoCoinIcon className="w-5 h-5 group-hover:scale-110 group-hover:rotate-6 transition-transform drop-shadow-2xs" />
        <span>{credits} créditos</span>
      </button>

      {/* Modal renderizado en document.body mediante React Portal para evitar bloqueos por header sticky */}
      {typeof document !== 'undefined' && modalContent ? createPortal(modalContent, document.body) : null}
    </>
  );
};
