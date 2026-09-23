import React, { useEffect } from 'react';
import { LogOut } from 'lucide-react';

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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-[32px] sm:rounded-[36px] p-8 sm:p-10 max-w-md w-full shadow-2xl border border-slate-100 text-center relative animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Circular Gradient Icon */}
        <div 
          className="w-20 h-20 sm:w-22 sm:h-22 rounded-full mx-auto flex items-center justify-center shadow-xl shadow-blue-500/25"
          style={{
            background: 'linear-gradient(135deg, #0066ff 0%, #2563eb 45%, #8b5cf6 100%)'
          }}
        >
          <LogOut className="w-9 h-9 sm:w-10 sm:h-10 text-white stroke-[2.3] ml-0.5" />
        </div>

        {/* Title & Description */}
        <h2 className="text-2xl sm:text-[26px] font-black font-['Outfit'] text-slate-900 tracking-tight mt-6">
          ¿Deseas cerrar sesión?
        </h2>
        <p className="text-slate-500 text-sm sm:text-[15px] font-medium mt-2 leading-relaxed max-w-xs mx-auto">
          Tu sesión se cerrará en este dispositivo.
          <br />
          Podrás volver a ingresar cuando quieras.
        </p>

        {/* Buttons */}
        <div className="flex items-center justify-center gap-3 sm:gap-4 mt-8 w-full">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 px-6 rounded-full border border-slate-300 hover:border-slate-400 hover:bg-slate-50 text-slate-700 font-bold text-sm sm:text-base transition-all cursor-pointer text-center active:scale-[0.98]"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="flex-1 py-3 px-6 rounded-full text-white font-bold text-sm sm:text-base shadow-lg shadow-blue-600/25 hover:shadow-blue-600/35 transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-[0.98]"
            style={{
              background: 'linear-gradient(90deg, #0066ff 0%, #2563eb 40%, #8b5cf6 100%)'
            }}
          >
            <LogOut className="w-4 h-4 text-white stroke-[2.3]" />
            <span>Cerrar sesión</span>
          </button>
        </div>
      </div>
    </div>
  );
};
