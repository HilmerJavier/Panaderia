export interface Insumo {
  id: number;
  nombre: string;
  unidad_medida: string;
  costo_unitario: number;
  stock_actual: number;
  stock_minimo: number;
  stock_inicial: number;
  estado_alerta?: 'normal' | 'advertencia' | 'critico';
  created_at?: string;
}

export interface RecetaItem {
  id?: number;
  producto_id?: number;
  insumo_id: number;
  cantidad: number;
  insumo_nombre?: string;
  unidad_medida?: string;
  costo_unitario?: number;
  subtotal_costo?: number;
}

export interface Producto {
  id: number;
  nombre: string;
  descripcion: string;
  precio: number;
  categoria: string;
  imagen_url: string;
  stock_disponible: number;
  activo?: number;
  costo_produccion_unitario?: number;
  receta?: RecetaItem[];
}

export interface CartItem {
  producto: Producto;
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
}

export interface VentaItemDescontado {
  insumo: string;
  descontado: number;
  unidad: string;
  stock_restante: number;
}

export interface TicketVenta {
  id: number;
  codigo_ticket: string;
  fecha: string;
  cajero: string;
  metodo_pago: string;
  items: Array<{
    producto_id: number;
    nombre: string;
    precio_unitario: number;
    cantidad: number;
    subtotal: number;
  }>;
  subtotal: number;
  impuesto: number;
  total: number;
  costo_insumos: number;
  insumos_descontados?: VentaItemDescontado[];
}

export interface ProduccionRegistro {
  id: number;
  fecha: string;
  producto_id: number;
  producto_nombre?: string;
  producto_precio?: number;
  imagen_url?: string;
  cantidad_producida: number;
  merma_unidades: number;
  maestro_panadero: string;
  tanda: string;
  notas: string;
  created_at?: string;
}

export interface ContrasteInsumo {
  id: number;
  nombre: string;
  unidad_medida: string;
  costo_unitario: number;
  stock_inicial: number;
  stock_actual: number;
  stock_minimo: number;
  consumido_por_ventas: number;
  consumo_teorico_produccion: number;
  merma_estimada: number;
  reabastecido: number;
  discrepancia: number;
  nivel_alerta: 'normal' | 'advertencia' | 'critico';
}

export interface DashboardReport {
  periodo: string;
  metricas: {
    total_ventas: number;
    total_transacciones: number;
    total_panes_vendidos: number;
    costo_total_insumos: number;
    ganancia_bruta: number;
    margen_porcentaje: number;
    ticket_promedio: number;
    total_producido: number;
    total_merma: number;
  };
  top_productos: Array<{
    id: number;
    nombre: string;
    categoria: string;
    imagen_url: string;
    precio: number;
    unidades_vendidas: number;
    ingresos_generados: number;
    costo_insumos_acumulado: number;
    margen_estimado: number;
  }>;
  ventas_por_dia: Array<{
    dia: string;
    cantidad_ventas: number;
    total_dinero: number;
    costo_insumos: number;
    ganancia: number;
  }>;
  metodos_pago: Array<{
    metodo_pago: string;
    count: number;
    total: number;
  }>;
}
