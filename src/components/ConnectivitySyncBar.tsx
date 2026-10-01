import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, RefreshCw, CheckCircle2, AlertTriangle } from 'lucide-react';
import { useOnlineStatus } from '../services/offlineSync';

export const ConnectivitySyncBar: React.FC = () => {
  const { isOnline, pendingCount, isSyncing, triggerSync } = useOnlineStatus();
  const [syncToast, setSyncToast] = useState<{ message: string; type: 'success' | 'info' } | null>(null);

  useEffect(() => {
    const handleSyncCompleted = (e: any) => {
      const { syncedCount } = e.detail || {};
      if (syncedCount > 0) {
        setSyncToast({
          message: `¡Se sincronizaron con éxito ${syncedCount} ${syncedCount === 1 ? 'venta guardada' : 'ventas guardadas'} sin conexión con la nube!`,
          type: 'success',
        });
        setTimeout(() => setSyncToast(null), 5000);
      }
    };

    window.addEventListener('estrella-sync-completed', handleSyncCompleted);
    return () => window.removeEventListener('estrella-sync-completed', handleSyncCompleted);
  }, []);

  return (
    <div className="space-y-1">
      {/* Toast Notification after sync */}
      {syncToast && (
        <div className="bg-emerald-600 text-white px-4 py-2 text-xs font-semibold flex items-center justify-between shadow-md animate-in slide-in-from-top duration-300">
          <div className="flex items-center gap-2 max-w-7xl mx-auto w-full">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{syncToast.message}</span>
          </div>
        </div>
      )}

      {/* Main Connectivity status bar when offline OR when pending sales exist */}
      {(!isOnline || pendingCount > 0) && (
        <div
          className={`px-4 py-2 text-xs flex items-center justify-between border-b transition-colors ${
            !isOnline
              ? 'bg-amber-500 text-stone-950 border-amber-600 font-medium'
              : 'bg-orange-100 text-orange-950 border-orange-300'
          }`}
        >
          <div className="max-w-7xl mx-auto w-full flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              {!isOnline ? (
                <>
                  <WifiOff className="w-4 h-4 text-stone-950 shrink-0 animate-pulse" />
                  <span className="font-bold">
                    Modo Sin Conexión (Offline): Operando con datos locales y almacenamiento en caja.
                  </span>
                </>
              ) : (
                <>
                  <Wifi className="w-4 h-4 text-emerald-700 shrink-0" />
                  <span className="font-bold text-stone-900">
                    Conexión restablecida. Hay {pendingCount} {pendingCount === 1 ? 'venta pendiente' : 'ventas pendientes'} por sincronizar con la nube.
                  </span>
                </>
              )}
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {pendingCount > 0 && (
                <button
                  onClick={triggerSync}
                  disabled={!isOnline || isSyncing}
                  className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs ${
                    isOnline
                      ? 'bg-stone-900 hover:bg-stone-800 text-amber-400 cursor-pointer'
                      : 'bg-stone-300 text-stone-600 cursor-not-allowed opacity-70'
                  }`}
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                  <span>{isSyncing ? 'Sincronizando...' : `Sincronizar (${pendingCount})`}</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
