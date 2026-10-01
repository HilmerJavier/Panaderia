import React, { useState, useEffect } from 'react';
import { 
  BarChart3, DollarSign, TrendingUp, ShoppingBag, PieChart, 
  Calendar, ArrowUpRight, Award, Receipt, Wheat, ChevronRight
} from 'lucide-react';
import { DashboardReport, TicketVenta } from '../types';
import { api } from '../services/api';
import { formatCOP, formatNumberCOP } from '../utils/formatters';

interface DashboardModuleProps {
  onViewTicket?: (ticket: TicketVenta) => void;
}

export const DashboardModule: React.FC<DashboardModuleProps> = () => {
  const [periodo, setPeriodo] = useState<'hoy' | 'semana' | 'mes' | 'todo'>('todo');
  const [reporte, setReporte] = useState<DashboardReport | null>(null);
  const [ventasRecientes, setVentasRecientes] = useState<any[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);

  const loadData = async (selPeriodo = periodo) => {
    setLoading(true);
    try {
      const [dash, ventas] = await Promise.all([
        api.getDashboard(selPeriodo),
        api.getVentas(),
      ]);
      setReporte(dash);
      setVentasRecientes(ventas);
    } catch (err: any) {
      console.error('Error cargando reportes:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData(periodo);
  }, [periodo]);

  const viewTicketDetail = async (id: number) => {
    try {
      const data = await api.getVentaDetalle(id);
      setSelectedTicket(data);
    } catch (err) {
      console.error('Error al ver ticket:', err);
    }
  };

  const metricas = reporte?.metricas;

  // Max value for bar chart visualization
  const maxDaySales = Math.max(
    ...(reporte?.ventas_por_dia.map(d => d.total_dinero) || [100000]),
    50000
  );

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 w-full space-y-6">
      
      {/* Top Header & Period Filter Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-stone-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-orange-600 uppercase tracking-wider">
            <TrendingUp className="w-4 h-4 text-orange-600" />
            <span>Finanzas & Rentabilidad · Panadería La Estrella del Socorro</span>
          </div>
          <h2 className="text-xl font-bold text-stone-900 font-display mt-0.5">
            Panel de Control y Balance Financiero (COP)
          </h2>
          <p className="text-xs text-stone-500 mt-1">
            Ventas brutas, costo de materias primas por escandallo y margen de ganancia en pesos colombianos.
          </p>
        </div>

        {/* Period Segmented Buttons */}
        <div className="flex items-center gap-1 p-1 bg-stone-100 rounded-xl">
          {[
            { id: 'hoy', label: 'Hoy' },
            { id: 'semana', label: 'Semana (7d)' },
            { id: 'mes', label: 'Mes (30d)' },
            { id: 'todo', label: 'Histórico' },
          ].map(p => (
            <button
              key={p.id}
              onClick={() => setPeriodo(p.id as any)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                periodo === p.id
                  ? 'bg-stone-900 text-amber-400 shadow-xs font-bold'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* METRIC STAT CARDS IN COP */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        
        {/* Total Sales */}
        <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-stone-400">
            <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500">Ventas Totales</span>
            <DollarSign className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-3">
            <div className="text-xl sm:text-2xl font-bold font-mono text-stone-900 tabular-nums">
              {formatCOP(metricas?.total_ventas || 0)}
            </div>
            <div className="text-[11px] text-stone-500 mt-0.5">
              {metricas?.total_transacciones || 0} tickets emitidos
            </div>
          </div>
        </div>

        {/* Total Bread Sold */}
        <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-stone-400">
            <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500">Panes Vendidos</span>
            <ShoppingBag className="w-4 h-4 text-orange-600" />
          </div>
          <div className="mt-3">
            <div className="text-xl sm:text-2xl font-bold font-mono text-stone-900 tabular-nums">
              {metricas?.total_panes_vendidos || 0}
            </div>
            <div className="text-[11px] text-stone-500 mt-0.5">
              Unidades despachadas
            </div>
          </div>
        </div>

        {/* Cost of Ingredients */}
        <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-stone-400">
            <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500">Costo Insumos</span>
            <Wheat className="w-4 h-4 text-red-600" />
          </div>
          <div className="mt-3">
            <div className="text-xl sm:text-2xl font-bold font-mono text-red-700 tabular-nums">
              {formatCOP(metricas?.costo_total_insumos || 0)}
            </div>
            <div className="text-[11px] text-stone-500 mt-0.5">
              Materia prima consumida
            </div>
          </div>
        </div>

        {/* Gross Profit */}
        <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-stone-400">
            <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500">Ganancia Bruta</span>
            <ArrowUpRight className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-3">
            <div className="text-xl sm:text-2xl font-bold font-mono text-emerald-700 tabular-nums">
              {formatCOP(metricas?.ganancia_bruta || 0)}
            </div>
            <div className="text-[11px] text-emerald-800 font-bold mt-0.5">
              {metricas?.margen_porcentaje}% margen est.
            </div>
          </div>
        </div>

        {/* Average Ticket */}
        <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs flex flex-col justify-between col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between text-stone-400">
            <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500">Ticket Promedio</span>
            <Receipt className="w-4 h-4 text-stone-600" />
          </div>
          <div className="mt-3">
            <div className="text-xl sm:text-2xl font-bold font-mono text-stone-900 tabular-nums">
              {formatCOP(metricas?.ticket_promedio || 0)}
            </div>
            <div className="text-[11px] text-stone-500 mt-0.5">
              Por cliente atendido
            </div>
          </div>
        </div>
      </div>

      {/* CHARTS & RANKINGS ROW */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Visual Chart: Sales & Costs by Day in COP */}
        <div className="lg:col-span-7 bg-white p-5 rounded-2xl border border-stone-200 shadow-xs flex flex-col">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-stone-100">
            <div>
              <h3 className="font-bold text-sm text-stone-900 font-display">
                Histórico Dinámico de Ventas e Insumos (COP)
              </h3>
              <p className="text-xs text-stone-500">
                Comparativa diaria de facturación (naranja) frente a costo de materias primas (rojo).
              </p>
            </div>
            <div className="flex items-center gap-3 text-[11px]">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-orange-500"></span>
                <span className="text-stone-600 font-medium">Ventas</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-red-400"></span>
                <span className="text-stone-600 font-medium">Insumos</span>
              </div>
            </div>
          </div>

          <div className="flex-1 flex flex-col justify-end min-h-[220px] pt-4">
            {reporte?.ventas_por_dia && reporte.ventas_por_dia.length > 0 ? (
              <div className="flex items-end justify-between gap-2 h-44 border-b border-stone-200 pb-2">
                {reporte.ventas_por_dia.map((dia, idx) => {
                  const salesHeight = Math.max(14, Math.round((dia.total_dinero / maxDaySales) * 140));
                  const costHeight = Math.max(6, Math.round((dia.costo_insumos / maxDaySales) * 140));

                  return (
                    <div key={idx} className="flex-1 flex flex-col items-center gap-1 group">
                      <div className="text-[10px] text-stone-500 font-mono opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                        {formatCOP(dia.total_dinero)}
                      </div>
                      <div className="w-full max-w-[34px] flex items-end justify-center gap-1">
                        {/* Sales bar */}
                        <div
                          style={{ height: `${salesHeight}px` }}
                          className="w-1/2 bg-gradient-to-t from-orange-600 to-amber-400 hover:brightness-110 rounded-t-sm transition-all"
                          title={`Ventas: ${formatCOP(dia.total_dinero)}`}
                        ></div>
                        {/* Cost bar */}
                        <div
                          style={{ height: `${costHeight}px` }}
                          className="w-1/2 bg-red-400 hover:bg-red-500 rounded-t-sm transition-all"
                          title={`Costo Insumos: ${formatCOP(dia.costo_insumos)}`}
                        ></div>
                      </div>
                      <div className="text-[10px] font-mono text-stone-600 mt-1 truncate max-w-[48px]">
                        {dia.dia.substring(5)}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="h-44 flex items-center justify-center text-stone-400 text-xs">
                No hay transacciones registradas en este período.
              </div>
            )}
          </div>
        </div>

        {/* Top Selling Bread Products */}
        <div className="lg:col-span-5 bg-white p-5 rounded-2xl border border-stone-200 shadow-xs flex flex-col">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-stone-100">
            <div className="flex items-center gap-2">
              <Award className="w-4 h-4 text-orange-600" />
              <h3 className="font-bold text-sm text-stone-900 font-display">
                Panes Más Vendidos
              </h3>
            </div>
            <span className="text-[11px] text-stone-400 font-medium">Por volumen</span>
          </div>

          <div className="flex-1 space-y-3">
            {reporte?.top_productos.map((prod, idx) => (
              <div
                key={prod.id}
                className="flex items-center justify-between p-2.5 rounded-xl hover:bg-stone-50 transition-colors border border-stone-100"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-7 h-7 rounded-lg bg-orange-100 text-orange-900 font-bold font-mono text-xs flex items-center justify-center shrink-0">
                    #{idx + 1}
                  </div>
                  <div className="min-w-0">
                    <div className="font-semibold text-xs text-stone-900 truncate">
                      {prod.nombre}
                    </div>
                    <div className="text-[10px] text-stone-500">
                      {prod.categoria} · Margen: <strong className="text-emerald-700">{prod.margen_estimado}%</strong>
                    </div>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <div className="font-mono font-bold text-xs text-stone-900 tabular-nums">
                    {prod.unidades_vendidas} panes
                  </div>
                  <div className="text-[11px] text-stone-500 font-mono tabular-nums">
                    {formatCOP(prod.ingresos_generados)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* SALES HISTORY TABLE */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-stone-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Receipt className="w-4 h-4 text-stone-700" />
            <h3 className="font-bold text-sm text-stone-900 font-display">
              Historial de Ventas y Comandas
            </h3>
          </div>
          <span className="text-xs text-stone-400 font-mono">
            {ventasRecientes.length} tickets registrados
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-stone-50 border-b border-stone-200 text-stone-600 font-semibold uppercase tracking-wider">
                <th className="py-3 px-4">Ticket</th>
                <th className="py-3 px-3">Fecha y Hora</th>
                <th className="py-3 px-3 text-center">Panes</th>
                <th className="py-3 px-3">Forma Pago</th>
                <th className="py-3 px-3 text-right">Costo Insumos</th>
                <th className="py-3 px-3 text-right font-bold text-stone-900">Total Venta</th>
                <th className="py-3 px-4 text-center">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {ventasRecientes.slice(0, 15).map(v => (
                <tr key={v.id} className="hover:bg-stone-50 transition-colors">
                  <td className="py-3 px-4 font-mono font-semibold text-stone-800">
                    {v.codigo_ticket}
                  </td>
                  <td className="py-3 px-3 text-stone-500">
                    {v.fecha}
                  </td>
                  <td className="py-3 px-3 text-center font-mono font-bold tabular-nums text-stone-700">
                    {v.total_panes || '-'}
                  </td>
                  <td className="py-3 px-3 text-stone-600 font-medium">
                    {v.metodo_pago}
                  </td>
                  <td className="py-3 px-3 text-right font-mono tabular-nums text-red-700">
                    {formatCOP(v.costo_insumos_total)}
                  </td>
                  <td className="py-3 px-3 text-right font-mono tabular-nums font-bold text-sm text-stone-900">
                    {formatCOP(v.total)}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <button
                      onClick={() => viewTicketDetail(v.id)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-stone-700 hover:text-stone-950 bg-stone-100 hover:bg-stone-200 rounded-lg transition-colors cursor-pointer"
                    >
                      <span>Ver Comanda</span>
                      <ChevronRight className="w-3 h-3" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* TICKET DETAILS MODAL */}
      {selectedTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-stone-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <div>
                <h4 className="font-bold text-base text-stone-900 font-display">
                  Detalle del Ticket {selectedTicket.codigo_ticket}
                </h4>
                <p className="text-xs text-stone-500">{selectedTicket.fecha} · {selectedTicket.cajero}</p>
              </div>
              <button
                onClick={() => setSelectedTicket(null)}
                className="text-stone-400 hover:text-stone-700 text-xs px-2 py-1 bg-stone-100 rounded-lg cursor-pointer"
              >
                Cerrar
              </button>
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto divide-y divide-stone-100">
              {selectedTicket.items?.map((it: any) => (
                <div key={it.id} className="pt-2 flex justify-between items-center text-xs">
                  <div>
                    <div className="font-semibold text-stone-900">{it.producto_nombre}</div>
                    <div className="text-[11px] text-stone-500 font-mono">
                      {it.cantidad}x {formatCOP(it.precio_unitario)}
                    </div>
                  </div>
                  <div className="font-mono font-bold text-stone-900 tabular-nums">
                    {formatCOP(it.subtotal)}
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-3 border-t border-stone-200 space-y-1 text-xs font-mono">
              <div className="flex justify-between text-stone-500">
                <span>Subtotal:</span>
                <span className="tabular-nums">{formatCOP(selectedTicket.subtotal)}</span>
              </div>
              {selectedTicket.impuesto > 0 && (
                <div className="flex justify-between text-stone-500">
                  <span>IVA (19%):</span>
                  <span className="tabular-nums">{formatCOP(selectedTicket.impuesto)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-sm text-stone-900 pt-1">
                <span>Total Pagado:</span>
                <span className="text-red-700 text-base tabular-nums">{formatCOP(selectedTicket.total)}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
