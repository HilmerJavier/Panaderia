import React, { useState, useEffect } from 'react';
import { 
  Wheat, PlusCircle, AlertTriangle, CheckCircle2, AlertCircle, 
  RotateCcw, Flame, Sparkles, Scale, RefreshCw, Layers
} from 'lucide-react';
import { Producto, Insumo, ProduccionRegistro, ContrasteInsumo } from '../types';
import { api } from '../services/api';
import { formatCOP } from '../utils/formatters';

interface ProduccionModuleProps {
  productos: Producto[];
  onRefreshAll: () => void;
}

export const ProduccionModule: React.FC<ProduccionModuleProps> = ({
  productos,
  onRefreshAll,
}) => {
  const [activeTab, setActiveTab] = useState<'contraste' | 'registro'>('contraste');
  const [contrasteData, setContrasteData] = useState<ContrasteInsumo[]>([]);
  const [historialProduccion, setHistorialProduccion] = useState<ProduccionRegistro[]>([]);
  const [loading, setLoading] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Form state for new production batch
  const [selectedProductoId, setSelectedProductoId] = useState<number>(productos[0]?.id || 1);
  const [cantidadProducida, setCantidadProducida] = useState<string>('40');
  const [mermaUnidades, setMermaUnidades] = useState<string>('0');
  const [maestroPanadero, setMaestroPanadero] = useState('Carlos Gómez (Maestro)');
  const [tanda, setTanda] = useState('Mañana');
  const [notas, setNotas] = useState('Horneado con vapor a 220°C por 24 min');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Restock modal state
  const [restockModalItem, setRestockModalItem] = useState<ContrasteInsumo | null>(null);
  const [restockAmount, setRestockAmount] = useState<string>('10');
  const [isRestocking, setIsRestocking] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [contraste, produccion] = await Promise.all([
        api.getContrasteInventario(),
        api.getProduccion(),
      ]);
      setContrasteData(contraste);
      setHistorialProduccion(produccion);
    } catch (err: any) {
      console.error('Error cargando módulo producción:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRegisterBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    const cant = parseInt(cantidadProducida, 10);
    const merma = parseInt(mermaUnidades, 10) || 0;

    if (!selectedProductoId || isNaN(cant) || cant <= 0) {
      setFeedbackMsg({ type: 'error', text: 'Por favor ingresa una cantidad válida de panes producidos.' });
      return;
    }

    setIsSubmitting(true);
    try {
      await api.registrarProduccion({
        producto_id: selectedProductoId,
        cantidad_producida: cant,
        merma_unidades: merma,
        maestro_panadero: maestroPanadero,
        tanda,
        notas,
      });

      setFeedbackMsg({
        type: 'success',
        text: `¡Tanda registrada con éxito! Se añadieron ${cant - merma} unidades al stock del producto.`,
      });

      // Reset form defaults
      setCantidadProducida('40');
      setMermaUnidades('0');
      await loadData();
      onRefreshAll();
    } catch (err: any) {
      setFeedbackMsg({ type: 'error', text: err.message || 'Error al registrar producción.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleExecuteRestock = async () => {
    if (!restockModalItem) return;
    const amount = parseFloat(restockAmount);
    if (isNaN(amount) || amount <= 0) return;

    setIsRestocking(true);
    try {
      await api.restockInsumo(restockModalItem.id, amount, 'Reabastecimiento de almacén');
      setRestockModalItem(null);
      setRestockAmount('10');
      await loadData();
      onRefreshAll();
    } catch (err: any) {
      alert(err.message || 'Error al reabastecer.');
    } finally {
      setIsRestocking(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 w-full space-y-6">
      
      {/* Top Banner and Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-stone-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-orange-600 uppercase tracking-wider">
            <Flame className="w-4 h-4 text-orange-600" />
            <span>Obrador · Panadería La Estrella del Socorro</span>
          </div>
          <h2 className="text-xl font-bold text-stone-900 font-display mt-0.5">
            Producción Diaria e Inventario de Insumos
          </h2>
          <p className="text-xs text-stone-500 mt-1">
            Contraste dinámico entre insumos iniciales, consumidos por ventas (COP), producción real y alertas de stock.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1 p-1 bg-stone-100 rounded-xl">
          <button
            onClick={() => setActiveTab('contraste')}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              activeTab === 'contraste'
                ? 'bg-stone-900 text-amber-400 shadow-xs font-bold'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            Contraste de Insumos
          </button>
          <button
            onClick={() => setActiveTab('registro')}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              activeTab === 'registro'
                ? 'bg-stone-900 text-amber-400 shadow-xs font-bold'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            + Registrar Producción
          </button>
        </div>
      </div>

      {feedbackMsg && (
        <div
          className={`p-3.5 rounded-xl border text-xs flex items-center justify-between gap-2 ${
            feedbackMsg.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedbackMsg.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{feedbackMsg.text}</span>
          </div>
          <button
            onClick={() => setFeedbackMsg(null)}
            className="text-stone-400 hover:text-stone-700 text-xs underline cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      )}

      {/* VIEW 1: CONTRASTE DINÁMICO DE DATOS */}
      {activeTab === 'contraste' && (
        <div className="space-y-6">
          
          {/* Legend and Stock Alerts Overview */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-3.5 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-emerald-950">Nivel Óptimo (Verde)</div>
                <div className="text-[11px] text-emerald-700">Stock por encima del 130% del mínimo requerido</div>
              </div>
            </div>

            <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-3.5 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-amber-950">Advertencia (Amarillo)</div>
                <div className="text-[11px] text-amber-700">Próximo a stock mínimo. Planificar compra</div>
              </div>
            </div>

            <div className="bg-red-50/70 border border-red-200 rounded-xl p-3.5 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-red-100 text-red-800 flex items-center justify-center font-bold">
                <AlertCircle className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-red-950">Crítico (Rojo)</div>
                <div className="text-[11px] text-red-700">Stock igual o inferior al mínimo. Urge reabastecer</div>
              </div>
            </div>
          </div>

          {/* Contrast Dynamic Table */}
          <div className="bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-stone-200 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-stone-900 font-display">
                  Tabla de Contraste: Inventario Inicial vs Consumo vs Producción Real
                </h3>
                <p className="text-xs text-stone-500">
                  Descuentos de insumos calculados automáticamente por receta en cada venta registrada.
                </p>
              </div>
              <button
                onClick={loadData}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-stone-600 bg-stone-100 hover:bg-stone-200 rounded-lg transition-colors cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Actualizar</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-stone-50 border-b border-stone-200 text-stone-600 font-semibold uppercase tracking-wider">
                    <th className="py-3 px-4">Insumo</th>
                    <th className="py-3 px-3 text-right">Inv. Inicial</th>
                    <th className="py-3 px-3 text-right">Consumo Ventas</th>
                    <th className="py-3 px-3 text-right">Consumo Teórico Prod.</th>
                    <th className="py-3 px-3 text-right font-bold text-stone-900">Stock Actual</th>
                    <th className="py-3 px-3 text-right">Stock Mínimo</th>
                    <th className="py-3 px-3 text-center">Estado Alerta</th>
                    <th className="py-3 px-4 text-center">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {contrasteData.map(ins => {
                    const isCritical = ins.nivel_alerta === 'critico';
                    const isWarning = ins.nivel_alerta === 'advertencia';

                    return (
                      <tr key={ins.id} className="hover:bg-stone-50/70 transition-colors">
                        <td className="py-3 px-4 font-semibold text-stone-900">
                          <div>{ins.nombre}</div>
                          <span className="text-[10px] text-stone-400 font-normal">
                            Unidad: {ins.unidad_medida} · Costo unitario: {formatCOP(ins.costo_unitario)}
                          </span>
                        </td>

                        <td className="py-3 px-3 text-right font-mono tabular-nums text-stone-600">
                          {ins.stock_inicial} {ins.unidad_medida}
                        </td>

                        <td className="py-3 px-3 text-right font-mono tabular-nums text-orange-700 font-semibold">
                          -{ins.consumido_por_ventas} {ins.unidad_medida}
                        </td>

                        <td className="py-3 px-3 text-right font-mono tabular-nums text-stone-600">
                          {ins.consumo_teorico_produccion} {ins.unidad_medida}
                        </td>

                        <td className="py-3 px-3 text-right font-mono tabular-nums font-bold text-sm">
                          <span
                            className={
                              isCritical
                                ? 'text-red-600'
                                : isWarning
                                ? 'text-amber-600'
                                : 'text-emerald-700'
                            }
                          >
                            {ins.stock_actual} {ins.unidad_medida}
                          </span>
                        </td>

                        <td className="py-3 px-3 text-right font-mono tabular-nums text-stone-500">
                          {ins.stock_minimo} {ins.unidad_medida}
                        </td>

                        <td className="py-3 px-3 text-center">
                          {isCritical ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-red-100 text-red-800">
                              <span className="w-1.5 h-1.5 rounded-full bg-red-600 animate-pulse"></span>
                              Crítico
                            </span>
                          ) : isWarning ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-amber-100 text-amber-800">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-600"></span>
                              Advertencia
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-emerald-100 text-emerald-800">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                              Óptimo
                            </span>
                          )}
                        </td>

                        <td className="py-3 px-4 text-center">
                          <button
                            onClick={() => {
                              setRestockModalItem(ins);
                              setRestockAmount('10');
                            }}
                            className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-stone-900 text-white hover:bg-stone-800 transition-colors shadow-2xs cursor-pointer"
                          >
                            + Reabastecer
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 2: REGISTRO DE PRODUCCIÓN DIARIA */}
      {activeTab === 'registro' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Production Form */}
          <div className="lg:col-span-5 bg-white p-6 rounded-2xl border border-stone-200 shadow-xs">
            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-stone-100">
              <Flame className="w-5 h-5 text-orange-600" />
              <h3 className="font-bold text-base text-stone-900 font-display">
                Registro de Tanda del Maestro Panadero
              </h3>
            </div>

            <form onSubmit={handleRegisterBatch} className="space-y-4">
              {/* Product Select */}
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Producto a Hornear:
                </label>
                <select
                  value={selectedProductoId}
                  onChange={e => setSelectedProductoId(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                >
                  {productos.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.nombre} ({formatCOP(p.precio)}) · Stock: {p.stock_disponible} disp.
                    </option>
                  ))}
                </select>
              </div>

              {/* Quantities row */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Unidades Producidas:
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={cantidadProducida}
                    onChange={e => setCantidadProducida(e.target.value)}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-mono font-bold text-stone-900 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                    placeholder="40"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Merma / Defectuosos:
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={mermaUnidades}
                    onChange={e => setMermaUnidades(e.target.value)}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-mono font-bold text-red-600 focus:outline-none focus:ring-2 focus:ring-red-500/20"
                    placeholder="0"
                  />
                </div>
              </div>

              {/* Tanda & Baker */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Tanda / Turno:
                  </label>
                  <select
                    value={tanda}
                    onChange={e => setTanda(e.target.value)}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                  >
                    <option value="Mañana">Mañana (05:00 - 12:00)</option>
                    <option value="Tarde">Tarde (13:00 - 18:00)</option>
                    <option value="Noche">Noche (19:00 - 02:00)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Maestro Panadero:
                  </label>
                  <input
                    type="text"
                    value={maestroPanadero}
                    onChange={e => setMaestroPanadero(e.target.value)}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                    placeholder="Nombre del maestro panadero"
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Notas de Obrador y Horno:
                </label>
                <textarea
                  rows={2}
                  value={notas}
                  onChange={e => setNotas(e.target.value)}
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                  placeholder="Ej. Fermentación en bloque 16h, vapor en horno de piso a 230°C."
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 px-4 bg-gradient-to-r from-red-600 via-orange-600 to-amber-500 hover:from-red-500 hover:to-amber-400 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <PlusCircle className="w-4 h-4" />
                <span>{isSubmitting ? 'Guardando...' : 'Confirmar Tanda en Stock'}</span>
              </button>
            </form>
          </div>

          {/* Recent Production History */}
          <div className="lg:col-span-7 bg-white p-6 rounded-2xl border border-stone-200 shadow-xs">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-stone-100">
              <div className="flex items-center gap-2">
                <Layers className="w-5 h-5 text-stone-700" />
                <h3 className="font-bold text-base text-stone-900 font-display">
                  Historial de Tandas Horneadas
                </h3>
              </div>
              <span className="text-xs text-stone-400 font-mono">
                {historialProduccion.length} tandas
              </span>
            </div>

            <div className="space-y-3 max-h-[460px] overflow-y-auto pr-1">
              {historialProduccion.length === 0 ? (
                <div className="text-center p-8 text-stone-400 text-xs">
                  No hay tandas registradas aún.
                </div>
              ) : (
                historialProduccion.map(item => (
                  <div
                    key={item.id}
                    className="p-3.5 rounded-xl border border-stone-200 hover:border-orange-200 transition-colors bg-stone-50/50 flex items-center justify-between gap-4 text-xs"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-stone-900 text-sm truncate">
                          {item.producto_nombre}
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-orange-100 text-orange-800">
                          {item.tanda}
                        </span>
                      </div>
                      <div className="text-[11px] text-stone-500 mt-0.5">
                        {item.fecha} · Panadero: <span className="font-medium text-stone-700">{item.maestro_panadero}</span>
                      </div>
                      {item.notas && (
                        <div className="text-[11px] text-stone-400 italic truncate mt-1">
                          "{item.notas}"
                        </div>
                      )}
                    </div>

                    <div className="text-right shrink-0">
                      <div className="font-mono font-bold text-sm text-emerald-700 tabular-nums">
                        +{item.cantidad_producida} u.
                      </div>
                      {item.merma_unidades > 0 && (
                        <div className="text-[11px] text-red-600 font-mono tabular-nums">
                          -{item.merma_unidades} merma
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* QUICK RESTOCK MODAL */}
      {restockModalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl border border-stone-200 space-y-4">
            <div>
              <h4 className="font-bold text-stone-900 text-sm font-display">
                Reabastecer Insumo
              </h4>
              <p className="text-xs text-stone-500">
                Añadir stock a: <strong className="text-stone-800">{restockModalItem.nombre}</strong>
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Cantidad a agregar ({restockModalItem.unidad_medida}):
              </label>
              <input
                type="number"
                step="any"
                min="0.1"
                value={restockAmount}
                onChange={e => setRestockAmount(e.target.value)}
                className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-sm font-mono font-bold text-stone-900 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                placeholder="10"
              />
            </div>

            <div className="flex gap-2">
              {[5, 10, 25, 50].map(val => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setRestockAmount(val.toString())}
                  className="flex-1 py-1 text-xs font-mono font-semibold bg-stone-100 hover:bg-orange-100 text-stone-800 rounded-lg transition-colors cursor-pointer"
                >
                  +{val}
                </button>
              ))}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-100">
              <button
                type="button"
                onClick={() => setRestockModalItem(null)}
                className="px-3 py-1.5 text-xs text-stone-600 hover:text-stone-900 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isRestocking}
                onClick={handleExecuteRestock}
                className="px-4 py-1.5 text-xs font-bold text-white bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                {isRestocking ? 'Guardando...' : 'Confirmar Entrada'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
