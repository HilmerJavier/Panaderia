import React from 'react';
import { Printer, CheckCircle2, X, Wheat } from 'lucide-react';
import { TicketVenta } from '../types';
import { formatCOP } from '../utils/formatters';

interface ReceiptModalProps {
  ticket: TicketVenta | null;
  onClose: () => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({ ticket, onClose }) => {
  if (!ticket) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-stone-200 overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Top notification bar in brand red/orange */}
        <div className="bg-gradient-to-r from-red-600 via-orange-600 to-amber-600 px-6 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-amber-200" />
            <div>
              <h3 className="font-bold text-sm">¡Venta Registrada Exitosamente!</h3>
              <p className="text-xs text-amber-100">Insumos descontados de almacén en tiempo real</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-amber-100 hover:text-white p-1 rounded-lg hover:bg-black/20 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Printable Receipt Body */}
        <div className="overflow-y-auto p-6 space-y-4 text-stone-800 bg-white" id="printable-receipt">
          {/* Header with Logo */}
          <div className="text-center border-b border-stone-200 pb-3 flex flex-col items-center">
            <img
              src="/src/assets/images/logo_estrella.png"
              onError={(e) => {
                (e.target as HTMLImageElement).src = 'https://www.kroman360.com/imagenes/logoestrella.png';
              }}
              alt="La Estrella del Socorro"
              className="h-14 w-auto object-contain mb-1"
            />
            <p className="text-xs font-semibold text-stone-700 uppercase tracking-widest">
              Panadería Tradicional & Repostería
            </p>
            <p className="text-[11px] text-stone-500 font-mono mt-0.5">El Socorro, Colombia · NIT: 900.584.219-4</p>
            <p className="text-xs text-stone-600 font-mono font-semibold mt-1">
              Ticket: {ticket.codigo_ticket}
            </p>
            <div className="flex justify-center items-center gap-2 text-[11px] text-stone-500 mt-0.5">
              <span>{ticket.fecha}</span>
              <span>·</span>
              <span>{ticket.cajero}</span>
            </div>
          </div>

          {/* Items breakdown */}
          <div className="space-y-2 text-sm border-b border-stone-200 pb-3">
            <div className="text-xs font-semibold text-stone-400 grid grid-cols-12 uppercase tracking-wider pb-1">
              <span className="col-span-6">Producto</span>
              <span className="col-span-2 text-center">Cant</span>
              <span className="col-span-4 text-right">Subtotal</span>
            </div>
            {ticket.items.map((it, idx) => (
              <div key={idx} className="grid grid-cols-12 text-stone-800 items-baseline text-xs sm:text-sm">
                <span className="col-span-6 font-medium truncate">{it.nombre}</span>
                <span className="col-span-2 text-center font-mono tabular-nums text-stone-600">x{it.cantidad}</span>
                <span className="col-span-4 text-right font-mono tabular-nums font-semibold">{formatCOP(it.subtotal)}</span>
              </div>
            ))}
          </div>

          {/* Totals in Colombian Pesos */}
          <div className="space-y-1.5 text-sm border-b border-stone-200 pb-3 font-mono">
            <div className="flex justify-between text-stone-600 text-xs">
              <span>Subtotal:</span>
              <span className="tabular-nums">{formatCOP(ticket.subtotal)}</span>
            </div>
            {ticket.impuesto > 0 && (
              <div className="flex justify-between text-stone-600 text-xs">
                <span>IVA (19%):</span>
                <span className="tabular-nums">{formatCOP(ticket.impuesto)}</span>
              </div>
            )}
            <div className="flex justify-between text-stone-900 font-bold text-base pt-1">
              <span className="font-sans">Total a Pagar (COP):</span>
              <span className="text-red-700 text-lg tabular-nums">{formatCOP(ticket.total)}</span>
            </div>
            <div className="flex justify-between text-stone-500 text-xs">
              <span>Forma de Pago:</span>
              <span className="font-sans font-medium text-stone-800">{ticket.metodo_pago}</span>
            </div>
          </div>

          {/* Automatic Inventory Deductions Breakdown */}
          {ticket.insumos_descontados && ticket.insumos_descontados.length > 0 && (
            <div className="bg-amber-50/60 rounded-xl p-3 border border-amber-200 text-xs space-y-1.5">
              <div className="flex items-center gap-1.5 font-bold text-amber-900 text-xs">
                <Wheat className="w-3.5 h-3.5 text-amber-700" />
                <span>Descuento Automático de Insumos (Obrador):</span>
              </div>
              <p className="text-[11px] text-amber-800/80 leading-tight">
                Materia prima descontada del inventario según receta:
              </p>
              <div className="space-y-1 pt-1">
                {ticket.insumos_descontados.map((ins, i) => (
                  <div key={i} className="flex justify-between items-center text-[11px] font-mono">
                    <span className="text-stone-700 font-sans">{ins.insumo}:</span>
                    <span className="text-red-700 font-semibold tabular-nums">
                      -{ins.descontado} {ins.unidad}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="text-center text-[11px] text-stone-400 pt-2">
            <p className="font-semibold text-stone-600">¡Gracias por su compra en La Estrella del Socorro!</p>
            <p className="mt-0.5">El auténtico sabor del pan recién horneado</p>
          </div>
        </div>

        {/* Modal actions */}
        <div className="p-4 bg-stone-50 border-t border-stone-200 flex items-center justify-end gap-3">
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-stone-700 bg-white border border-stone-300 rounded-xl hover:bg-stone-100 transition-colors shadow-xs cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Imprimir Ticket</span>
          </button>
          <button
            onClick={onClose}
            className="px-5 py-2 text-xs font-bold text-white bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 rounded-xl transition-all shadow-xs cursor-pointer"
          >
            Siguiente Venta
          </button>
        </div>
      </div>
    </div>
  );
};
