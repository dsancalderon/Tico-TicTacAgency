import React, { useEffect } from 'react';
import { Trash2, X } from 'lucide-react';
import { useScrollLock } from '../../utils/scrollLock';

interface DeleteCampaignModalProps {
  isOpen: boolean;
  campaignTitle?: string;
  isDraft?: boolean;
  isDeleting?: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export const DeleteCampaignModal: React.FC<DeleteCampaignModalProps> = ({
  isOpen,
  campaignTitle,
  isDraft = false,
  isDeleting = false,
  onClose,
  onConfirm
}) => {
  useScrollLock(isOpen);

  // Cerrar al presionar la tecla Escape si no se está ejecutando la acción
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isDeleting) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, isDeleting]);

  if (!isOpen) return null;

  const displayName = campaignTitle?.trim() || (isDraft ? 'Borrador sin título' : 'Campaña sin nombre');

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/30 backdrop-blur-md animate-in fade-in duration-200 overflow-y-auto"
      onClick={() => {
        if (!isDeleting) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-campaign-modal-title"
    >
      {/* Ambient background glow orbs */}
      <div className="fixed -top-24 -left-24 w-96 h-96 bg-rose-400/20 rounded-full blur-3xl pointer-events-none" />
      <div className="fixed -bottom-24 -right-24 w-96 h-96 bg-purple-400/20 rounded-full blur-3xl pointer-events-none" />
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-rose-300/15 rounded-full blur-[100px] pointer-events-none" />

      {/* Glassmorphic Card (matching the style of AuthModal, LogoutConfirmModal and MetaConnectDiagnostic) */}
      <div
        className="relative w-full max-w-[380px] rounded-[30px] bg-white/90 backdrop-blur-2xl border border-white/80 shadow-[0_25px_60px_-15px_rgba(244,63,94,0.25)] p-6 sm:p-7 flex flex-col items-center my-auto transition-all z-10 text-center animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          disabled={isDeleting}
          className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/50 rounded-full transition-colors cursor-pointer z-20 disabled:opacity-40"
          title="Cerrar"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Floating Gradient Icon with Aura */}
        <div className="relative flex items-center justify-center mb-1">
          <div className="absolute inset-0 bg-rose-500/20 rounded-2xl blur-lg transform scale-110 pointer-events-none" />
          <div
            className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center text-white shadow-[0_10px_24px_rgba(244,63,94,0.3)]"
            style={{
              background: 'linear-gradient(135deg, #f43f5e 0%, #e11d48 50%, #be123c 100%)'
            }}
          >
            <Trash2 className="w-7 h-7 text-white stroke-[2.2]" />
          </div>
        </div>

        {/* Title & Description */}
        <h2
          id="delete-campaign-modal-title"
          className="text-xl sm:text-[22px] font-bold text-slate-800 tracking-tight font-['Outfit'] mt-3"
        >
          {isDraft ? '¿Deseas eliminar este borrador?' : '¿Deseas eliminar esta campaña?'}
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 font-medium mt-2 leading-relaxed max-w-[300px] mx-auto">
          Se eliminará {isDraft ? 'el borrador' : 'la campaña'}{' '}
          <strong className="text-slate-700 font-semibold break-words">
            "{displayName}"
          </strong>{' '}
          de forma permanente de tu espacio.
        </p>

        {/* Action Buttons */}
        <div className="flex items-center justify-center gap-2.5 mt-6 w-full">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="flex-1 py-2.5 sm:py-3 px-4 rounded-2xl bg-[#f0f3fa]/90 hover:bg-[#e6ebf7] border border-[#e2e8f5] text-slate-700 font-bold text-xs sm:text-sm transition-all cursor-pointer text-center active:scale-[0.99] disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isDeleting}
            className="flex-1 py-2.5 sm:py-3 px-4 rounded-2xl bg-gradient-to-r from-rose-500 via-rose-600 to-red-600 hover:opacity-95 active:scale-[0.99] text-white font-bold text-xs sm:text-sm tracking-wide shadow-[0_10px_24px_rgba(244,63,94,0.35)] hover:shadow-[0_14px_28px_rgba(244,63,94,0.45)] transition-all cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isDeleting ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Eliminando...</span>
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4 text-white stroke-[2.2]" />
                <span>Sí, eliminar</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
