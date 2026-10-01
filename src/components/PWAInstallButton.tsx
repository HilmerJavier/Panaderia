import React, { useState } from 'react';
import { Download, Smartphone, X, Check } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (isInstalled) return null;

  if (isInstallable) {
    return (
      <button
        onClick={install}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl transition-all shadow-xs cursor-pointer"
        title="Instalar aplicación en la pantalla de inicio"
      >
        <Download className="w-3.5 h-3.5 animate-bounce" />
        <span>Instalar App</span>
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          onClick={() => setShowIOSGuide(true)}
          className="flex items-center gap-1.5 px-2.5 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-semibold rounded-xl border border-stone-300 transition-colors cursor-pointer"
        >
          <Smartphone className="w-3.5 h-3.5 text-amber-600" />
          <span>Instalar en iOS</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/70 p-4 backdrop-blur-xs">
            <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl border border-stone-200 space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-stone-100">
                <h3 className="font-bold text-base text-stone-900 font-display">Instalar en iPhone / iPad</h3>
                <button
                  onClick={() => setShowIOSGuide(false)}
                  className="p-1 rounded-lg text-stone-400 hover:text-stone-700"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <p className="text-xs text-stone-600 leading-relaxed">
                Para usar Panadería La Estrella como aplicación nativa en tu iPhone o iPad sin barra del navegador:
              </p>
              <ol className="text-xs text-stone-700 space-y-2 list-decimal list-inside font-medium bg-amber-50/60 p-3 rounded-xl border border-amber-200/80">
                <li>Toca el botón <strong>Compartir</strong> en la barra inferior de Safari.</li>
                <li>Desplázate hacia abajo y selecciona <strong>Agregar al inicio</strong>.</li>
                <li>Toca <strong>Agregar</strong> arriba a la derecha.</li>
              </ol>
              <button
                onClick={() => setShowIOSGuide(false)}
                className="w-full py-2 bg-stone-900 text-white rounded-xl text-xs font-bold"
              >
                Entendido
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
