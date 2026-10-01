import { Producto, Insumo, TicketVenta, ProduccionRegistro, ContrasteInsumo, DashboardReport } from '../types';

// Helper to handle API responses strictly and cleanly
async function handleResponse<T = any>(res: Response): Promise<T> {
  const contentType = res.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    const text = await res.text().catch(() => '');
    throw new Error(`Respuesta inválida del servidor (código ${res.status}): ${text.substring(0, 120)}`);
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Error del servidor HTTP ${res.status}`);
  }
  return res.json();
}

export const api = {
  // Productos (Catálogo & Recetas)
  async getProductos(todos: boolean = true): Promise<Producto[]> {
    const url = todos ? '/api/productos?todos=true' : '/api/productos';
    const res = await fetch(url);
    return await handleResponse<Producto[]>(res);
  },

  async createProducto(data: Partial<Producto> & { ingredientes?: Array<{ insumo_id: number; cantidad: number }> }): Promise<any> {
    const res = await fetch('/api/productos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return await handleResponse(res);
  },

  async updateProducto(id: number, data: Partial<Producto> & { ingredientes?: Array<{ insumo_id: number; cantidad: number }> }): Promise<any> {
    const res = await fetch(`/api/productos/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return await handleResponse(res);
  },

  async deleteProducto(id: number, permanente: boolean = true): Promise<any> {
    const url = permanente ? `/api/productos/${id}?permanente=true` : `/api/productos/${id}`;
    const res = await fetch(url, { method: 'DELETE' });
    return await handleResponse(res);
  },

  // Insumos (Materia Prima)
  async getInsumos(): Promise<Insumo[]> {
    const res = await fetch('/api/insumos');
    return await handleResponse<Insumo[]>(res);
  },

  async createInsumo(data: Partial<Insumo>): Promise<any> {
    const res = await fetch('/api/insumos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return await handleResponse(res);
  },

  async updateInsumo(id: number, data: Partial<Insumo>): Promise<any> {
    const res = await fetch(`/api/insumos/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return await handleResponse(res);
  },

  async restockInsumo(id: number, cantidad: number, motivo?: string): Promise<any> {
    const res = await fetch(`/api/insumos/${id}/restock`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cantidad, motivo }),
    });
    return await handleResponse(res);
  },

  // Ventas (POS)
  async registrarVenta(data: {
    items: Array<{ producto_id: number; cantidad: number }>;
    metodo_pago: string;
    aplicar_impuesto: boolean;
    cajero?: string;
  }): Promise<{ success: boolean; ticket: TicketVenta }> {
    const res = await fetch('/api/ventas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return await handleResponse(res);
  },

  async getVentas(): Promise<any[]> {
    const res = await fetch('/api/ventas');
    return await handleResponse(res);
  },

  async getVentaDetalle(id: number): Promise<any> {
    const res = await fetch(`/api/ventas/${id}`);
    return await handleResponse(res);
  },

  // Producción
  async getProduccion(fecha?: string): Promise<ProduccionRegistro[]> {
    const url = fecha ? `/api/produccion?fecha=${encodeURIComponent(fecha)}` : '/api/produccion';
    const res = await fetch(url);
    return await handleResponse<ProduccionRegistro[]>(res);
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
    const res = await fetch('/api/produccion', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return await handleResponse(res);
  },

  // Reportes
  async getContrasteInventario(): Promise<ContrasteInsumo[]> {
    const res = await fetch('/api/reportes/produccion-inventario');
    return await handleResponse<ContrasteInsumo[]>(res);
  },

  async getDashboard(periodo: string = 'todo'): Promise<DashboardReport> {
    const res = await fetch(`/api/reportes/dashboard?periodo=${periodo}`);
    return await handleResponse<DashboardReport>(res);
  },
};
