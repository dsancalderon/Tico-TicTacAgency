import React, { useState } from 'react';
import { 
  Image as ImageIcon, 
  Upload, 
  Plus, 
  Trash2, 
  Sparkles,
  LayoutGrid
} from 'lucide-react';
import type { CreativeAsset } from '../../types';
import { uploadCreative } from '../../services/workspace';

interface CreativeAssignmentProps {
  creatives: CreativeAsset[];
  onUpdateCreatives: (creatives: CreativeAsset[]) => void;
  adHeadlines: string[];
}

export const CreativeAssignment: React.FC<CreativeAssignmentProps> = ({
  creatives,
  onUpdateCreatives,
  adHeadlines
}) => {
  const [selectedRatio, setSelectedRatio] = useState<'1:1' | '9:16'>('1:1');
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Creativos predefinidos profesionales para agilizar pruebas
  const samplePresets: CreativeAsset[] = [
    {
      id: 'preset_1',
      name: 'Banner Feed 1:1 — Producto & Propuesta de Valor',
      type: 'image',
      url: 'https://images.unsplash.com/photo-1557804506-669a67965ba0?auto=format&fit=crop&w=800&q=80',
      aspectRatio: '1:1',
      assignedAdTitle: adHeadlines[0] || 'Anuncio Principal'
    },
    {
      id: 'preset_2',
      name: 'Vertical Story 9:16 — Caso de Éxito & Urgencia',
      type: 'image',
      url: 'https://images.unsplash.com/photo-1551836022-d5d88e9218df?auto=format&fit=crop&w=800&q=80',
      aspectRatio: '9:16',
      assignedAdTitle: adHeadlines[1] || 'Anuncio de Prueba Social'
    }
  ];

  const handleAddPreset = (preset: CreativeAsset) => {
    if (creatives.some(c => c.id === preset.id)) return;
    onUpdateCreatives([...creatives, preset]);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    e.target.value = '';
    setUploading(true); setUploadError(null);
    try {
      const newAsset = await uploadCreative(file, selectedRatio);
      onUpdateCreatives([...creatives, { ...newAsset, assignedAdTitle: adHeadlines[0] || 'Anuncio Principal' }]);
    } catch (error) { setUploadError(error instanceof Error ? error.message : 'No se pudo subir el archivo.'); }
    finally { setUploading(false); }
  };

  const handleRemoveCreative = (id: string) => {
    onUpdateCreatives(creatives.filter(c => c.id !== id));
  };

  const handleAssignAd = (creativeId: string, headline: string) => {
    onUpdateCreatives(
      creatives.map(c => c.id === creativeId ? { ...c, assignedAdTitle: headline } : c)
    );
  };

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 md:p-8 shadow-sm space-y-6">
      {uploading && <p role="status" className="text-sm text-indigo-600">Guardando archivo privado…</p>}
      {uploadError && <p role="alert" className="text-sm text-rose-700">{uploadError}</p>}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-50 border border-purple-200 text-purple-700 text-xs font-bold mb-2">
            <LayoutGrid className="w-3.5 h-3.5" />
            <span>Asignación de Creativos Multimedia</span>
          </div>
          <h3 className="text-xl font-extrabold text-slate-900 tracking-tight font-['Outfit']">
            Material Gráfico para Meta Ads
          </h3>
          <p className="text-xs text-slate-500 mt-1 max-w-xl">
            Asocia tus piezas visuales (Feed 1:1 o Stories/Reels 9:16) a cada variante de anuncio generado antes de implementar.
          </p>
        </div>

        {/* Ratio Selector & Upload Button */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <div className="flex rounded-xl border border-slate-200 p-0.5 bg-slate-50 text-xs font-bold">
            <button
              type="button"
              onClick={() => setSelectedRatio('1:1')}
              className={`px-2.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                selectedRatio === '1:1' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              1:1 Feed
            </button>
            <button
              type="button"
              onClick={() => setSelectedRatio('9:16')}
              className={`px-2.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                selectedRatio === '9:16' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              9:16 Stories
            </button>
          </div>

          <label className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-slate-950 hover:bg-slate-800 text-white text-xs font-bold transition-all shadow-xs cursor-pointer">
            <Upload className="w-4 h-4" />
            <span>Subir ({selectedRatio})</span>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              disabled={uploading}
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>
        </div>
      </div>

      {/* Preset Suggestions */}
      {creatives.length === 0 && (
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-900">¿Aún no tienes creativos listos?</div>
              <p className="text-[11px] text-slate-500">Carga piezas de muestra con las proporciones oficiales de Meta Ads para continuar la prueba.</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {samplePresets.map(preset => (
              <button
                key={preset.id}
                type="button"
                onClick={() => handleAddPreset(preset)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 text-indigo-600" />
                <span>{preset.aspectRatio} Muestra</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Grid of Assigned Creatives */}
      {creatives.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {creatives.map((creative) => (
            <div 
              key={creative.id} 
              className="rounded-2xl border border-slate-200 bg-slate-50/60 overflow-hidden shadow-2xs flex flex-col justify-between"
            >
              {/* Media Preview Box */}
              <div className="relative bg-slate-900 overflow-hidden flex items-center justify-center h-44">
                <img
                  src={creative.url}
                  alt={creative.name}
                  className="w-full h-full object-cover"
                />
                <span className="absolute top-2.5 left-2.5 text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-950/80 text-white backdrop-blur-xs">
                  {creative.aspectRatio}
                </span>
                <button
                  type="button"
                  onClick={() => handleRemoveCreative(creative.id)}
                  className="absolute top-2.5 right-2.5 p-1.5 rounded-full bg-rose-600/80 hover:bg-rose-600 text-white backdrop-blur-xs transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Assignment Controls */}
              <div className="p-4 space-y-2.5 bg-white border-t border-slate-100 flex-1 flex flex-col justify-between">
                <div>
                  <div className="text-xs font-bold text-slate-900 truncate" title={creative.name}>
                    {creative.name}
                  </div>
                  <span className="text-[11px] text-slate-400 block mt-0.5">
                    Formato: Meta Feed & Stories
                  </span>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Vincular a Titular / Anuncio:
                  </label>
                  <select
                    value={creative.assignedAdTitle || ''}
                    onChange={(e) => handleAssignAd(creative.id, e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-indigo-600 cursor-pointer"
                  >
                    {adHeadlines.map((hl, idx) => (
                      <option key={idx} value={hl}>
                        {hl.length > 35 ? hl.slice(0, 35) + '...' : hl}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="p-8 text-center border border-dashed border-slate-200 rounded-2xl">
          <ImageIcon className="w-8 h-8 text-slate-300 mx-auto mb-2" />
          <p className="text-xs text-slate-500">
            No has asignado creativos a este plan aún. Haz clic en <strong>"Subir Pieza Gráfica"</strong> o usa una muestra.
          </p>
        </div>
      )}
    </div>
  );
};
