import { Producto, Insumo, TicketVenta, ProduccionRegistro, ContrasteInsumo, DashboardReport, VentaItemDescontado } from '../types';

const INITIAL_INSUMOS: Insumo[] = [
  { id: 1, nombre: 'Harina de Trigo Especial W300', unidad_medida: 'kg', costo_unitario: 4200, stock_actual: 120, stock_minimo: 25, stock_inicial: 150 },
  { id: 2, nombre: 'Levadura Fresca Prensada', unidad_medida: 'kg', costo_unitario: 18000, stock_actual: 8.5, stock_minimo: 2, stock_inicial: 10 },
  { id: 3, nombre: 'Masa Madre Viva (Centeno/Trigo)', unidad_medida: 'kg', costo_unitario: 5000, stock_actual: 14, stock_minimo: 4, stock_inicial: 18 },
  { id: 4, nombre: 'Mantequilla Artesanal 82% MG', unidad_medida: 'kg', costo_unitario: 32000, stock_actual: 16.5, stock_minimo: 5, stock_inicial: 22 },
  { id: 5, nombre: 'Sal Marina Fina', unidad_medida: 'kg', costo_unitario: 2000, stock_actual: 28, stock_minimo: 6, stock_inicial: 30 },
  { id: 6, nombre: 'Azúcar Blanca Refinada', unidad_medida: 'kg', costo_unitario: 4600, stock_actual: 18, stock_minimo: 5, stock_inicial: 20 },
  { id: 7, nombre: 'Agua Purificada Filtrada', unidad_medida: 'L', costo_unitario: 200, stock_actual: 450, stock_minimo: 80, stock_inicial: 500 },
  { id: 8, nombre: 'Queso Campesino Rallado', unidad_medida: 'kg', costo_unitario: 24000, stock_actual: 12, stock_minimo: 3, stock_inicial: 15 },
  { id: 9, nombre: 'Aceite de Oliva Virgen Extra', unidad_medida: 'L', costo_unitario: 36000, stock_actual: 9.2, stock_minimo: 2, stock_inicial: 12 },
];

const INITIAL_PRODUCTOS: Producto[] = [
  {
    id: 1,
    nombre: 'Baguette Tradicional Francesa',
    descripcion: 'Corteza crujiente dorada y miga alveolada con 24h de fermentación lenta.',
    precio: 3500,
    categoria: 'Pan Rústico',
    imagen_url: '/src/assets/images/pan_estrella_1.jpg',
    stock_disponible: 32,
    activo: 1,
    costo_produccion_unitario: 1402,
    receta: [
      { id: 1, producto_id: 1, insumo_id: 1, cantidad: 0.30, insumo_nombre: 'Harina de Trigo Especial W300', unidad_medida: 'kg', costo_unitario: 4200, subtotal_costo: 1260 },
      { id: 2, producto_id: 1, insumo_id: 2, cantidad: 0.005, insumo_nombre: 'Levadura Fresca Prensada', unidad_medida: 'kg', costo_unitario: 18000, subtotal_costo: 90 },
      { id: 3, producto_id: 1, insumo_id: 5, cantidad: 0.006, insumo_nombre: 'Sal Marina Fina', unidad_medida: 'kg', costo_unitario: 2000, subtotal_costo: 12 },
      { id: 4, producto_id: 1, insumo_id: 7, cantidad: 0.20, insumo_nombre: 'Agua Purificada Filtrada', unidad_medida: 'L', costo_unitario: 200, subtotal_costo: 40 },
    ],
  },
  {
    id: 2,
    nombre: 'Pan Campesino de Masa Madre',
    descripcion: 'Hogaza rústica 100% masa madre con greña pronunciada y acidez equilibrada.',
    precio: 15000,
    categoria: 'Especiales',
    imagen_url: '/src/assets/images/pan_estrella_2.jpg',
    stock_disponible: 18,
    activo: 1,
    costo_produccion_unitario: 3160,
    receta: [
      { id: 5, producto_id: 2, insumo_id: 1, cantidad: 0.55, insumo_nombre: 'Harina de Trigo Especial W300', unidad_medida: 'kg', costo_unitario: 4200, subtotal_costo: 2310 },
      { id: 6, producto_id: 2, insumo_id: 3, cantidad: 0.15, insumo_nombre: 'Masa Madre Viva (Centeno/Trigo)', unidad_medida: 'kg', costo_unitario: 5000, subtotal_costo: 750 },
      { id: 7, producto_id: 2, insumo_id: 5, cantidad: 0.012, insumo_nombre: 'Sal Marina Fina', unidad_medida: 'kg', costo_unitario: 2000, subtotal_costo: 24 },
      { id: 8, producto_id: 2, insumo_id: 7, cantidad: 0.38, insumo_nombre: 'Agua Purificada Filtrada', unidad_medida: 'L', costo_unitario: 200, subtotal_costo: 76 },
    ],
  },
  {
    id: 3,
    nombre: 'Croissant Francés de Mantequilla',
    descripcion: 'Hojaldre artesanal con mantequilla pura al 82%, capas finas y esponjosas.',
    precio: 5500,
    categoria: 'Bollería / Dulce',
    imagen_url: '/src/assets/images/pan_estrella_3.jpg',
    stock_disponible: 25,
    activo: 1,
    costo_produccion_unitario: 1903,
    receta: [
      { id: 9, producto_id: 3, insumo_id: 1, cantidad: 0.08, insumo_nombre: 'Harina de Trigo Especial W300', unidad_medida: 'kg', costo_unitario: 4200, subtotal_costo: 336 },
      { id: 10, producto_id: 3, insumo_id: 4, cantidad: 0.045, insumo_nombre: 'Mantequilla Artesanal 82% MG', unidad_medida: 'kg', costo_unitario: 32000, subtotal_costo: 1440 },
      { id: 11, producto_id: 3, insumo_id: 6, cantidad: 0.015, insumo_nombre: 'Azúcar Blanca Refinada', unidad_medida: 'kg', costo_unitario: 4600, subtotal_costo: 69 },
      { id: 12, producto_id: 3, insumo_id: 2, cantidad: 0.003, insumo_nombre: 'Levadura Fresca Prensada', unidad_medida: 'kg', costo_unitario: 18000, subtotal_costo: 54 },
      { id: 13, producto_id: 3, insumo_id: 5, cantidad: 0.002, insumo_nombre: 'Sal Marina Fina', unidad_medida: 'kg', costo_unitario: 2000, subtotal_costo: 4 },
    ],
  },
  {
    id: 4,
    nombre: 'Ciabatta Rústica de Aceite de Oliva',
    descripcion: 'Pan italiano de alta hidratación con aceite de oliva virgen extra y miga abierta.',
    precio: 4800,
    categoria: 'Pan Blanco',
    imagen_url: '/src/assets/images/pan_estrella_4.jpg',
    stock_disponible: 22,
    activo: 1,
    costo_produccion_unitario: 2548,
    receta: [
      { id: 14, producto_id: 4, insumo_id: 1, cantidad: 0.35, insumo_nombre: 'Harina de Trigo Especial W300', unidad_medida: 'kg', costo_unitario: 4200, subtotal_costo: 1470 },
      { id: 15, producto_id: 4, insumo_id: 9, cantidad: 0.025, insumo_nombre: 'Aceite de Oliva Virgen Extra', unidad_medida: 'L', costo_unitario: 36000, subtotal_costo: 900 },
      { id: 16, producto_id: 4, insumo_id: 2, cantidad: 0.006, insumo_nombre: 'Levadura Fresca Prensada', unidad_medida: 'kg', costo_unitario: 18000, subtotal_costo: 108 },
      { id: 17, producto_id: 4, insumo_id: 5, cantidad: 0.007, insumo_nombre: 'Sal Marina Fina', unidad_medida: 'kg', costo_unitario: 2000, subtotal_costo: 14 },
      { id: 18, producto_id: 4, insumo_id: 7, cantidad: 0.28, insumo_nombre: 'Agua Purificada Filtrada', unidad_medida: 'L', costo_unitario: 200, subtotal_costo: 56 },
    ],
  },
  {
    id: 5,
    nombre: 'Pan Brioche / Blandito Artesanal',
    descripcion: 'Pan suave y esponjoso dorado al huevo, ideal para sándwich y hamburguesas.',
    precio: 2500,
    categoria: 'Pan Blanco',
    imagen_url: '/src/assets/images/pan_estrella_5.jpg',
    stock_disponible: 30,
    activo: 1,
    costo_produccion_unitario: 1088,
    receta: [
      { id: 19, producto_id: 5, insumo_id: 1, cantidad: 0.12, insumo_nombre: 'Harina de Trigo Especial W300', unidad_medida: 'kg', costo_unitario: 4200, subtotal_costo: 504 },
      { id: 20, producto_id: 5, insumo_id: 4, cantidad: 0.015, insumo_nombre: 'Mantequilla Artesanal 82% MG', unidad_medida: 'kg', costo_unitario: 32000, subtotal_costo: 480 },
      { id: 21, producto_id: 5, insumo_id: 2, cantidad: 0.003, insumo_nombre: 'Levadura Fresca Prensada', unidad_medida: 'kg', costo_unitario: 18000, subtotal_costo: 54 },
      { id: 22, producto_id: 5, insumo_id: 6, cantidad: 0.010, insumo_nombre: 'Azúcar Blanca Refinada', unidad_medida: 'kg', costo_unitario: 4600, subtotal_costo: 46 },
      { id: 23, producto_id: 5, insumo_id: 5, cantidad: 0.002, insumo_nombre: 'Sal Marina Fina', unidad_medida: 'kg', costo_unitario: 2000, subtotal_costo: 4 },
    ],
  },
  {
    id: 6,
    nombre: 'Pan Especial de la Casa La Estrella',
    descripcion: 'Receta insignia con corteza caramelizada, toque de mantequilla y semillas.',
    precio: 4200,
    categoria: 'Especiales',
    imagen_url: '/src/assets/images/pan_estrella_6.jpg',
    stock_disponible: 24,
    activo: 1,
    costo_produccion_unitario: 1952,
    receta: [
      { id: 24, producto_id: 6, insumo_id: 1, cantidad: 0.28, insumo_nombre: 'Harina de Trigo Especial W300', unidad_medida: 'kg', costo_unitario: 4200, subtotal_costo: 1176 },
      { id: 25, producto_id: 6, insumo_id: 4, cantidad: 0.020, insumo_nombre: 'Mantequilla Artesanal 82% MG', unidad_medida: 'kg', costo_unitario: 32000, subtotal_costo: 640 },
      { id: 26, producto_id: 6, insumo_id: 2, cantidad: 0.005, insumo_nombre: 'Levadura Fresca Prensada', unidad_medida: 'kg', costo_unitario: 18000, subtotal_costo: 90 },
      { id: 27, producto_id: 6, insumo_id: 5, cantidad: 0.005, insumo_nombre: 'Sal Marina Fina', unidad_medida: 'kg', costo_unitario: 2000, subtotal_costo: 10 },
      { id: 28, producto_id: 6, insumo_id: 7, cantidad: 0.18, insumo_nombre: 'Agua Purificada Filtrada', unidad_medida: 'L', costo_unitario: 200, subtotal_costo: 36 },
    ],
  },
];

const INITIAL_PRODUCCION: ProduccionRegistro[] = [
  { id: 1, producto_id: 1, producto_nombre: 'Baguette Tradicional Francesa', cantidad_producida: 40, merma_unidades: 2, maestro_panadero: 'Carlos Gómez (Maestro)', tanda: 'Mañana', notas: 'Corteza bien greñada', fecha: '2026-09-30 06:30' },
  { id: 2, producto_id: 3, producto_nombre: 'Croissant Francés de Mantequilla', cantidad_producida: 35, merma_unidades: 1, maestro_panadero: 'Elena Restrepo', tanda: 'Mañana', notas: 'Hojaldrado perfecto a 190°C', fecha: '2026-09-30 07:15' },
  { id: 3, producto_id: 2, producto_nombre: 'Pan Campesino de Masa Madre', cantidad_producida: 20, merma_unidades: 0, maestro_panadero: 'Carlos Gómez (Maestro)', tanda: 'Mañana', notas: 'Fermentación en frío 18h', fecha: '2026-09-30 08:00' },
];

const INITIAL_VENTAS: any[] = [
  {
    id: 1,
    codigo_ticket: 'TKT-20260930-101',
    fecha: '2026-09-30 08:45',
    cajero: 'Caja 1 · El Socorro',
    subtotal: 22000,
    impuesto: 0,
    total: 22000,
    metodo_pago: 'Efectivo',
    costo_insumos_total: 5964,
    total_panes: 3,
    items: [
      { producto_id: 2, nombre: 'Pan Campesino de Masa Madre', producto_nombre: 'Pan Campesino de Masa Madre', cantidad: 1, precio_unitario: 15000, costo_unitario: 3160, subtotal: 15000 },
      { producto_id: 1, nombre: 'Baguette Tradicional Francesa', producto_nombre: 'Baguette Tradicional Francesa', cantidad: 2, precio_unitario: 3500, costo_unitario: 1402, subtotal: 7000 },
    ],
  },
  {
    id: 2,
    codigo_ticket: 'TKT-20260930-102',
    fecha: '2026-09-30 09:30',
    cajero: 'Caja 1 · El Socorro',
    subtotal: 27500,
    impuesto: 0,
    total: 27500,
    metodo_pago: 'Tarjeta',
    costo_insumos_total: 9515,
    total_panes: 5,
    items: [
      { producto_id: 3, nombre: 'Croissant Francés de Mantequilla', producto_nombre: 'Croissant Francés de Mantequilla', cantidad: 5, precio_unitario: 5500, costo_unitario: 1903, subtotal: 27500 },
    ],
  },
];

class LocalStore {
  private get<T>(key: string, defaultValue: T): T {
    try {
      const saved = localStorage.getItem(`estrella_${key}`);
      return saved ? JSON.parse(saved) : defaultValue;
    } catch {
      return defaultValue;
    }
  }

  private set<T>(key: string, value: T): void {
    try {
      localStorage.setItem(`estrella_${key}`, JSON.stringify(value));
    } catch {}
  }

  getProductos(): Producto[] {
    return this.get<Producto[]>('productos', INITIAL_PRODUCTOS);
  }

  saveProductos(items: Producto[]): void {
    this.set('productos', items);
  }

  getInsumos(): Insumo[] {
    return this.get<Insumo[]>('insumos', INITIAL_INSUMOS);
  }

  saveInsumos(items: Insumo[]): void {
    this.set('insumos', items);
  }

  getVentas(): any[] {
    return this.get<any[]>('ventas', INITIAL_VENTAS);
  }

  saveVentas(items: any[]): void {
    this.set('ventas', items);
  }

  getProduccion(): ProduccionRegistro[] {
    return this.get<ProduccionRegistro[]>('produccion', INITIAL_PRODUCCION);
  }

  saveProduccion(items: ProduccionRegistro[]): void {
    this.set('produccion', items);
  }

  createProducto(data: any): any {
    const list = this.getProductos();
    const newId = Math.max(...list.map(p => p.id), 0) + 1;
    const newProd: Producto = {
      id: newId,
      nombre: data.nombre,
      descripcion: data.descripcion || '',
      precio: data.precio,
      categoria: data.categoria || 'Pan Rústico',
      imagen_url: data.imagen_url || '/src/assets/images/pan_estrella_1.jpg',
      stock_disponible: data.stock_disponible || 0,
      activo: 1,
      costo_produccion_unitario: 0,
      receta: [],
    };
    list.push(newProd);
    this.saveProductos(list);
    return { success: true, id: newId };
  }

  updateProducto(id: number, data: any): any {
    const list = this.getProductos();
    const idx = list.findIndex(p => p.id === id);
    if (idx >= 0) {
      list[idx] = { ...list[idx], ...data };
      if (data.ingredientes) {
        const insumos = this.getInsumos();
        let cost = 0;
        list[idx].receta = data.ingredientes.map((ing: any, i: number) => {
          const ins = insumos.find(x => x.id === ing.insumo_id);
          const sub = (ins?.costo_unitario || 0) * ing.cantidad;
          cost += sub;
          return {
            id: i + 1,
            producto_id: id,
            insumo_id: ing.insumo_id,
            cantidad: ing.cantidad,
            insumo_nombre: ins?.nombre || '',
            unidad_medida: ins?.unidad_medida || 'kg',
            costo_unitario: ins?.costo_unitario || 0,
            subtotal_costo: Math.round(sub),
          };
        });
        list[idx].costo_produccion_unitario = Math.round(cost);
      }
      this.saveProductos(list);
    }
    return { success: true };
  }

  deleteProducto(id: number): any {
    const list = this.getProductos().filter(p => p.id !== id);
    this.saveProductos(list);
    return { success: true };
  }

  createInsumo(data: any): any {
    const list = this.getInsumos();
    const newId = Math.max(...list.map(i => i.id), 0) + 1;
    const newIns: Insumo = {
      id: newId,
      nombre: data.nombre,
      unidad_medida: data.unidad_medida || 'kg',
      costo_unitario: data.costo_unitario || 0,
      stock_actual: data.stock_actual || 0,
      stock_minimo: data.stock_minimo || 5,
      stock_inicial: data.stock_actual || 0,
    };
    list.push(newIns);
    this.saveInsumos(list);
    return { success: true, id: newId };
  }

  updateInsumo(id: number, data: any): any {
    const list = this.getInsumos();
    const idx = list.findIndex(i => i.id === id);
    if (idx >= 0) {
      list[idx] = { ...list[idx], ...data };
      this.saveInsumos(list);
    }
    return { success: true };
  }

  restockInsumo(id: number, cantidad: number): any {
    const list = this.getInsumos();
    const idx = list.findIndex(i => i.id === id);
    if (idx >= 0) {
      list[idx].stock_actual = Math.round((list[idx].stock_actual + cantidad) * 100) / 100;
      this.saveInsumos(list);
    }
    return { success: true };
  }

  registrarVenta(data: { items: Array<{ producto_id: number; cantidad: number }>; metodo_pago: string; aplicar_impuesto: boolean; cajero?: string }): { success: boolean; ticket: TicketVenta } {
    const productos = this.getProductos();
    const insumos = this.getInsumos();

    let subtotal = 0;
    let costoInsumosTotal = 0;
    const ticketItems: Array<{ producto_id: number; nombre: string; precio_unitario: number; cantidad: number; subtotal: number }> = [];
    const insumosDescontadosMap: Record<number, number> = {};

    for (const item of data.items) {
      const prod = productos.find(p => p.id === item.producto_id);
      if (!prod) continue;

      const itemSubtotal = prod.precio * item.cantidad;
      subtotal += itemSubtotal;
      costoInsumosTotal += (prod.costo_produccion_unitario || 0) * item.cantidad;

      prod.stock_disponible = Math.max(0, prod.stock_disponible - item.cantidad);

      ticketItems.push({
        producto_id: item.producto_id,
        nombre: prod.nombre,
        cantidad: item.cantidad,
        precio_unitario: prod.precio,
        subtotal: itemSubtotal,
      });

      if (prod.receta) {
        for (const r of prod.receta) {
          const tot = r.cantidad * item.cantidad;
          insumosDescontadosMap[r.insumo_id] = (insumosDescontadosMap[r.insumo_id] || 0) + tot;
        }
      }
    }

    const insumosDescontados: VentaItemDescontado[] = [];
    for (const [insId, cant] of Object.entries(insumosDescontadosMap)) {
      const id = Number(insId);
      const ins = insumos.find(i => i.id === id);
      if (ins) {
        ins.stock_actual = Math.max(0, Math.round((ins.stock_actual - cant) * 1000) / 1000);
        insumosDescontados.push({
          insumo: ins.nombre,
          descontado: Math.round(cant * 1000) / 1000,
          unidad: ins.unidad_medida,
          stock_restante: ins.stock_actual,
        });
      }
    }

    this.saveProductos(productos);
    this.saveInsumos(insumos);

    const impuesto = data.aplicar_impuesto ? Math.round(subtotal * 0.19) : 0;
    const total = subtotal + impuesto;
    const now = new Date();
    const fecha = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const codigo = `TKT-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${Math.floor(100 + Math.random() * 900)}`;

    const venta = {
      id: Date.now(),
      codigo_ticket: codigo,
      fecha,
      cajero: data.cajero || 'Caja 1 · El Socorro',
      subtotal,
      impuesto,
      total,
      metodo_pago: data.metodo_pago,
      costo_insumos_total: Math.round(costoInsumosTotal),
      total_panes: data.items.reduce((s, i) => s + i.cantidad, 0),
      items: ticketItems,
    };

    const ventas = this.getVentas();
    ventas.unshift(venta);
    this.saveVentas(ventas);

    const ticket: TicketVenta = {
      id: venta.id,
      codigo_ticket: codigo,
      fecha,
      cajero: venta.cajero,
      subtotal,
      impuesto,
      total,
      costo_insumos: Math.round(costoInsumosTotal),
      metodo_pago: data.metodo_pago,
      items: ticketItems,
      insumos_descontados: insumosDescontados,
    };

    return { success: true, ticket };
  }

  registrarProduccion(data: any): any {
    const productos = this.getProductos();
    const prod = productos.find(p => p.id === data.producto_id);
    const ahora = new Date();
    const fecha = data.fecha || `${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, '0')}-${String(ahora.getDate()).padStart(2, '0')} ${String(ahora.getHours()).padStart(2, '0')}:${String(ahora.getMinutes()).padStart(2, '0')}`;

    if (prod) {
      const net = Math.max(0, data.cantidad_producida - (data.merma_unidades || 0));
      prod.stock_disponible += net;
      this.saveProductos(productos);
    }

    const reg: ProduccionRegistro = {
      id: Date.now(),
      producto_id: data.producto_id,
      producto_nombre: prod?.nombre || 'Pan',
      cantidad_producida: data.cantidad_producida,
      merma_unidades: data.merma_unidades || 0,
      maestro_panadero: data.maestro_panadero || 'Carlos Gómez',
      tanda: data.tanda || 'Mañana',
      notas: data.notas || '',
      fecha,
    };

    const list = this.getProduccion();
    list.unshift(reg);
    this.saveProduccion(list);
    return { success: true };
  }

  getContrasteInventario(): ContrasteInsumo[] {
    const insumos = this.getInsumos();
    const productos = this.getProductos();
    const ventas = this.getVentas();
    const produccion = this.getProduccion();

    return insumos.map(ins => {
      let consumidoVentas = 0;
      for (const v of ventas) {
        for (const item of v.items || []) {
          const prod = productos.find(p => p.id === item.producto_id);
          if (prod?.receta) {
            const r = prod.receta.find(x => x.insumo_id === ins.id);
            if (r) consumidoVentas += r.cantidad * item.cantidad;
          }
        }
      }

      let consumidoProd = 0;
      for (const pr of produccion) {
        const prod = productos.find(p => p.id === pr.producto_id);
        if (prod?.receta) {
          const r = prod.receta.find(x => x.insumo_id === ins.id);
          if (r) consumidoProd += r.cantidad * pr.cantidad_producida;
        }
      }

      const alerta: 'normal' | 'advertencia' | 'critico' = ins.stock_actual <= ins.stock_minimo
        ? 'critico'
        : ins.stock_actual <= ins.stock_minimo * 1.3
        ? 'advertencia'
        : 'normal';

      return {
        id: ins.id,
        nombre: ins.nombre,
        unidad_medida: ins.unidad_medida,
        costo_unitario: ins.costo_unitario,
        stock_inicial: ins.stock_inicial || ins.stock_actual,
        stock_actual: Math.round(ins.stock_actual * 100) / 100,
        stock_minimo: ins.stock_minimo,
        consumido_por_ventas: Math.round(consumidoVentas * 100) / 100,
        consumo_teorico_produccion: Math.round(consumidoProd * 100) / 100,
        merma_estimada: 0,
        reabastecido: 0,
        discrepancia: 0,
        nivel_alerta: alerta,
      };
    });
  }

  getDashboard(periodo: string = 'todo'): DashboardReport {
    const ventas = this.getVentas();
    const productos = this.getProductos();
    const produccion = this.getProduccion();

    const totalVentas = ventas.reduce((s, v) => s + v.total, 0);
    const costoTotalInsumos = ventas.reduce((s, v) => s + (v.costo_insumos_total || 0), 0);
    const totalPanes = ventas.reduce((s, v) => s + (v.total_panes || 0), 0);
    const totalTransacciones = ventas.length;
    const gananciaBruta = totalVentas - costoTotalInsumos;
    const margen = totalVentas > 0 ? Math.round((gananciaBruta / totalVentas) * 1000) / 10 : 0;
    const ticketPromedio = totalTransacciones > 0 ? Math.round(totalVentas / totalTransacciones) : 0;

    const totalProducido = produccion.reduce((s, p) => s + p.cantidad_producida, 0);
    const totalMerma = produccion.reduce((s, p) => s + p.merma_unidades, 0);

    const dayMap: Record<string, { count: number; total: number; costo: number }> = {};
    for (const v of ventas) {
      const dia = (v.fecha || '').split(' ')[0] || '2026-09-30';
      if (!dayMap[dia]) dayMap[dia] = { count: 0, total: 0, costo: 0 };
      dayMap[dia].count += 1;
      dayMap[dia].total += v.total;
      dayMap[dia].costo += v.costo_insumos_total || 0;
    }

    const ventasPorDia = Object.entries(dayMap).map(([dia, data]) => ({
      dia,
      cantidad_ventas: data.count,
      total_dinero: data.total,
      costo_insumos: data.costo,
      ganancia: data.total - data.costo,
    }));

    const prodCountMap: Record<number, { count: number; money: number; cost: number }> = {};
    for (const v of ventas) {
      for (const it of v.items || []) {
        if (!prodCountMap[it.producto_id]) prodCountMap[it.producto_id] = { count: 0, money: 0, cost: 0 };
        prodCountMap[it.producto_id].count += it.cantidad;
        prodCountMap[it.producto_id].money += it.subtotal;
        prodCountMap[it.producto_id].cost += (it.costo_unitario || 0) * it.cantidad;
      }
    }

    const topProductos = productos.map(p => {
      const sold = prodCountMap[p.id]?.count || 0;
      const money = prodCountMap[p.id]?.money || 0;
      const accumulatedCost = prodCountMap[p.id]?.cost || 0;
      const profit = p.precio - (p.costo_produccion_unitario || 0);
      const marg = p.precio > 0 ? Math.round((profit / p.precio) * 100) : 0;
      return {
        id: p.id,
        nombre: p.nombre,
        categoria: p.categoria,
        imagen_url: p.imagen_url,
        precio: p.precio,
        unidades_vendidas: sold,
        ingresos_generados: money,
        costo_insumos_acumulado: accumulatedCost,
        margen_estimado: marg,
      };
    }).sort((a, b) => b.unidades_vendidas - a.unidades_vendidas);

    const metodosPagoMap: Record<string, { count: number; total: number }> = {};
    for (const v of ventas) {
      const m = v.metodo_pago || 'Efectivo';
      if (!metodosPagoMap[m]) metodosPagoMap[m] = { count: 0, total: 0 };
      metodosPagoMap[m].count += 1;
      metodosPagoMap[m].total += v.total;
    }

    const metodosPago = Object.entries(metodosPagoMap).map(([metodo_pago, d]) => ({
      metodo_pago,
      count: d.count,
      total: d.total,
    }));

    return {
      periodo,
      metricas: {
        total_ventas: totalVentas,
        total_transacciones: totalTransacciones,
        total_panes_vendidos: totalPanes,
        costo_total_insumos: costoTotalInsumos,
        ganancia_bruta: gananciaBruta,
        margen_porcentaje: margen,
        ticket_promedio: ticketPromedio,
        total_producido: totalProducido,
        total_merma: totalMerma,
      },
      ventas_por_dia: ventasPorDia,
      top_productos: topProductos,
      metodos_pago: metodosPago,
    };
  }
}

export const localStore = new LocalStore();
