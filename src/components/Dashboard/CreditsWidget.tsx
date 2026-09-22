import React, { useState } from 'react';
import { ShieldAlert, History, ArrowDownRight, ArrowUpRight, Plus, X } from 'lucide-react';
import { useScrollLock } from '../../utils/scrollLock';
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

  return (
    <>
      {/* Top Bar Credit Pill */}
      <button
        type="button"
        onClick={() => setShowModal(true)}
        className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-50 hover:bg-amber-100/80 border border-amber-200 text-amber-900 text-xs font-bold transition-all shadow-2xs cursor-pointer group"
      >
        <div className="w-5 h-5 rounded-full bg-amber-400 text-amber-950 flex items-center justify-center font-black text-[11px] shadow-xs group-hover:rotate-12 transition-transform">
          ⚡
        </div>
        <span>{credits} créditos</span>
      </button>

      {/* Credits Detail Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div 
            className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden text-slate-900"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header Line */}
            <div className="h-1.5 w-full bg-gradient-to-r from-amber-400 via-amber-500 to-indigo-600" />

            <button
              type="button"
              onClick={() => setShowModal(false)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="p-6 sm:p-8 space-y-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center font-black text-xl shadow-xs">
                  ⚡
                </div>
                <div>
                  <h3 className="text-2xl font-extrabold tracking-tight font-['Outfit']">
                    Gestión de Créditos TICO
                  </h3>
                  <p className="text-xs text-slate-500">
                    Control de saldo para formulación e implementación de pauta.
                  </p>
                </div>
              </div>

              {/* Balance Card */}
              <div className="p-6 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-950 text-white flex items-center justify-between shadow-lg">
                <div>
                  <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold">
                    Saldo Disponible
                  </span>
                  <div className="text-4xl font-black font-['Outfit'] text-amber-400 mt-1 flex items-baseline gap-2">
                    <span>{credits}</span>
                    <span className="text-sm font-medium text-slate-300">créditos</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => onAddCredits(20)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-bold transition-all shadow-xs cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Recargar (+20)</span>
                </button>
              </div>

              {/* Crucial Notice from README Section 10 */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-600 space-y-1.5">
                <div className="flex items-center gap-2 font-bold text-slate-900">
                  <ShieldAlert className="w-4 h-4 text-indigo-600" />
                  <span>Regla fundamental de consumo:</span>
                </div>
                <p className="leading-relaxed text-[11px]">
                  Los créditos corresponden al <strong>uso del software, IA y orquestación técnica</strong> de TICO. <strong>No constituyen dinero disponible para inversión publicitaria en Meta o Google Ads</strong> (el presupuesto de pauta se factura directamente en tu cuenta publicitaria).
                </p>
              </div>

              {/* Tariffs Breakdown */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Costos de Acciones en la Plataforma
                </h4>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex justify-between items-center">
                    <span>Estructuración de Estrategia</span>
                    <strong className="text-slate-900 font-mono">1 crédito</strong>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex justify-between items-center">
                    <span>Despliegue a Meta (PAUSED)</span>
                    <strong className="text-slate-900 font-mono">5 créditos</strong>
                  </div>
                </div>
              </div>

              {/* Transaction History */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider">
                  <span>Historial de Movimientos</span>
                  <History className="w-3.5 h-3.5" />
                </div>

                <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
                  {transactions.map((t) => (
                    <div
                      key={t.id}
                      className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                          t.type === 'credit'
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-rose-100 text-rose-700'
                        }`}>
                          {t.type === 'credit' ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                        </div>
                        <div>
                          <div className="font-semibold text-slate-900">{t.description}</div>
                          <span className="text-[10px] text-slate-400">{new Date(t.date).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <span className={`font-mono font-bold ${
                        t.type === 'credit' ? 'text-emerald-600' : 'text-slate-900'
                      }`}>
                        {t.type === 'credit' ? `+${t.amount}` : `-${t.amount}`} cr
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
