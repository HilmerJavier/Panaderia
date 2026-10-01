import React, { useState, useMemo } from 'react';
import { 
  Search, Plus, Minus, Trash2, CreditCard, Banknote, ArrowRightLeft, 
  Check, AlertCircle, ShoppingBag, Wheat, Sparkles
} from 'lucide-react';
import { Producto, CartItem, TicketVenta } from '../types';
import { api } from '../services/api';
import { formatCOP, formatNumberCOP } from '../utils/formatters';

interface POSModuleProps {
  productos: Producto[];
  onSaleComplete: (ticket: TicketVenta) => void;
  onRefreshData: () => void;
}

export const POSModule: React.FC<POSModuleProps> = ({
  productos,
  onSaleComplete,
  onRefreshData,
}) => {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Todos');
  const [paymentMethod, setPaymentMethod] = useState<'Efectivo' | 'Tarjeta' | 'Transferencia'>('Efectivo');
  const [applyTax, setApplyTax] = useState(false);
  const [cashTendered, setCashTendered] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Extract categories
  const categories = useMemo(() => {
    const cats = new Set(productos.map(p => p.categoria));
    return ['Todos', ...Array.from(cats)];
  }, [productos]);

  // Filtered products
  const filteredProducts = useMemo(() => {
    return productos.filter(p => {
      if (p.activo === 0) return false;
      const matchCat = selectedCategory === 'Todos' || p.categoria === selectedCategory;
      const matchSearch = p.nombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          p.descripcion.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [productos, selectedCategory, searchQuery]);

  // Add product to cart by clicking on card or photo
  const addToCart = (product: Producto) => {
    setCart(prev => {
      const existing = prev.find(item => item.producto.id === product.id);
      if (existing) {
        return prev.map(item =>
          item.producto.id === product.id
            ? { ...item, cantidad: item.cantidad + 1, subtotal: (item.cantidad + 1) * item.precio_unitario }
            : item
        );
      }
      return [
        ...prev,
        {
          producto: product,
          cantidad: 1,
          precio_unitario: product.precio,
          subtotal: product.precio,
        }
      ];
    });
  };

  const updateQuantity = (productId: number, delta: number) => {
    setCart(prev => {
      return prev
        .map(item => {
          if (item.producto.id === productId) {
            const newQty = item.cantidad + delta;
            if (newQty <= 0) return null;
            return {
              ...item,
              cantidad: newQty,
              subtotal: newQty * item.precio_unitario,
            };
          }
          return item;
        })
        .filter(Boolean) as CartItem[];
    });
  };

  const removeFromCart = (productId: number) => {
    setCart(prev => prev.filter(item => item.producto.id !== productId));
  };

  const clearCart = () => {
    setCart([]);
    setCashTendered('');
    setErrorMsg(null);
  };

  // Calculations in Colombian Pesos
  const subtotal = useMemo(() => {
    return cart.reduce((acc, item) => acc + item.subtotal, 0);
  }, [cart]);

  const tax = useMemo(() => {
    return applyTax ? Math.round(subtotal * 0.19) : 0; // IVA Colombia 19%
  }, [subtotal, applyTax]);

  const total = useMemo(() => {
    return Math.round(subtotal + tax);
  }, [subtotal, tax]);

  const change = useMemo(() => {
    const tendered = parseFloat(cashTendered);
    if (isNaN(tendered) || tendered < total) return 0;
    return Math.round(tendered - total);
  }, [cashTendered, total]);

  // Submit sale
  const handleCheckout = async () => {
    if (cart.length === 0) {
      setErrorMsg('Añade al menos un producto a la comanda.');
      return;
    }

    if (paymentMethod === 'Efectivo' && cashTendered) {
      const tendered = parseFloat(cashTendered);
      if (!isNaN(tendered) && tendered < total) {
        setErrorMsg(`El efectivo recibido (${formatCOP(tendered)}) es menor al total a pagar (${formatCOP(total)}).`);
        return;
      }
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const payload = {
        items: cart.map(item => ({
          producto_id: item.producto.id,
          cantidad: item.cantidad,
        })),
        metodo_pago: paymentMethod,
        aplicar_impuesto: applyTax,
        cajero: 'Caja 1 - El Socorro',
      };

      const result = await api.registrarVenta(payload);
      if (result.success) {
        clearCart();
        onSaleComplete(result.ticket);
        onRefreshData();
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al procesar la venta.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col lg:flex-row gap-6 p-4 sm:p-6 max-w-7xl mx-auto w-full">
      {/* LEFT: PRODUCTS CATALOG & POS GRID */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* Top Controls: Search and Categories */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-5">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Buscar por pan (ej. Baguette, Masa Madre, Croissant)..."
              className="w-full pl-10 pr-4 py-2 bg-white border border-stone-200 rounded-xl text-sm placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all shadow-xs"
            />
          </div>

          {/* Category Tabs (Segmented filter controls) */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition-all whitespace-nowrap cursor-pointer ${
                  selectedCategory === cat
                    ? 'bg-stone-900 text-amber-400 shadow-xs font-bold border border-amber-500/30'
                    : 'bg-white text-stone-600 border border-stone-200 hover:bg-stone-50 hover:text-stone-900'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Product Cards Grid */}
        {filteredProducts.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-12 bg-white rounded-2xl border border-dashed border-stone-300 text-center">
            <Wheat className="w-12 h-12 text-stone-300 mb-3" />
            <p className="text-stone-700 font-semibold text-base">No se encontraron panes</p>
            <p className="text-stone-400 text-xs mt-1">Prueba con otro término de búsqueda o categoría.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 overflow-y-auto pr-1">
            {filteredProducts.map(product => {
              const inCartItem = cart.find(i => i.producto.id === product.id);
              return (
                <div
                  key={product.id}
                  onClick={() => addToCart(product)}
                  className="group relative bg-white rounded-2xl border border-stone-200 hover:border-orange-400 hover:shadow-lg transition-all duration-200 shadow-xs cursor-pointer flex flex-col overflow-hidden select-none active:scale-[0.98]"
                >
                  {/* Image Container with Fallback */}
                  <div className="relative aspect-4/3 w-full bg-stone-100 overflow-hidden">
                    {product.imagen_url ? (
                      <img
                        src={product.imagen_url.startsWith('/src/assets/images/') ? product.imagen_url.replace('/src/assets/images/', '/images/') : product.imagen_url}
                        alt={product.nombre}
                        loading="lazy"
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover group-hover:scale-106 transition-transform duration-300"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          if (!target.dataset.tried) {
                            target.dataset.tried = '1';
                            if (target.src.includes('/images/')) {
                              target.src = target.src.replace('/images/', '/src/assets/images/');
                              return;
                            }
                          }
                          target.style.display = 'none';
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-amber-50 to-orange-100 text-amber-800">
                        <Wheat className="w-8 h-8 opacity-40" />
                        <span className="text-[10px] uppercase font-bold tracking-wider mt-1 opacity-60">La Estrella</span>
                      </div>
                    )}

                    {/* Stock available badge */}
                    <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-stone-900/80 backdrop-blur-xs text-white text-[11px] font-mono tabular-nums">
                      {product.stock_disponible} disp.
                    </div>

                    {/* In cart indicator badge in brand red */}
                    {inCartItem && (
                      <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-red-600 text-white font-bold text-xs flex items-center justify-center shadow-md animate-in zoom-in-50 duration-150">
                        {inCartItem.cantidad}
                      </div>
                    )}
                  </div>

                  {/* Product Details */}
                  <div className="p-3.5 flex-1 flex flex-col justify-between">
                    <div>
                      <div className="text-[10px] font-bold text-orange-600 uppercase tracking-wider mb-1">
                        {product.categoria}
                      </div>
                      <h4 className="font-semibold text-stone-900 text-sm leading-snug line-clamp-1 group-hover:text-orange-700 transition-colors">
                        {product.nombre}
                      </h4>
                      <p className="text-stone-500 text-xs line-clamp-2 mt-1 leading-relaxed">
                        {product.descripcion}
                      </p>
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-stone-100 flex items-center justify-between">
                      <div className="flex flex-col">
                        <span className="text-[10px] text-stone-400 font-sans">Precio COP</span>
                        <span className="text-base font-bold text-stone-900 font-mono tabular-nums">
                          {formatCOP(product.precio)}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          addToCart(product);
                        }}
                        className="w-8 h-8 rounded-xl bg-orange-50 text-orange-700 group-hover:bg-gradient-to-r group-hover:from-amber-400 group-hover:to-orange-500 group-hover:text-stone-950 flex items-center justify-center transition-all duration-200 shadow-2xs"
                        title="Añadir a comanda"
                      >
                        <Plus className="w-4 h-4 stroke-[2.5]" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* RIGHT: COMANDA / CART SIDEBAR */}
      <div className="w-full lg:w-96 flex flex-col bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden shrink-0">
        
        {/* Comanda Header with brand accent */}
        <div className="p-4 border-b border-stone-200 bg-stone-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-orange-500/20 text-orange-400 flex items-center justify-center border border-orange-500/30">
              <ShoppingBag className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm font-display tracking-wide text-white">Comanda de Venta</h3>
              <p className="text-[11px] text-amber-400 font-mono">
                {cart.reduce((sum, item) => sum + item.cantidad, 0)} unidades · Pesos COP
              </p>
            </div>
          </div>
          {cart.length > 0 && (
            <button
              onClick={clearCart}
              className="text-xs text-stone-400 hover:text-red-400 transition-colors flex items-center gap-1 cursor-pointer"
              title="Vaciar comanda"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Limpiar</span>
            </button>
          )}
        </div>

        {/* Cart Item List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[220px] max-h-[360px] divide-y divide-stone-100">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-stone-400">
              <ShoppingBag className="w-10 h-10 stroke-[1.5] text-stone-300 mb-2" />
              <p className="font-semibold text-stone-600 text-sm">La comanda está vacía</p>
              <p className="text-xs text-stone-400 mt-1 max-w-[200px]">
                Haz clic en la foto de cualquier pan para añadirlo a la orden.
              </p>
            </div>
          ) : (
            cart.map(item => (
              <div key={item.producto.id} className="pt-3 first:pt-0 flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <h5 className="font-semibold text-stone-800 text-xs truncate">
                    {item.producto.nombre}
                  </h5>
                  <div className="text-[11px] text-stone-500 font-mono tabular-nums">
                    {formatCOP(item.precio_unitario)} c/u
                  </div>
                </div>

                {/* Quantity Controls */}
                <div className="flex items-center gap-1.5 bg-stone-100 rounded-lg p-1">
                  <button
                    onClick={() => updateQuantity(item.producto.id, -1)}
                    className="w-6 h-6 rounded bg-white text-stone-700 hover:bg-stone-200 flex items-center justify-center transition-colors shadow-2xs cursor-pointer"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <span className="w-6 text-center text-xs font-bold font-mono tabular-nums text-stone-900">
                    {item.cantidad}
                  </span>
                  <button
                    onClick={() => updateQuantity(item.producto.id, 1)}
                    className="w-6 h-6 rounded bg-white text-stone-700 hover:bg-stone-200 flex items-center justify-center transition-colors shadow-2xs cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>

                {/* Line Total */}
                <div className="w-20 text-right font-mono font-bold text-xs text-stone-900 tabular-nums">
                  {formatCOP(item.subtotal)}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Calculation & Checkout Panel */}
        <div className="p-4 bg-stone-50 border-t border-stone-200 space-y-3">
          
          {/* Tax toggle */}
          <div className="flex items-center justify-between text-xs text-stone-600">
            <span>Incluir IVA Colombia (19%):</span>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={applyTax}
                onChange={e => setApplyTax(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-8 h-4 bg-stone-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-orange-600"></div>
            </label>
          </div>

          {/* Subtotal & Total figures in COP */}
          <div className="space-y-1 pt-1 border-t border-stone-200 text-xs font-mono">
            <div className="flex justify-between text-stone-500">
              <span>Subtotal:</span>
              <span className="tabular-nums">{formatCOP(subtotal)}</span>
            </div>
            {applyTax && (
              <div className="flex justify-between text-stone-500">
                <span>IVA (19%):</span>
                <span className="tabular-nums">{formatCOP(tax)}</span>
              </div>
            )}
            <div className="flex justify-between text-stone-900 font-bold text-lg pt-1">
              <span className="font-sans">Total a Pagar (COP):</span>
              <span className="text-red-700 tabular-nums font-mono text-xl">{formatCOP(total)}</span>
            </div>
          </div>

          {/* Payment Method Selector */}
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-stone-500 mb-1.5">
              Forma de Pago
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              <button
                type="button"
                onClick={() => setPaymentMethod('Efectivo')}
                className={`flex flex-col items-center justify-center p-2 rounded-xl text-xs font-medium border transition-colors cursor-pointer ${
                  paymentMethod === 'Efectivo'
                    ? 'bg-orange-500/10 border-orange-500 text-orange-950 font-bold'
                    : 'bg-white border-stone-200 text-stone-600 hover:bg-stone-100'
                }`}
              >
                <Banknote className="w-4 h-4 mb-1 text-orange-600" />
                <span>Efectivo</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('Tarjeta')}
                className={`flex flex-col items-center justify-center p-2 rounded-xl text-xs font-medium border transition-colors cursor-pointer ${
                  paymentMethod === 'Tarjeta'
                    ? 'bg-orange-500/10 border-orange-500 text-orange-950 font-bold'
                    : 'bg-white border-stone-200 text-stone-600 hover:bg-stone-100'
                }`}
              >
                <CreditCard className="w-4 h-4 mb-1 text-orange-600" />
                <span>Tarjeta</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('Transferencia')}
                className={`flex flex-col items-center justify-center p-2 rounded-xl text-xs font-medium border transition-colors cursor-pointer ${
                  paymentMethod === 'Transferencia'
                    ? 'bg-orange-500/10 border-orange-500 text-orange-950 font-bold'
                    : 'bg-white border-stone-200 text-stone-600 hover:bg-stone-100'
                }`}
              >
                <ArrowRightLeft className="w-4 h-4 mb-1 text-orange-600" />
                <span>Transf. / Nequi</span>
              </button>
            </div>
          </div>

          {/* Colombian Cash Tendered Calculator (Efectivo COP) */}
          {paymentMethod === 'Efectivo' && (
            <div className="p-2.5 bg-white rounded-xl border border-stone-200 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-stone-600 font-medium">Efectivo Recibido (COP):</span>
                <div className="flex items-center gap-1 font-mono">
                  <span>$</span>
                  <input
                    type="number"
                    step="500"
                    value={cashTendered}
                    onChange={e => setCashTendered(e.target.value)}
                    placeholder="0"
                    className="w-28 px-2 py-0.5 text-right font-bold text-stone-900 bg-stone-100 rounded border border-stone-300 focus:outline-none focus:ring-1 focus:ring-orange-500"
                  />
                </div>
              </div>

              {/* Colombian Banknote preset buttons */}
              <div className="flex flex-wrap gap-1 justify-end">
                {[2000, 5000, 10000, 20000, 50000, 100000].map(bill => (
                  <button
                    key={bill}
                    type="button"
                    onClick={() => setCashTendered(bill.toString())}
                    className="px-1.5 py-0.5 text-[10px] font-mono font-semibold bg-stone-100 hover:bg-orange-100 text-stone-700 rounded transition-colors cursor-pointer"
                  >
                    ${formatNumberCOP(bill)}
                  </button>
                ))}
              </div>

              {cashTendered && !isNaN(parseFloat(cashTendered)) && (
                <div className="flex items-center justify-between text-xs pt-1 border-t border-stone-100 font-mono">
                  <span className="text-stone-600 font-sans">Cambio / Vueltas:</span>
                  <span className={`font-bold tabular-nums ${change >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                    {formatCOP(change)}
                  </span>
                </div>
              )}
            </div>
          )}

          {errorMsg && (
            <div className="p-2 bg-red-50 border border-red-200 rounded-lg text-red-700 text-xs flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Checkout Button */}
          <button
            type="button"
            disabled={cart.length === 0 || isSubmitting}
            onClick={handleCheckout}
            className={`w-full py-3.5 px-4 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all duration-150 shadow-sm cursor-pointer ${
              cart.length === 0 || isSubmitting
                ? 'bg-stone-200 text-stone-400 cursor-not-allowed'
                : 'bg-gradient-to-r from-red-600 via-orange-600 to-amber-500 hover:from-red-500 hover:to-amber-400 active:scale-[0.99] text-white shadow-md hover:shadow-lg'
            }`}
          >
            {isSubmitting ? (
              <span>Registrando y descontando insumos...</span>
            ) : (
              <>
                <Check className="w-4 h-4 stroke-[3]" />
                <span>Cobrar / Registrar Venta ({formatCOP(total)})</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
