import { Producto, Insumo, TicketVenta, ProduccionRegistro, ContrasteInsumo, DashboardReport } from '../types';
import { localStore } from './localStore';

// Helper to determine if a fetch response is valid JSON from an active backend
async function handleResponse(res: Response): Promise<any> {
  const contentType = res.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    throw new Error('NOT_JSON_BACKEND');
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

export const api = {
  // Productos
  async getProductos(): Promise<Producto[]> {
    try {
      const res = await fetch('/api/productos');
      return await handleResponse(res);
    } catch {
      return localStore.getProductos();
    }
  },

  async createProducto(data: Partial<Producto> & { ingredientes?: Array<{ insumo_id: number; cantidad: number }> }): Promise<any> {
    try {
      const res = await fetch('/api/productos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      return await handleResponse(res);
    } catch {
      return localStore.createProducto(data);
    }
  },

  async updateProducto(id: number, data: Partial<Producto> & { ingredientes?: Array<{ insumo_id: number; cantidad: number }> }): Promise<any> {
    try {
      const res = await fetch(`/api/productos/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      return await handleResponse(res);
    } catch {
      return localStore.updateProducto(id, data);
    }
  },

  async deleteProducto(id: number): Promise<any> {
    try {
      const res = await fetch(`/api/productos/${id}`, { method: 'DELETE' });
      return await handleResponse(res);
    } catch {
      return localStore.deleteProducto(id);
    }
  },

  // Insumos
  async getInsumos(): Promise<Insumo[]> {
    try {
      const res = await fetch('/api/insumos');
      return await handleResponse(res);
    } catch {
      return localStore.getInsumos();
    }
  },

  async createInsumo(data: Partial<Insumo>): Promise<any> {
    try {
      const res = await fetch('/api/insumos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      return await handleResponse(res);
    } catch {
      return localStore.createInsumo(data);
    }
  },

  async updateInsumo(id: number, data: Partial<Insumo>): Promise<any> {
    try {
      const res = await fetch(`/api/insumos/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      return await handleResponse(res);
    } catch {
      return localStore.updateInsumo(id, data);
    }
  },

  async restockInsumo(id: number, cantidad: number, motivo?: string): Promise<any> {
    try {
      const res = await fetch(`/api/insumos/${id}/restock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cantidad, motivo }),
      });
      return await handleResponse(res);
    } catch {
      return localStore.restockInsumo(id, cantidad);
    }
  },

  // Ventas (POS)
  async registrarVenta(data: {
    items: Array<{ producto_id: number; cantidad: number }>;
    metodo_pago: string;
    aplicar_impuesto: boolean;
    cajero?: string;
  }): Promise<{ success: boolean; ticket: TicketVenta }> {
    try {
      const res = await fetch('/api/ventas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      return await handleResponse(res);
    } catch {
      return localStore.registrarVenta(data);
    }
  },

  async getVentas(): Promise<any[]> {
    try {
      const res = await fetch('/api/ventas');
      return await handleResponse(res);
    } catch {
      return localStore.getVentas();
    }
  },

  async getVentaDetalle(id: number): Promise<any> {
    try {
      const res = await fetch(`/api/ventas/${id}`);
      return await handleResponse(res);
    } catch {
      const v = localStore.getVentas().find(x => x.id === id);
      return v || {};
    }
  },

  // Producción
  async getProduccion(fecha?: string): Promise<ProduccionRegistro[]> {
    try {
      const url = fecha ? `/api/produccion?fecha=${encodeURIComponent(fecha)}` : '/api/produccion';
      const res = await fetch(url);
      return await handleResponse(res);
    } catch {
      return localStore.getProduccion();
    }
  },

  async registrarProduccion(data: {
    producto_id: number;
    cantidad_producida: number;
    merma_unidades?: number;
    maestro_panadero?: string;
    tanda?: string;
    notas?: string;
    fecha?: string;
  }): Promise<any> {
    try {
      const res = await fetch('/api/produccion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      return await handleResponse(res);
    } catch {
      return localStore.registrarProduccion(data);
    }
  },

  // Reportes
  async getContrasteInventario(): Promise<ContrasteInsumo[]> {
    try {
      const res = await fetch('/api/reportes/produccion-inventario');
      return await handleResponse(res);
    } catch {
      return localStore.getContrasteInventario();
    }
  },

  async getDashboard(periodo: string = 'todo'): Promise<DashboardReport> {
    try {
      const res = await fetch(`/api/reportes/dashboard?periodo=${periodo}`);
      return await handleResponse(res);
    } catch {
      return localStore.getDashboard(periodo);
    }
  },
};
