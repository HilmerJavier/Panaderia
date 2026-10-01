import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { CartItem, Producto, Insumo, TicketVenta } from '../types';

export interface PendingSale {
  id: string;
  timestamp: string;
  items: CartItem[];
  subtotal: number;
  descuento: number;
  total: number;
  metodo_pago: 'efectivo' | 'nequi' | 'tarjeta';
  dinero_recibido?: number;
  cambio_devuelto?: number;
  vendedor: string;
  insumos_descontados?: Array<{ insumo: string; descontado: number; unidad: string }>;
  synced: boolean;
  sync_error?: string;
}

const PENDING_SALES_KEY = 'estrella_offline_pending_sales';
const CACHE_PRODUCTS_KEY = 'estrella_cache_productos';
const CACHE_INSUMOS_KEY = 'estrella_cache_insumos';

// Save sale locally when offline
export const saveOfflineSale = (saleData: {
  items: CartItem[];
  subtotal: number;
  descuento: number;
  total: number;
  metodo_pago: 'efectivo' | 'nequi' | 'tarjeta';
  dinero_recibido?: number;
  cambio_devuelto?: number;
  vendedor: string;
  insumos_descontados?: Array<{ insumo: string; descontado: number; unidad: string }>;
}): PendingSale => {
  const pendingSale: PendingSale = {
    ...saleData,
    id: `off_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
    timestamp: new Date().toISOString(),
    synced: false,
  };

  try {
    const existing = getPendingSales();
    const updated = [pendingSale, ...existing];
    localStorage.setItem(PENDING_SALES_KEY, JSON.stringify(updated));
  } catch (err) {
    console.error('Error al guardar venta offline en almacenamiento local:', err);
  }

  // Also update local cached product stocks immediately
  try {
    const cachedProds = getCachedProductos();
    if (cachedProds.length > 0) {
      const updatedProds = cachedProds.map(p => {
        const cartItem = saleData.items.find(item => item.producto.id === p.id);
        if (cartItem) {
          return {
            ...p,
            stock_disponible: Math.max(0, p.stock_disponible - cartItem.cantidad),
          };
        }
        return p;
      });
      cacheProductos(updatedProds);
    }
  } catch (e) {
    console.warn('Error actualizando stock local en caché:', e);
  }

  // Dispatch event so UI status updates immediately
  window.dispatchEvent(new Event('estrella-pending-sales-changed'));

  return pendingSale;
};

// Retrieve pending sales from local storage
export const getPendingSales = (): PendingSale[] => {
  try {
    const stored = localStorage.getItem(PENDING_SALES_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        return parsed.filter(s => !s.synced);
      }
    }
  } catch {}
  return [];
};

// Get pending sales count
export const getPendingSalesCount = (): number => {
  return getPendingSales().length;
};

// Sync all pending offline sales with Supabase
export const syncPendingSales = async (): Promise<{ syncedCount: number; errors: number }> => {
  if (!navigator.onLine) {
    return { syncedCount: 0, errors: 0 };
  }

  const pending = getPendingSales();
  if (pending.length === 0) {
    return { syncedCount: 0, errors: 0 };
  }

  let syncedCount = 0;
  let errors = 0;
  const remainingPending: PendingSale[] = [];

  for (const sale of pending) {
    try {
      // 1. Insert into Supabase 'ventas' table
      const { data: ventaResp, error: ventaErr } = await supabase
        .from('ventas')
        .insert([{
          subtotal: sale.subtotal,
          descuento: sale.descuento,
          total: sale.total,
          metodo_pago: sale.metodo_pago,
          dinero_recibido: sale.dinero_recibido || sale.total,
          cambio_devuelto: sale.cambio_devuelto || 0,
          vendedor: sale.vendedor || 'Cajero (Offline)',
          created_at: sale.timestamp,
        }])
        .select('id')
        .single();

      if (ventaErr) {
        console.warn('Aviso sincronizando venta:', ventaErr.message);
      }

      const ventaId = ventaResp?.id;

      // 2. Insert detail rows if ventaId created
      if (ventaId && sale.items && sale.items.length > 0) {
        const detalles = sale.items.map(item => ({
          venta_id: ventaId,
          producto_id: item.producto.id,
          nombre_producto: item.producto.nombre,
          cantidad: item.cantidad,
          precio_unitario: item.producto.precio,
          subtotal: item.producto.precio * item.cantidad,
        }));

        await supabase.from('ventas_detalle').insert(detalles);
      }

      // 3. Deduct insumos & products stock in Supabase
      for (const item of sale.items) {
        try {
          await supabase.rpc('descontar_stock_producto', {
            p_id: item.producto.id,
            p_cantidad: item.cantidad
          });
        } catch {
          // Fallback if RPC doesn't exist
          try {
            await supabase
              .from('productos')
              .update({ stock_disponible: Math.max(0, item.producto.stock_disponible - item.cantidad) })
              .eq('id', item.producto.id);
          } catch {}
        }
      }

      syncedCount++;
    } catch (err: any) {
      console.error('Error al sincronizar venta offline:', sale.id, err);
      errors++;
      remainingPending.push({ ...sale, sync_error: err.message || 'Error de red' });
    }
  }

  // Update localStorage with remaining unsynced sales
  try {
    localStorage.setItem(PENDING_SALES_KEY, JSON.stringify(remainingPending));
  } catch {}

  window.dispatchEvent(new CustomEvent('estrella-sync-completed', {
    detail: { syncedCount, errors }
  }));

  window.dispatchEvent(new Event('estrella-pending-sales-changed'));

  return { syncedCount, errors };
};

// Caching helpers for Products and Insumos
export const cacheProductos = (productos: Producto[]): void => {
  try {
    localStorage.setItem(CACHE_PRODUCTS_KEY, JSON.stringify(productos));
  } catch {}
};

export const getCachedProductos = (): Producto[] => {
  try {
    const stored = localStorage.getItem(CACHE_PRODUCTS_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {}
  return [];
};

export const cacheInsumos = (insumos: Insumo[]): void => {
  try {
    localStorage.setItem(CACHE_INSUMOS_KEY, JSON.stringify(insumos));
  } catch {}
};

export const getCachedInsumos = (): Insumo[] => {
  try {
    const stored = localStorage.getItem(CACHE_INSUMOS_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {}
  return [];
};

// Hook to observe online status and pending sales count
export const useOnlineStatus = () => {
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [pendingCount, setPendingCount] = useState<number>(getPendingSalesCount());
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      // Auto-trigger sync when coming back online!
      handleSync();
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    const updatePending = () => {
      setPendingCount(getPendingSalesCount());
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('estrella-pending-sales-changed', updatePending);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('estrella-pending-sales-changed', updatePending);
    };
  }, []);

  const handleSync = async () => {
    if (!navigator.onLine || isSyncing) return;
    setIsSyncing(true);
    try {
      await syncPendingSales();
    } finally {
      setIsSyncing(false);
      setPendingCount(getPendingSalesCount());
    }
  };

  return {
    isOnline,
    pendingCount,
    isSyncing,
    triggerSync: handleSync,
  };
};
