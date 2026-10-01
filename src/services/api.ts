import { Producto, Insumo, TicketVenta, ProduccionRegistro, ContrasteInsumo, DashboardReport } from '../types';
import { DEFAULT_PRODUCTOS, DEFAULT_INSUMOS } from './defaultCatalog';
import { supabase } from '../lib/supabase';
import { saveOfflineSale } from './offlineSync';

export const api = {
  getCachedOrFallbackProductos(): Producto[] {
    try {
      const cached = localStorage.getItem('estrella_cached_productos');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return DEFAULT_PRODUCTOS;
  },

  getCachedOrFallbackInsumos(): Insumo[] {
    try {
      const cached = localStorage.getItem('estrella_cached_insumos');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return DEFAULT_INSUMOS;
  },

  // Gestión de Categorías
  getCategorias(): string[] {
    const DEFAULT_CATS = [
      'Pan Rústico', 'Pan Blanco', 'Bollería / Dulce', 'Especiales',
      'Bebidas Calientes', 'Bebidas Frías', 'Gaseosas y Aguas'
    ];
    try {
      const stored = localStorage.getItem('estrella_categorias');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Asegurar categorías base de bebidas si no existen
          const hasBeverage = parsed.some(c => /bebida|café|cafe|jugo|gaseosa/i.test(c));
          if (!hasBeverage) {
            const merged = [...parsed, 'Bebidas Calientes', 'Bebidas Frías', 'Gaseosas y Aguas'];
            localStorage.setItem('estrella_categorias', JSON.stringify(merged));
            return merged;
          }
          return parsed;
        }
      }
    } catch {}
    return DEFAULT_CATS;
  },

  async addCategoria(nombre: string): Promise<string[]> {
    const clean = nombre.trim();
    if (!clean) return this.getCategorias();
    const current = this.getCategorias();
    if (!current.includes(clean)) {
      const updated = [...current, clean];
      try {
        localStorage.setItem('estrella_categorias', JSON.stringify(updated));
      } catch {}
      return updated;
    }
    return current;
  },

  async renameCategoria(oldName: string, newName: string): Promise<void> {
    const cleanNew = newName.trim();
    if (!cleanNew || oldName === cleanNew) return;

    // Actualizar en Supabase todos los productos que tengan la categoría vieja
    try {
      await supabase
        .from('productos')
        .update({ categoria: cleanNew })
        .eq('categoria', oldName);
    } catch (e) {
      console.warn('Aviso al renombrar categoría en Supabase:', e);
    }

    // Actualizar en almacenamiento local
    const current = this.getCategorias();
    const updated = current.map(c => (c === oldName ? cleanNew : c));
    if (!updated.includes(cleanNew)) updated.push(cleanNew);
    try {
      localStorage.setItem('estrella_categorias', JSON.stringify(updated));
    } catch {}
  },

  async deleteCategoria(nombre: string, reasignarA: string = 'Pan Rústico'): Promise<void> {
    // Reasignar productos en Supabase si existen
    try {
      await supabase
        .from('productos')
        .update({ categoria: reasignarA })
        .eq('categoria', nombre);
    } catch (e) {
      console.warn('Aviso al reasignar categoría en Supabase:', e);
    }

    // Remover de almacenamiento local
    const current = this.getCategorias();
    const updated = current.filter(c => c !== nombre);
    try {
      localStorage.setItem('estrella_categorias', JSON.stringify(updated.length > 0 ? updated : ['Pan Rústico']));
    } catch {}
  },

  // Productos (Catálogo & Recetas)
  async getProductos(todos: boolean = true): Promise<Producto[]> {
    try {
      let query = supabase
        .from('productos')
        .select(`
          id,
          nombre,
          descripcion,
          precio,
          categoria,
          imagen_url,
          stock_disponible,
          activo,
          created_at,
          recetas (
            id,
            insumo_id,
            cantidad,
            insumos (
              nombre,
              unidad_medida,
              costo_unitario
            )
          )
        `)
        .order('id', { ascending: true });

      if (!todos) {
        query = query.eq('activo', 1);
      }

      const { data, error } = await query;
      if (error) throw error;
      if (!data) return this.getCachedOrFallbackProductos();

      const formatted: Producto[] = data.map((p: any) => {
        const recetasFormateadas = (p.recetas || []).map((r: any) => {
          const insumo = r.insumos || {};
          const costoUnit = Number(insumo.costo_unitario || 0);
          const cant = Number(r.cantidad || 0);
          return {
            id: Number(r.id),
            producto_id: Number(p.id),
            insumo_id: Number(r.insumo_id),
            cantidad: cant,
            insumo_nombre: insumo.nombre || 'Insumo',
            unidad_medida: insumo.unidad_medida || 'kg',
            costo_unitario: costoUnit,
            subtotal_costo: Math.round(cant * costoUnit),
          };
        });

        const costoProduccion = recetasFormateadas.reduce(
          (sum: number, r: any) => sum + r.subtotal_costo,
          0
        );

        return {
          id: Number(p.id),
          nombre: p.nombre,
          descripcion: p.descripcion || '',
          precio: Number(p.precio || 0),
          categoria: p.categoria || 'Pan Rústico',
          imagen_url: p.imagen_url || '/images/pan_estrella_1.jpg',
          stock_disponible: Number(p.stock_disponible || 0),
          activo: Number(p.activo !== undefined ? p.activo : 1),
          costo_produccion_unitario: Math.round(costoProduccion),
          receta: recetasFormateadas,
        };
      });

      // Keep backup in localStorage
      try {
        localStorage.setItem('estrella_cached_productos', JSON.stringify(formatted));
      } catch {}

      return formatted;
    } catch (err: any) {
      console.warn('Error al consultar Supabase (productos):', err.message);
      return this.getCachedOrFallbackProductos();
    }
  },

  async createProducto(data: Partial<Producto> & { ingredientes?: Array<{ insumo_id: number; cantidad: number }> }): Promise<any> {
    const { data: prodData, error: prodErr } = await supabase
      .from('productos')
      .insert([{
        nombre: data.nombre,
        descripcion: data.descripcion || '',
        precio: Number(data.precio || 0),
        categoria: data.categoria || 'Pan Rústico',
        imagen_url: data.imagen_url || '/images/pan_estrella_1.jpg',
        stock_disponible: Number(data.stock_disponible || 0),
        activo: data.activo !== undefined ? Number(data.activo) : 1,
      }])
      .select()
      .single();

    if (prodErr) throw new Error(prodErr.message);

    if (data.ingredientes && data.ingredientes.length > 0) {
      const recRows = data.ingredientes.map(i => ({
        producto_id: prodData.id,
        insumo_id: i.insumo_id,
        cantidad: Number(i.cantidad),
      }));

      const { error: recErr } = await supabase.from('recetas').insert(recRows);
      if (recErr) console.warn('Error al guardar ingredientes de receta:', recErr.message);
    }

    return { id: prodData.id, success: true, message: 'Producto creado exitosamente' };
  },

  async updateProducto(id: number, data: Partial<Producto> & { ingredientes?: Array<{ insumo_id: number; cantidad: number }> }): Promise<any> {
    const updatePayload: any = {};
    if (data.nombre !== undefined) updatePayload.nombre = data.nombre;
    if (data.descripcion !== undefined) updatePayload.descripcion = data.descripcion;
    if (data.precio !== undefined) updatePayload.precio = Number(data.precio);
    if (data.categoria !== undefined) updatePayload.categoria = data.categoria;
    if (data.imagen_url !== undefined) updatePayload.imagen_url = data.imagen_url;
    if (data.stock_disponible !== undefined) updatePayload.stock_disponible = Number(data.stock_disponible);
    if (data.activo !== undefined) updatePayload.activo = Number(data.activo);

    if (Object.keys(updatePayload).length > 0) {
      const { error: upErr } = await supabase
        .from('productos')
        .update(updatePayload)
        .eq('id', id);
      if (upErr) throw new Error(upErr.message);
    }

    if (data.ingredientes) {
      // Reemplazar recetas del producto
      await supabase.from('recetas').delete().eq('producto_id', id);

      if (data.ingredientes.length > 0) {
        const recRows = data.ingredientes.map(i => ({
          producto_id: id,
          insumo_id: i.insumo_id,
          cantidad: Number(i.cantidad),
        }));
        const { error: insErr } = await supabase.from('recetas').insert(recRows);
        if (insErr) console.warn('Error al actualizar ingredientes:', insErr.message);
      }
    }

    return { success: true, message: 'Producto actualizado exitosamente' };
  },

  async deleteProducto(id: number, permanente: boolean = true): Promise<any> {
    if (permanente) {
      await supabase.from('recetas').delete().eq('producto_id', id);
      const { error } = await supabase.from('productos').delete().eq('id', id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await supabase.from('productos').update({ activo: 0 }).eq('id', id);
      if (error) throw new Error(error.message);
    }
    return { success: true, message: 'Producto eliminado' };
  },

  // Insumos (Materia Prima)
  async getInsumos(): Promise<Insumo[]> {
    try {
      const { data, error } = await supabase
        .from('insumos')
        .select('*')
        .order('id', { ascending: true });

      if (error) throw error;
      if (!data || data.length === 0) return this.getCachedOrFallbackInsumos();

      const formatted: Insumo[] = data.map((i: any) => ({
        id: Number(i.id),
        nombre: i.nombre,
        unidad_medida: i.unidad_medida,
        costo_unitario: Number(i.costo_unitario || 0),
        stock_actual: Number(i.stock_actual || 0),
        stock_minimo: Number(i.stock_minimo || 0),
        stock_inicial: Number(i.stock_inicial || 0),
      }));

      try {
        localStorage.setItem('estrella_cached_insumos', JSON.stringify(formatted));
      } catch {}

      return formatted;
    } catch (err: any) {
      console.warn('Error al consultar Supabase (insumos):', err.message);
      return this.getCachedOrFallbackInsumos();
    }
  },

  async createInsumo(data: Partial<Insumo>): Promise<any> {
    const stockActual = Number(data.stock_actual || 0);
    const { data: result, error } = await supabase
      .from('insumos')
      .insert([{
        nombre: data.nombre || 'Nuevo Insumo',
        unidad_medida: data.unidad_medida || 'kg',
        costo_unitario: Number(data.costo_unitario || 0),
        stock_actual: stockActual,
        stock_minimo: Number(data.stock_minimo || 0),
        stock_inicial: Number(data.stock_inicial !== undefined ? data.stock_inicial : stockActual),
      }])
      .select()
      .single();

    if (error) throw new Error(error.message);
    return { id: result.id, success: true };
  },

  async updateInsumo(id: number, data: Partial<Insumo>): Promise<any> {
    const { error } = await supabase
      .from('insumos')
      .update({
        nombre: data.nombre,
        unidad_medida: data.unidad_medida,
        costo_unitario: Number(data.costo_unitario),
        stock_minimo: Number(data.stock_minimo),
      })
      .eq('id', id);

    if (error) throw new Error(error.message);
    return { success: true };
  },

  async restockInsumo(id: number, cantidad: number, _motivo?: string): Promise<any> {
    const { data: current, error: getErr } = await supabase
      .from('insumos')
      .select('stock_actual')
      .eq('id', id)
      .single();

    if (getErr) throw new Error(getErr.message);

    const newStock = Number(current.stock_actual || 0) + Number(cantidad);
    const { error: upErr } = await supabase
      .from('insumos')
      .update({ stock_actual: newStock })
      .eq('id', id);

    if (upErr) throw new Error(upErr.message);
    return { success: true, stock_actual: newStock };
  },

  // Ventas (POS)
  async registrarVenta(data: {
    items: Array<{ producto_id: number; cantidad: number }>;
    metodo_pago: string;
    aplicar_impuesto: boolean;
    cajero?: string;
  }): Promise<{ success: boolean; ticket: TicketVenta }> {
    const prods = await this.getProductos(true);
    let subtotal = 0;
    let costoTotalInsumos = 0;

    const itemsCalculados = data.items.map(item => {
      const prod = prods.find(p => p.id === item.producto_id);
      const precioUnit = prod ? prod.precio : 0;
      const sub = precioUnit * item.cantidad;
      const costoIns = Number(prod?.costo_produccion_unitario || 0) * item.cantidad;
      subtotal += sub;
      costoTotalInsumos += costoIns;

      return {
        producto_id: item.producto_id,
        producto_nombre: prod ? prod.nombre : 'Producto',
        cantidad: item.cantidad,
        precio_unitario: precioUnit,
        subtotal: sub,
        costo_insumos_estimado: costoIns,
      };
    });

    const impuesto = data.aplicar_impuesto ? Math.round(subtotal * 0.19) : 0;
    const total = subtotal + impuesto;
    const ticketNum = `TK-${Date.now().toString().slice(-6)}`;

    // Try online execution with Supabase
    if (navigator.onLine) {
      try {
        const { data: ventaData, error: ventaErr } = await supabase
          .from('ventas')
          .insert([{
            numero_ticket: ticketNum,
            subtotal,
            impuesto,
            total,
            metodo_pago: data.metodo_pago,
            cajero: data.cajero || 'Cajero Principal',
          }])
          .select()
          .single();

        if (!ventaErr && ventaData) {
          const itemRows = itemsCalculados.map(it => ({
            venta_id: ventaData.id,
            ...it,
          }));
          await supabase.from('venta_items').insert(itemRows);

          // Descontar stock de productos vendidos
          for (const it of data.items) {
            const prod = prods.find(p => p.id === it.producto_id);
            if (prod) {
              const nuevoStock = Math.max(0, prod.stock_disponible - it.cantidad);
              await supabase.from('productos').update({ stock_disponible: nuevoStock }).eq('id', it.producto_id);
            }
          }

          const ticket: TicketVenta = {
            id: Number(ventaData.id),
            codigo_ticket: ticketNum,
            fecha: new Date().toISOString(),
            items: itemsCalculados.map(it => ({
              producto_id: it.producto_id,
              nombre: it.producto_nombre,
              cantidad: it.cantidad,
              precio_unitario: it.precio_unitario,
              subtotal: it.subtotal,
            })),
            subtotal,
            impuesto,
            total,
            costo_insumos: costoTotalInsumos,
            metodo_pago: data.metodo_pago as any,
            cajero: data.cajero || 'Cajero Principal',
          };

          return { success: true, ticket };
        }
      } catch (err) {
        console.warn('Conexión inestable con la nube. Guardando venta en cola local offline...', err);
      }
    }

    // Fallback Offline: Guardar en cola local y actualizar stock en caché
    const offlineItems = itemsCalculados.map(it => {
      const prod = prods.find(p => p.id === it.producto_id) || {
        id: it.producto_id,
        nombre: it.producto_nombre,
        precio: it.precio_unitario,
        descripcion: '',
        categoria: 'Pan Rústico',
        imagen_url: '/images/pan_estrella_1.jpg',
        stock_disponible: 100,
        activo: 1,
      };
      return {
        producto: prod,
        cantidad: it.cantidad,
      };
    });

    saveOfflineSale({
      items: offlineItems as any,
      subtotal,
      descuento: 0,
      total,
      metodo_pago: data.metodo_pago as any,
      vendedor: data.cajero || 'Cajero (Offline)',
    });

    const offlineTicket: TicketVenta = {
      id: Date.now(),
      codigo_ticket: `${ticketNum}-OFF`,
      fecha: new Date().toISOString(),
      items: itemsCalculados.map(it => ({
        producto_id: it.producto_id,
        nombre: it.producto_nombre,
        cantidad: it.cantidad,
        precio_unitario: it.precio_unitario,
        subtotal: it.subtotal,
      })),
      subtotal,
      impuesto,
      total,
      costo_insumos: costoTotalInsumos,
      metodo_pago: data.metodo_pago as any,
      cajero: `${data.cajero || 'Cajero'} (Sin Conexión)`,
    };

    return { success: true, ticket: offlineTicket };
  },

  async getVentas(): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('ventas')
        .select(`
          *,
          venta_items (*)
        `)
        .order('id', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch {
      return [];
    }
  },

  async getVentaDetalle(id: number): Promise<any> {
    const { data, error } = await supabase
      .from('ventas')
      .select(`
        *,
        venta_items (*)
      `)
      .eq('id', id)
      .single();

    if (error) throw new Error(error.message);
    return data;
  },

  // Producción
  async getProduccion(fecha?: string): Promise<ProduccionRegistro[]> {
    try {
      let query = supabase
        .from('produccion_registros')
        .select(`
          *,
          productos (
            nombre,
            precio,
            imagen_url
          )
        `)
        .order('id', { ascending: false });

      if (fecha) query = query.eq('fecha', fecha);

      const { data, error } = await query;
      if (error) throw error;

      return (data || []).map((r: any) => ({
        id: Number(r.id),
        fecha: r.fecha,
        producto_id: Number(r.producto_id),
        producto_nombre: r.productos?.nombre || 'Pan Especial',
        producto_precio: Number(r.productos?.precio || 0),
        imagen_url: r.productos?.imagen_url || '/images/pan_estrella_1.jpg',
        cantidad_producida: Number(r.cantidad_producida),
        merma_unidades: Number(r.merma_unidades || 0),
        maestro_panadero: r.maestro_panadero || 'Maestro Hornero',
        tanda: r.tanda || 'Mañana',
        notas: r.notas || '',
        created_at: r.created_at,
      }));
    } catch {
      return [];
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
    const fechaProd = data.fecha || new Date().toISOString().split('T')[0];

    const { data: prodReg, error: regErr } = await supabase
      .from('produccion_registros')
      .insert([{
        fecha: fechaProd,
        producto_id: data.producto_id,
        cantidad_producida: Number(data.cantidad_producida),
        merma_unidades: Number(data.merma_unidades || 0),
        maestro_panadero: data.maestro_panadero || 'Maestro Hornero',
        tanda: data.tanda || 'Mañana (05:00 AM)',
        notas: data.notas || '',
      }])
      .select()
      .single();

    if (regErr) throw new Error(regErr.message);

    // Incrementar stock de vitrina
    const prods = await this.getProductos(true);
    const prod = prods.find(p => p.id === data.producto_id);
    if (prod) {
      const nuevoStock = prod.stock_disponible + Number(data.cantidad_producida);
      await supabase.from('productos').update({ stock_disponible: nuevoStock }).eq('id', data.producto_id);

      // Descontar insumos según receta
      for (const rec of (prod.receta || [])) {
        const consumo = rec.cantidad * (Number(data.cantidad_producida) + Number(data.merma_unidades || 0));
        const { data: insumoRow } = await supabase
          .from('insumos')
          .select('stock_actual')
          .eq('id', rec.insumo_id)
          .single();

        if (insumoRow) {
          const nuevoStockInsumo = Math.max(0, Number(insumoRow.stock_actual) - consumo);
          await supabase.from('insumos').update({ stock_actual: nuevoStockInsumo }).eq('id', rec.insumo_id);
        }
      }
    }

    return { success: true, id: prodReg.id };
  },

  // Reportes
  async getContrasteInventario(): Promise<ContrasteInsumo[]> {
    try {
      const insumos = await this.getInsumos();
      return insumos.map(ins => {
        const consumido = Math.max(0, Number((ins.stock_inicial - ins.stock_actual).toFixed(2)));
        let alerta: 'normal' | 'advertencia' | 'critico' = 'normal';
        if (ins.stock_actual <= ins.stock_minimo * 0.5) alerta = 'critico';
        else if (ins.stock_actual <= ins.stock_minimo) alerta = 'advertencia';

        return {
          id: ins.id,
          nombre: ins.nombre,
          unidad_medida: ins.unidad_medida,
          costo_unitario: ins.costo_unitario,
          stock_inicial: ins.stock_inicial,
          stock_actual: ins.stock_actual,
          stock_minimo: ins.stock_minimo,
          consumido_por_ventas: consumido,
          consumo_teorico_produccion: consumido,
          merma_estimada: 0,
          reabastecido: 0,
          discrepancia: 0,
          nivel_alerta: alerta,
        };
      });
    } catch {
      return [];
    }
  },

  async getDashboard(periodo: string = 'todo'): Promise<DashboardReport> {
    try {
      const { data: allVentas, error } = await supabase
        .from('ventas')
        .select(`
          *,
          venta_items (*)
        `)
        .order('id', { ascending: true });

      if (error || !allVentas || allVentas.length === 0) {
        return {
          periodo,
          metricas: {
            total_ventas: 0,
            total_transacciones: 0,
            total_panes_vendidos: 0,
            costo_total_insumos: 0,
            ganancia_bruta: 0,
            margen_porcentaje: 0,
            ticket_promedio: 0,
            total_producido: 0,
            total_merma: 0,
          },
          top_productos: [],
          ventas_por_dia: [],
          metodos_pago: [],
        };
      }

      // Filtrar ventas según el período seleccionado
      const now = new Date();
      const getVentaDate = (v: any): string => {
        const raw = v.fecha || v.created_at || '';
        if (!raw) return now.toISOString().split('T')[0];
        return raw.split('T')[0] || raw.substring(0, 10);
      };

      let ventas = allVentas;
      if (periodo === 'hoy') {
        const todayStr = now.toISOString().split('T')[0];
        ventas = allVentas.filter(v => getVentaDate(v) === todayStr);
      } else if (periodo === 'semana') {
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        ventas = allVentas.filter(v => getVentaDate(v) >= sevenDaysAgo);
      } else if (periodo === 'mes') {
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        ventas = allVentas.filter(v => getVentaDate(v) >= thirtyDaysAgo);
      }

      let totalVentas = 0;
      let totalPanes = 0;
      let costoInsumos = 0;
      const metodosCount: Record<string, { count: number; total: number }> = {};
      const prodStats: Record<number, any> = {};
      const dayMap: Record<string, { count: number; total: number; costo: number }> = {};

      for (const v of ventas) {
        const vTotal = Number(v.total || 0);
        totalVentas += vTotal;

        const met = v.metodo_pago || 'Efectivo';
        if (!metodosCount[met]) metodosCount[met] = { count: 0, total: 0 };
        metodosCount[met].count += 1;
        metodosCount[met].total += vTotal;

        const diaKey = getVentaDate(v);
        if (!dayMap[diaKey]) dayMap[diaKey] = { count: 0, total: 0, costo: 0 };
        dayMap[diaKey].count += 1;
        dayMap[diaKey].total += vTotal;

        let ventaCosto = 0;
        for (const it of v.venta_items || []) {
          const qty = Number(it.cantidad || 0);
          const sub = Number(it.subtotal || 0);
          const cInsumo = Number(it.costo_insumos_estimado || 0);

          totalPanes += qty;
          costoInsumos += cInsumo;
          ventaCosto += cInsumo;

          if (!prodStats[it.producto_id]) {
            prodStats[it.producto_id] = {
              id: it.producto_id,
              nombre: it.producto_nombre,
              categoria: 'Panadería',
              imagen_url: '/images/pan_estrella_1.jpg',
              precio: Number(it.precio_unitario || 0),
              unidades_vendidas: 0,
              ingresos_generados: 0,
              costo_insumos_acumulado: 0,
              margen_estimado: 0,
            };
          }
          prodStats[it.producto_id].unidades_vendidas += qty;
          prodStats[it.producto_id].ingresos_generados += sub;
          prodStats[it.producto_id].costo_insumos_acumulado += cInsumo;
        }

        dayMap[diaKey].costo += ventaCosto;
      }

      // Si el filtro es 'semana' o si hay pocos días registrados, asegurar que el eje X muestre contexto temporal continuo
      const todayStr = now.toISOString().split('T')[0];
      if (periodo === 'semana' || Object.keys(dayMap).length <= 2) {
        // Asegurar últimos 5 días en el gráfico para que la comparativa dinámica sea visible y estética
        for (let i = 4; i >= 0; i--) {
          const dStr = new Date(now.getTime() - i * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
          if (!dayMap[dStr]) {
            dayMap[dStr] = { count: 0, total: 0, costo: 0 };
          }
        }
      }

      const ventasPorDia = Object.entries(dayMap)
        .map(([dia, dat]) => ({
          dia,
          cantidad_ventas: dat.count,
          total_dinero: dat.total,
          costo_insumos: dat.costo,
          ganancia: dat.total - dat.costo,
        }))
        .sort((a, b) => a.dia.localeCompare(b.dia));

      const ganancia = totalVentas - costoInsumos;
      const margen = totalVentas > 0 ? (ganancia / totalVentas) * 100 : 0;
      const ticketProm = ventas.length > 0 ? Math.round(totalVentas / ventas.length) : 0;

      const topProds = Object.values(prodStats)
        .map(p => ({
          ...p,
          margen_estimado: p.ingresos_generados > 0
            ? Math.round(((p.ingresos_generados - p.costo_insumos_acumulado) / p.ingresos_generados) * 100)
            : 0,
        }))
        .sort((a, b) => b.unidades_vendidas - a.unidades_vendidas)
        .slice(0, 5);

      const metodosArr = Object.entries(metodosCount).map(([metodo_pago, dat]) => ({
        metodo_pago,
        count: dat.count,
        total: dat.total,
      }));

      return {
        periodo,
        metricas: {
          total_ventas: totalVentas,
          total_transacciones: ventas.length,
          total_panes_vendidos: totalPanes,
          costo_total_insumos: costoInsumos,
          ganancia_bruta: ganancia,
          margen_porcentaje: Math.round(margen),
          ticket_promedio: ticketProm,
          total_producido: totalPanes,
          total_merma: 0,
        },
        top_productos: topProds,
        ventas_por_dia: ventasPorDia,
        metodos_pago: metodosArr,
      };
    } catch {
      return {
        periodo,
        metricas: {
          total_ventas: 0,
          total_transacciones: 0,
          total_panes_vendidos: 0,
          costo_total_insumos: 0,
          ganancia_bruta: 0,
          margen_porcentaje: 0,
          ticket_promedio: 0,
          total_producido: 0,
          total_merma: 0,
        },
        top_productos: [],
        ventas_por_dia: [],
        metodos_pago: [],
      };
    }
  },
};
