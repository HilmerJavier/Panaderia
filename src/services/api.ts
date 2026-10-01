import { Producto, Insumo, TicketVenta, ProduccionRegistro, ContrasteInsumo, DashboardReport } from '../types';

export const api = {
  // Productos
  async getProductos(): Promise<Producto[]> {
    const res = await fetch('/api/productos');
    if (!res.ok) throw new Error('Error al obtener productos');
    return res.json();
  },

  async createProducto(data: Partial<Producto> & { ingredientes?: Array<{ insumo_id: number; cantidad: number }> }): Promise<any> {
    const res = await fetch('/api/productos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Error al crear producto');
    }
    return res.json();
  },

  async updateProducto(id: number, data: Partial<Producto> & { ingredientes?: Array<{ insumo_id: number; cantidad: number }> }): Promise<any> {
    const res = await fetch(`/api/productos/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Error al actualizar producto');
    }
    return res.json();
  },

  async deleteProducto(id: number): Promise<any> {
    const res = await fetch(`/api/productos/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Error al eliminar producto');
    return res.json();
  },

  // Insumos
  async getInsumos(): Promise<Insumo[]> {
    const res = await fetch('/api/insumos');
    if (!res.ok) throw new Error('Error al obtener insumos');
    return res.json();
  },

  async createInsumo(data: Partial<Insumo>): Promise<any> {
    const res = await fetch('/api/insumos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Error al crear insumo');
    }
    return res.json();
  },

  async updateInsumo(id: number, data: Partial<Insumo>): Promise<any> {
    const res = await fetch(`/api/insumos/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Error al actualizar insumo');
    return res.json();
  },

  async restockInsumo(id: number, cantidad: number, motivo?: string): Promise<any> {
    const res = await fetch(`/api/insumos/${id}/restock`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cantidad, motivo }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Error al reabastecer');
    }
    return res.json();
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
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Error al registrar venta');
    }
    return res.json();
  },

  async getVentas(): Promise<any[]> {
    const res = await fetch('/api/ventas');
    if (!res.ok) throw new Error('Error al obtener ventas');
    return res.json();
  },

  async getVentaDetalle(id: number): Promise<any> {
    const res = await fetch(`/api/ventas/${id}`);
    if (!res.ok) throw new Error('Error al obtener detalle de venta');
    return res.json();
  },

  // Producción
  async getProduccion(fecha?: string): Promise<ProduccionRegistro[]> {
    const url = fecha ? `/api/produccion?fecha=${encodeURIComponent(fecha)}` : '/api/produccion';
    const res = await fetch(url);
    if (!res.ok) throw new Error('Error al obtener registros de producción');
    return res.json();
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
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Error al registrar producción');
    }
    return res.json();
  },

  // Reportes
  async getContrasteInventario(): Promise<ContrasteInsumo[]> {
    const res = await fetch('/api/reportes/produccion-inventario');
    if (!res.ok) throw new Error('Error al obtener contraste de inventario');
    return res.json();
  },

  async getDashboard(periodo: string = 'todo'): Promise<DashboardReport> {
    const res = await fetch(`/api/reportes/dashboard?periodo=${periodo}`);
    if (!res.ok) throw new Error('Error al obtener reporte del dashboard');
    return res.json();
  },
};
