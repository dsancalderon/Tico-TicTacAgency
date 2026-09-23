import React, { useEffect } from 'react';
import { LogOut, X } from 'lucide-react';

interface LogoutConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export const LogoutConfirmModal: React.FC<LogoutConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm
}) => {
  // Handle ESC key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/30 backdrop-blur-md animate-in fade-in duration-200 overflow-y-auto"
      onClick={onClose}
    >
      {/* Ambient background glow orbs matching AuthModal aesthetic */}
      <div className="fixed -top-24 -left-24 w-96 h-96 bg-blue-400/20 rounded-full blur-3xl pointer-events-none" />
      <div className="fixed -bottom-24 -right-24 w-96 h-96 bg-purple-400/20 rounded-full blur-3xl pointer-events-none" />
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-indigo-300/15 rounded-full blur-[100px] pointer-events-none" />

      {/* Glassmorphic Card (identical to AuthModal) */}
      <div 
        className="relative w-full max-w-[360px] rounded-[30px] bg-white/80 backdrop-blur-2xl border border-white/80 shadow-[0_25px_60px_-15px_rgba(91,103,250,0.25)] p-6 sm:p-7 flex flex-col items-center my-auto transition-all z-10 text-center animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/50 rounded-full transition-colors cursor-pointer z-20"
          title="Cerrar"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Floating Gradient Icon with Aura */}
        <div className="relative flex items-center justify-center mb-1">
          <div className="absolute inset-0 bg-[#5B67FA]/20 rounded-2xl blur-lg transform scale-110 pointer-events-none" />
          <div 
            className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center text-white shadow-[0_10px_24px_rgba(91,103,250,0.3)]"
            style={{
              background: 'linear-gradient(135deg, #2F80ED 0%, #5B67FA 50%, #A751F1 100%)'
            }}
          >
            <LogOut className="w-7 h-7 text-white stroke-[2.2] ml-0.5" />
          </div>
        </div>

        {/* Title & Description */}
        <h2 className="text-xl sm:text-[22px] font-bold text-slate-800 tracking-tight font-['Outfit'] mt-3">
          ¿Deseas cerrar sesión?
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1.5 leading-relaxed max-w-[260px] mx-auto">
          Tu sesión se cerrará en este dispositivo.
          <br />
          Podrás volver a ingresar cuando quieras.
        </p>

        {/* Action Buttons matching AuthModal forms and colors */}
        <div className="flex items-center justify-center gap-2.5 mt-6 w-full">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 sm:py-3 px-4 rounded-2xl bg-[#f0f3fa]/90 hover:bg-[#e6ebf7] border border-[#e2e8f5] text-slate-700 font-bold text-xs sm:text-sm transition-all cursor-pointer text-center active:scale-[0.99]"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="flex-1 py-2.5 sm:py-3 px-4 rounded-2xl bg-gradient-to-r from-[#2F80ED] via-[#5B67FA] to-[#A751F1] hover:opacity-95 active:scale-[0.99] text-white font-bold text-xs sm:text-sm tracking-wide shadow-[0_10px_24px_rgba(91,103,250,0.35)] hover:shadow-[0_14px_28px_rgba(91,103,250,0.45)] transition-all cursor-pointer flex items-center justify-center gap-1.5"
          >
            <LogOut className="w-4 h-4 text-white stroke-[2.2]" />
            <span>Cerrar sesión</span>
          </button>
        </div>
      </div>
    </div>
  );
};
