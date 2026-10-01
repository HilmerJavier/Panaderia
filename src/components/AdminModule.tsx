import React, { useState } from 'react';
import { 
  Settings2, Plus, Edit2, Trash2, Wheat, DollarSign, 
  Layers, CheckCircle2, AlertCircle, Save, Sparkles, Image as ImageIcon,
  Tag, Check, X, Upload, Camera, Zap
} from 'lucide-react';
import { Producto, Insumo, RecetaItem } from '../types';
import { api } from '../services/api';
import { formatCOP } from '../utils/formatters';
import { compressImageFile, optimizeExternalImageUrl, formatBytes, CompressionResult } from '../utils/imageOptimizer';

interface AdminModuleProps {
  productos: Producto[];
  insumos: Insumo[];
  onRefreshAll: () => void;
}

// Preset images from La Estrella del Socorro catalog
const PRESET_IMAGES = [
  { name: 'Baguette Tradicional', url: '/images/pan_estrella_1.jpg' },
  { name: 'Masa Madre Campesina', url: '/images/pan_estrella_2.jpg' },
  { name: 'Croissant Mantequilla', url: '/images/pan_estrella_3.jpg' },
  { name: 'Ciabatta Rústica', url: '/images/pan_estrella_4.jpg' },
  { name: 'Pan Brioche / Blandito', url: '/images/pan_estrella_5.jpg' },
  { name: 'Pan Especial La Estrella', url: '/images/pan_estrella_6.jpg' },
];

export const AdminModule: React.FC<AdminModuleProps> = ({
  productos,
  insumos,
  onRefreshAll,
}) => {
  const [activeTab, setActiveTab] = useState<'recetas' | 'productos' | 'insumos' | 'categorias'>('recetas');
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // CATEGORIES STATE
  const [categoriasList, setCategoriasList] = useState<string[]>(() => {
    const base = api.getCategorias();
    const fromProds = productos.map(p => p.categoria).filter(Boolean);
    return Array.from(new Set([...base, ...fromProds]));
  });
  const [newCatInput, setNewCatInput] = useState('');
  const [editingCat, setEditingCat] = useState<{ original: string; current: string } | null>(null);
  const [inlineNewCategory, setInlineNewCategory] = useState(false);

  // Sincronizar categorías al actualizar productos
  React.useEffect(() => {
    const base = api.getCategorias();
    const fromProds = productos.map(p => p.categoria).filter(Boolean);
    setCategoriasList(Array.from(new Set([...base, ...fromProds])));
  }, [productos]);

  // RECIPES TAB STATE
  const [selectedProductId, setSelectedProductId] = useState<number>(productos[0]?.id || 1);
  const currentProduct = productos.find(p => p.id === selectedProductId) || productos[0];
  
  // Working recipe lines for current product
  const [recipeLines, setRecipeLines] = useState<Array<{ insumo_id: number; cantidad: number }>>([]);
  const [isEditingRecipe, setIsEditingRecipe] = useState(false);

  // Sync recipe lines when product selection changes
  React.useEffect(() => {
    if (currentProduct?.receta) {
      setRecipeLines(currentProduct.receta.map(r => ({ insumo_id: r.insumo_id, cantidad: r.cantidad })));
    } else {
      setRecipeLines([]);
    }
    setIsEditingRecipe(false);
  }, [selectedProductId, currentProduct]);

  // PRODUCT CRUD STATE
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Producto | null>(null);
  const [isOptimizingImage, setIsOptimizingImage] = useState(false);
  const [compressionStats, setCompressionStats] = useState<CompressionResult | null>(null);
  const [prodForm, setProdForm] = useState({
    nombre: '',
    descripcion: '',
    precio: '',
    categoria: 'Pan Rústico',
    imagen_url: PRESET_IMAGES[0].url,
    stock_disponible: '25',
    activo: 1,
  });

  // INSUMO CRUD STATE
  const [showInsumoModal, setShowInsumoModal] = useState(false);
  const [editingInsumo, setEditingInsumo] = useState<Insumo | null>(null);
  const [insumoForm, setInsumoForm] = useState({
    nombre: '',
    unidad_medida: 'kg',
    costo_unitario: '',
    stock_actual: '',
    stock_minimo: '5',
  });

  // Calculate live recipe unit cost in COP
  const calculatedUnitCost = recipeLines.reduce((acc, line) => {
    const ins = insumos.find(i => i.id === line.insumo_id);
    return acc + (ins ? ins.costo_unitario * line.cantidad : 0);
  }, 0);

  const profitPerUnit = currentProduct ? currentProduct.precio - calculatedUnitCost : 0;
  const marginPercentage = currentProduct && currentProduct.precio > 0 
    ? ((profitPerUnit / currentProduct.precio) * 100).toFixed(1) 
    : '0';

  // Save Recipe handler
  const handleSaveRecipe = async () => {
    if (!currentProduct) return;
    try {
      await api.updateProducto(currentProduct.id, {
        nombre: currentProduct.nombre,
        descripcion: currentProduct.descripcion,
        precio: currentProduct.precio,
        categoria: currentProduct.categoria,
        imagen_url: currentProduct.imagen_url,
        stock_disponible: currentProduct.stock_disponible,
        activo: currentProduct.activo !== undefined ? currentProduct.activo : 1,
        ingredientes: recipeLines.filter(l => l.cantidad > 0),
      });

      setNotification({
        type: 'success',
        message: `¡Receta para "${currentProduct.nombre}" guardada permanentemente en la base de datos!`,
      });
      setIsEditingRecipe(false);
      onRefreshAll();
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message || 'Error al guardar receta' });
    }
  };

  // Add line to recipe
  const addRecipeLine = () => {
    const unusedInsumo = insumos.find(i => !recipeLines.some(l => l.insumo_id === i.id)) || insumos[0];
    if (unusedInsumo) {
      setRecipeLines([...recipeLines, { insumo_id: unusedInsumo.id, cantidad: 0.1 }]);
      setIsEditingRecipe(true);
    }
  };

  const removeRecipeLine = (index: number) => {
    setRecipeLines(recipeLines.filter((_, i) => i !== index));
    setIsEditingRecipe(true);
  };

  const updateRecipeLine = (index: number, field: 'insumo_id' | 'cantidad', value: number) => {
    const updated = [...recipeLines];
    updated[index] = { ...updated[index], [field]: value };
    setRecipeLines(updated);
    setIsEditingRecipe(true);
  };

  // Category Handlers
  const handleAddCategory = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const clean = newCatInput.trim();
    if (!clean) return;
    if (categoriasList.some(c => c.toLowerCase() === clean.toLowerCase())) {
      setNotification({ type: 'error', message: `La categoría "${clean}" ya existe.` });
      return;
    }
    const updated = await api.addCategoria(clean);
    setCategoriasList(updated);
    setNewCatInput('');
    setNotification({ type: 'success', message: `Categoría "${clean}" agregada con éxito.` });
  };

  const handleStartRenameCategory = (cat: string) => {
    setEditingCat({ original: cat, current: cat });
  };

  const handleSaveRenameCategory = async () => {
    if (!editingCat) return;
    const clean = editingCat.current.trim();
    if (!clean || clean === editingCat.original) {
      setEditingCat(null);
      return;
    }
    await api.renameCategoria(editingCat.original, clean);
    setEditingCat(null);
    onRefreshAll();
    setNotification({
      type: 'success',
      message: `Categoría renombrada a "${clean}" y actualizada en todos sus panes en la nube.`,
    });
  };

  const handleDeleteCategory = async (cat: string) => {
    const panesEnCat = productos.filter(p => p.categoria === cat);
    if (panesEnCat.length > 0) {
      const confirm = window.confirm(
        `La categoría "${cat}" tiene ${panesEnCat.length} pan(es) asignado(s):\n${panesEnCat.map(p => '• ' + p.nombre).join('\n')}\n\n¿Deseas reasignarlos a "Pan Rústico" y eliminar esta categoría?`
      );
      if (!confirm) return;
    } else {
      const confirm = window.confirm(`¿Seguro que deseas eliminar la categoría "${cat}"?`);
      if (!confirm) return;
    }

    await api.deleteCategoria(cat, 'Pan Rústico');
    onRefreshAll();
    setNotification({
      type: 'success',
      message: `Categoría "${cat}" eliminada con éxito.`,
    });
  };

  // Product CRUD
  const handleImageFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsOptimizingImage(true);
      const result = await compressImageFile(file, 640, 640, 0.82);
      setProdForm(prev => ({ ...prev, imagen_url: result.dataUrl }));
      setCompressionStats(result);
      setNotification({
        type: 'success',
        message: `Foto optimizada automáticamente: ${formatBytes(result.originalSize)} ➔ ${formatBytes(result.compressedSize)} (-${result.savedPercentage}% peso).`,
      });
    } catch (err: any) {
      setNotification({
        type: 'error',
        message: err.message || 'Error al procesar la foto.',
      });
    } finally {
      setIsOptimizingImage(false);
      e.target.value = '';
    }
  };

  const openNewProductModal = () => {
    setEditingProduct(null);
    setInlineNewCategory(false);
    setCompressionStats(null);
    setProdForm({
      nombre: '',
      descripcion: '',
      precio: '3500',
      categoria: categoriasList[0] || 'Pan Rústico',
      imagen_url: PRESET_IMAGES[0].url,
      stock_disponible: '25',
      activo: 1,
    });
    setShowProductModal(true);
  };

  const openEditProductModal = (prod: Producto) => {
    setEditingProduct(prod);
    setInlineNewCategory(false);
    setCompressionStats(null);
    setProdForm({
      nombre: prod.nombre,
      descripcion: prod.descripcion || '',
      precio: prod.precio.toString(),
      categoria: prod.categoria || categoriasList[0] || 'Pan Rústico',
      imagen_url: prod.imagen_url || PRESET_IMAGES[0].url,
      stock_disponible: prod.stock_disponible.toString(),
      activo: prod.activo !== undefined ? prod.activo : 1,
    });
    setShowProductModal(true);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const price = parseFloat(prodForm.precio);
      const stock = parseInt(prodForm.stock_disponible, 10) || 0;
      const catToSave = prodForm.categoria.trim() || 'Pan Rústico';
      const finalImageUrl = optimizeExternalImageUrl(prodForm.imagen_url);
      await api.addCategoria(catToSave);

      if (editingProduct) {
        await api.updateProducto(editingProduct.id, {
          nombre: prodForm.nombre,
          descripcion: prodForm.descripcion,
          precio: price,
          categoria: catToSave,
          imagen_url: finalImageUrl,
          stock_disponible: stock,
          activo: prodForm.activo,
        });
        setNotification({ type: 'success', message: 'Producto actualizado permanentemente en el catálogo.' });
      } else {
        await api.createProducto({
          nombre: prodForm.nombre,
          descripcion: prodForm.descripcion,
          precio: price,
          categoria: catToSave,
          imagen_url: finalImageUrl,
          stock_disponible: stock,
          activo: prodForm.activo,
        });
        setNotification({ type: 'success', message: 'Nuevo producto creado permanentemente en el catálogo.' });
      }

      setShowProductModal(false);
      setInlineNewCategory(false);
      setCompressionStats(null);
      onRefreshAll();
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message || 'Error al guardar producto' });
    }
  };

  const handleDeleteProduct = async (prod: Producto) => {
    if (!window.confirm(`¿Estás seguro de que deseas eliminar permanentemente el producto "${prod.nombre}" del catálogo?`)) {
      return;
    }
    try {
      await api.deleteProducto(prod.id, true);
      setNotification({ type: 'success', message: `"${prod.nombre}" eliminado exitosamente de la base de datos.` });
      setShowProductModal(false);
      onRefreshAll();
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message || 'Error al eliminar producto' });
    }
  };

  const handleToggleProductAvailability = async (prod: Producto) => {
    try {
      const newStatus = prod.activo === 0 ? 1 : 0;
      await api.updateProducto(prod.id, { activo: newStatus });
      setNotification({
        type: 'success',
        message: `Estado de "${prod.nombre}" actualizado a: ${newStatus === 1 ? 'Disponible para venta' : 'Pausado/Inactivo'}.`,
      });
      onRefreshAll();
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message || 'Error al cambiar disponibilidad' });
    }
  };

  // Insumo CRUD
  const openNewInsumoModal = () => {
    setEditingInsumo(null);
    setInsumoForm({
      nombre: '',
      unidad_medida: 'kg',
      costo_unitario: '4500',
      stock_actual: '50',
      stock_minimo: '10',
    });
    setShowInsumoModal(true);
  };

  const openEditInsumoModal = (ins: Insumo) => {
    setEditingInsumo(ins);
    setInsumoForm({
      nombre: ins.nombre,
      unidad_medida: ins.unidad_medida,
      costo_unitario: ins.costo_unitario.toString(),
      stock_actual: ins.stock_actual.toString(),
      stock_minimo: ins.stock_minimo.toString(),
    });
    setShowInsumoModal(true);
  };

  const handleSaveInsumo = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const cost = parseFloat(insumoForm.costo_unitario);
      const stock = parseFloat(insumoForm.stock_actual) || 0;
      const min = parseFloat(insumoForm.stock_minimo) || 5;

      if (editingInsumo) {
        await api.updateInsumo(editingInsumo.id, {
          nombre: insumoForm.nombre,
          unidad_medida: insumoForm.unidad_medida,
          costo_unitario: cost,
          stock_actual: stock,
          stock_minimo: min,
        });
        setNotification({ type: 'success', message: 'Insumo actualizado con éxito.' });
      } else {
        await api.createInsumo({
          nombre: insumoForm.nombre,
          unidad_medida: insumoForm.unidad_medida,
          costo_unitario: cost,
          stock_actual: stock,
          stock_minimo: min,
        });
        setNotification({ type: 'success', message: 'Insumo registrado con éxito.' });
      }

      setShowInsumoModal(false);
      onRefreshAll();
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message || 'Error al guardar insumo' });
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 w-full space-y-6">
      
      {/* Top Banner and Navigation Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-stone-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-orange-600 uppercase tracking-wider">
            <Settings2 className="w-4 h-4 text-orange-600" />
            <span>Configuración & Escandallos · La Estrella del Socorro</span>
          </div>
          <h2 className="text-xl font-bold text-stone-900 font-display mt-0.5">
            Recetas, Catálogo de Panes e Insumos (COP)
          </h2>
          <p className="text-xs text-stone-500 mt-1">
            Fórmulas de panadería para el descuento automático de inventario y costo unitario en pesos colombianos.
          </p>
        </div>

        {/* Tab switch */}
        <div className="flex items-center gap-1 p-1 bg-stone-100 rounded-xl">
          <button
            onClick={() => setActiveTab('recetas')}
            className={`px-3 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              activeTab === 'recetas'
                ? 'bg-stone-900 text-amber-400 shadow-xs font-bold'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            Escandallo / Recetas
          </button>
          <button
            onClick={() => setActiveTab('productos')}
            className={`px-3 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              activeTab === 'productos'
                ? 'bg-stone-900 text-amber-400 shadow-xs font-bold'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            Catálogo Panes
          </button>
          <button
            onClick={() => setActiveTab('insumos')}
            className={`px-3 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              activeTab === 'insumos'
                ? 'bg-stone-900 text-amber-400 shadow-xs font-bold'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            Gestión Insumos
          </button>
          <button
            onClick={() => setActiveTab('categorias')}
            className={`px-3 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              activeTab === 'categorias'
                ? 'bg-stone-900 text-amber-400 shadow-xs font-bold'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            Categorías
          </button>
        </div>
      </div>

      {notification && (
        <div
          className={`p-3.5 rounded-xl border text-xs flex items-center justify-between gap-2 ${
            notification.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-red-50 border-red-200 text-red-800'
          }`}
        >
          <div className="flex items-center gap-2">
            {notification.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            )}
            <span>{notification.message}</span>
          </div>
          <button
            onClick={() => setNotification(null)}
            className="text-stone-400 hover:text-stone-700 text-xs underline cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      )}

      {/* TAB 1: RECIPES & ESCANDALLO BUILDER */}
      {activeTab === 'recetas' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Left: Product Selector List */}
          <div className="lg:col-span-4 bg-white p-4 rounded-2xl border border-stone-200 shadow-xs">
            <h3 className="font-bold text-sm text-stone-900 font-display mb-3 pb-2 border-b border-stone-100">
              Seleccionar Pan
            </h3>
            <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
              {productos.map(p => {
                const isSelected = p.id === currentProduct?.id;
                return (
                  <div
                    key={p.id}
                    onClick={() => setSelectedProductId(p.id)}
                    className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center gap-3 ${
                      isSelected
                        ? 'bg-orange-500/10 border-orange-500 text-stone-950 shadow-xs'
                        : 'border-stone-200 hover:bg-stone-50 text-stone-700'
                    }`}
                  >
                    <div className="w-12 h-12 rounded-lg bg-stone-100 overflow-hidden shrink-0 border border-stone-200">
                      {p.imagen_url && (
                        <img src={p.imagen_url} alt={p.nombre} className="w-full h-full object-cover" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-xs truncate">{p.nombre}</div>
                      <div className="text-[11px] text-stone-500 font-mono">
                        Precio: {formatCOP(p.precio)} · {p.categoria}
                      </div>
                      <div className="text-[10px] text-orange-700 font-medium mt-0.5">
                        {p.receta?.length || 0} insumos vinculados
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right: Recipe Editor & Cost Breakdown */}
          <div className="lg:col-span-8 bg-white p-6 rounded-2xl border border-stone-200 shadow-xs space-y-6">
            {currentProduct ? (
              <>
                {/* Header with Product & Escandallo Metrics */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-stone-200">
                  <div>
                    <span className="text-[11px] font-bold text-orange-600 uppercase tracking-wider">
                      Escandallo Técnico (COP)
                    </span>
                    <h3 className="text-lg font-bold text-stone-900 font-display">
                      Receta: {currentProduct.nombre}
                    </h3>
                    <p className="text-xs text-stone-500">
                      Insumos que se descuentan automáticamente del almacén por cada unidad vendida.
                    </p>
                  </div>

                  {/* Financial metrics comparison badge in COP */}
                  <div className="flex items-center gap-3 p-2.5 bg-stone-50 rounded-xl border border-stone-200 font-mono text-xs">
                    <div>
                      <span className="text-[10px] text-stone-400 block font-sans">Costo Insumos</span>
                      <strong className="text-red-700 tabular-nums">{formatCOP(calculatedUnitCost)}</strong>
                    </div>
                    <div className="h-6 w-px bg-stone-200"></div>
                    <div>
                      <span className="text-[10px] text-stone-400 block font-sans">Precio Venta</span>
                      <strong className="text-stone-900 tabular-nums">{formatCOP(currentProduct.precio)}</strong>
                    </div>
                    <div className="h-6 w-px bg-stone-200"></div>
                    <div>
                      <span className="text-[10px] text-stone-400 block font-sans">Margen Bruto</span>
                      <strong className="text-emerald-700 tabular-nums">{marginPercentage}%</strong>
                    </div>
                  </div>
                </div>

                {/* Recipe Ingredient Rows */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold text-xs text-stone-700 uppercase tracking-wider">
                      Ingredientes de la Receta (Por 1 Pan)
                    </h4>
                    <button
                      type="button"
                      onClick={addRecipeLine}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-lg transition-colors cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Añadir Insumo</span>
                    </button>
                  </div>

                  {recipeLines.length === 0 ? (
                    <div className="p-8 text-center bg-stone-50 rounded-xl border border-dashed border-stone-200 text-stone-400 text-xs">
                      Este producto no tiene insumos vinculados. Añade uno con el botón superior.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {recipeLines.map((line, idx) => {
                        const insumo = insumos.find(i => i.id === line.insumo_id);
                        const subtotalCosto = insumo ? insumo.costo_unitario * line.cantidad : 0;

                        return (
                          <div
                            key={idx}
                            className="p-3 bg-stone-50 rounded-xl border border-stone-200 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 text-xs"
                          >
                            {/* Insumo Selector */}
                            <div className="flex-1 min-w-0">
                              <label className="block text-[10px] text-stone-500 font-semibold mb-0.5">
                                Insumo / Materia Prima
                              </label>
                              <select
                                value={line.insumo_id}
                                onChange={e => updateRecipeLine(idx, 'insumo_id', Number(e.target.value))}
                                className="w-full px-2.5 py-1.5 bg-white border border-stone-300 rounded-lg text-xs text-stone-900 focus:outline-none"
                              >
                                {insumos.map(ins => (
                                  <option key={ins.id} value={ins.id}>
                                    {ins.nombre} ({formatCOP(ins.costo_unitario)} por {ins.unidad_medida})
                                  </option>
                                ))}
                              </select>
                            </div>

                            {/* Quantity */}
                            <div className="w-32">
                              <label className="block text-[10px] text-stone-500 font-semibold mb-0.5">
                                Cantidad ({insumo?.unidad_medida})
                              </label>
                              <input
                                type="number"
                                step="any"
                                min="0.001"
                                value={line.cantidad}
                                onChange={e => updateRecipeLine(idx, 'cantidad', parseFloat(e.target.value) || 0)}
                                className="w-full px-2.5 py-1.5 bg-white border border-stone-300 rounded-lg text-xs font-mono font-bold text-stone-900 focus:outline-none"
                              />
                            </div>

                            {/* Line Cost */}
                            <div className="w-28 text-right">
                              <label className="block text-[10px] text-stone-400 font-sans">
                                Subtotal
                              </label>
                              <div className="font-mono font-bold text-stone-900 pt-1">
                                {formatCOP(subtotalCosto)}
                              </div>
                            </div>

                            {/* Remove button */}
                            <button
                              type="button"
                              onClick={() => removeRecipeLine(idx)}
                              className="p-1.5 text-stone-400 hover:text-red-600 rounded-lg transition-colors self-end sm:self-center cursor-pointer"
                              title="Eliminar de la receta"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Save button */}
                <div className="pt-4 border-t border-stone-200 flex justify-end">
                  <button
                    type="button"
                    onClick={handleSaveRecipe}
                    className="px-5 py-2.5 bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-2 cursor-pointer"
                  >
                    <Save className="w-4 h-4" />
                    <span>Guardar Receta</span>
                  </button>
                </div>
              </>
            ) : (
              <div className="text-center p-12 text-stone-400 text-sm">
                Selecciona un producto para configurar su receta.
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: PRODUCT CRUD */}
      {activeTab === 'productos' && (
        <div className="bg-white rounded-2xl border border-stone-200 shadow-xs p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-stone-100">
            <div>
              <h3 className="font-bold text-base text-stone-900 font-display">
                Catálogo de Panes y Pastelería
              </h3>
              <p className="text-xs text-stone-500">
                Registra nuevos tipos de panes con precios en pesos colombianos y fotografías.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setActiveTab('categorias')}
                className="flex items-center gap-1.5 px-3 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
              >
                <Tag className="w-3.5 h-3.5 text-amber-700" />
                <span>Gestionar Categorías</span>
              </button>
              <button
                onClick={openNewProductModal}
                className="flex items-center gap-1.5 px-4 py-2 bg-stone-900 text-white rounded-xl text-xs font-semibold hover:bg-stone-800 transition-colors shadow-xs cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Nuevo Producto</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {productos.map(p => (
              <div
                key={p.id}
                className="bg-stone-50/70 border border-stone-200 rounded-xl p-4 flex flex-col justify-between"
              >
                <div className="flex gap-3">
                  <div className="w-16 h-16 rounded-lg bg-stone-200 overflow-hidden shrink-0 border border-stone-300">
                    {p.imagen_url && (
                      <img
                        src={p.imagen_url.startsWith('/src/assets/images/') ? p.imagen_url.replace('/src/assets/images/', '/images/') : p.imagen_url}
                        alt={p.nombre}
                        className="w-full h-full object-cover"
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
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-[10px] uppercase font-bold text-orange-600 tracking-wider">
                      {p.categoria}
                    </span>
                    <h4 className="font-semibold text-stone-900 text-xs truncate">{p.nombre}</h4>
                    <p className="text-[11px] text-stone-500 line-clamp-2 mt-0.5">{p.descripcion}</p>
                  </div>
                </div>

                <div className="mt-3 pt-2.5 border-t border-stone-200 flex items-center justify-between text-xs">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-bold font-mono text-stone-900 text-sm">{formatCOP(p.precio)}</span>
                      <span className="text-stone-400 font-mono text-[11px]">({p.stock_disponible} disp.)</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleToggleProductAvailability(p)}
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold cursor-pointer transition-colors ${
                        p.activo === 0
                          ? 'bg-stone-200 text-stone-600 hover:bg-stone-300'
                          : 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                      }`}
                      title="Clic para alternar disponibilidad en POS"
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${p.activo === 0 ? 'bg-stone-400' : 'bg-emerald-500'}`}></span>
                      <span>{p.activo === 0 ? 'Pausado / Inactivo' : 'Disponible en Caja'}</span>
                    </button>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => openEditProductModal(p)}
                      className="p-1.5 text-stone-600 hover:text-stone-950 bg-white border border-stone-200 hover:border-stone-400 rounded-lg transition-colors cursor-pointer"
                      title="Editar producto"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteProduct(p)}
                      className="p-1.5 text-red-600 hover:text-red-800 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg transition-colors cursor-pointer"
                      title="Eliminar producto permanentemente"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: INSUMOS CRUD */}
      {activeTab === 'insumos' && (
        <div className="bg-white rounded-2xl border border-stone-200 shadow-xs p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-stone-100">
            <div>
              <h3 className="font-bold text-base text-stone-900 font-display">
                Catálogo de Materia Prima (Insumos en COP)
              </h3>
              <p className="text-xs text-stone-500">
                Administra los ingredientes del obrador, costo por kg/L en pesos colombianos y stocks de alerta.
              </p>
            </div>
            <button
              onClick={openNewInsumoModal}
              className="flex items-center gap-1.5 px-4 py-2 bg-stone-900 text-white rounded-xl text-xs font-semibold hover:bg-stone-800 transition-colors shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Nuevo Insumo</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-stone-50 border-b border-stone-200 text-stone-600 font-semibold uppercase tracking-wider">
                  <th className="py-3 px-4">Insumo</th>
                  <th className="py-3 px-3">Unidad Medida</th>
                  <th className="py-3 px-3 text-right">Costo Unitario (COP)</th>
                  <th className="py-3 px-3 text-right">Stock Actual</th>
                  <th className="py-3 px-3 text-right">Stock Mínimo</th>
                  <th className="py-3 px-4 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {insumos.map(ins => (
                  <tr key={ins.id} className="hover:bg-stone-50 transition-colors">
                    <td className="py-3 px-4 font-semibold text-stone-900">{ins.nombre}</td>
                    <td className="py-3 px-3 font-mono text-stone-600">{ins.unidad_medida}</td>
                    <td className="py-3 px-3 text-right font-mono tabular-nums font-bold text-stone-900">
                      {formatCOP(ins.costo_unitario)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono tabular-nums text-stone-700">
                      {ins.stock_actual} {ins.unidad_medida}
                    </td>
                    <td className="py-3 px-3 text-right font-mono tabular-nums text-stone-500">
                      {ins.stock_minimo} {ins.unidad_medida}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => openEditInsumoModal(ins)}
                        className="p-1 text-stone-600 hover:text-stone-950 bg-stone-100 hover:bg-stone-200 rounded-md transition-colors cursor-pointer"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: GESTIÓN DE CATEGORÍAS */}
      {activeTab === 'categorias' && (
        <div className="bg-white rounded-2xl border border-stone-200 shadow-xs p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-stone-100">
            <div>
              <div className="flex items-center gap-2">
                <Tag className="w-5 h-5 text-amber-600" />
                <h3 className="font-bold text-base text-stone-900 font-display">
                  Categorías del Catálogo ({categoriasList.length})
                </h3>
              </div>
              <p className="text-xs text-stone-500 mt-1">
                Adiciona nuevas secciones, renombra o elimina categorías. Los cambios se actualizan en tiempo real en la nube y en las pestañas del Punto de Venta (POS).
              </p>
            </div>

            {/* Quick Add Category Form */}
            <form onSubmit={handleAddCategory} className="flex items-center gap-2">
              <input
                type="text"
                value={newCatInput}
                onChange={e => setNewCatInput(e.target.value)}
                placeholder="Ej: Panes Integrales, Dulces..."
                className="px-3 py-2 text-xs bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 min-w-[220px]"
              />
              <button
                type="submit"
                disabled={!newCatInput.trim()}
                className="flex items-center gap-1.5 px-4 py-2 bg-stone-900 hover:bg-stone-800 disabled:opacity-40 text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer shadow-xs"
              >
                <Plus className="w-4 h-4" />
                <span>Adicionar</span>
              </button>
            </form>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {categoriasList.map(cat => {
              const panes = productos.filter(p => p.categoria === cat);
              const isEditing = editingCat?.original === cat;

              return (
                <div
                  key={cat}
                  className="p-4 rounded-xl border border-stone-200 bg-stone-50/70 hover:bg-stone-50 transition-colors flex flex-col justify-between gap-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    {isEditing ? (
                      <div className="flex items-center gap-2 flex-1">
                        <input
                          type="text"
                          value={editingCat.current}
                          onChange={e => setEditingCat({ ...editingCat, current: e.target.value })}
                          className="flex-1 px-2.5 py-1.5 text-xs bg-white border border-amber-400 rounded-lg font-bold text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                          autoFocus
                          onKeyDown={e => {
                            if (e.key === 'Enter') handleSaveRenameCategory();
                            if (e.key === 'Escape') setEditingCat(null);
                          }}
                        />
                        <button
                          type="button"
                          onClick={handleSaveRenameCategory}
                          title="Guardar nombre"
                          className="p-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg cursor-pointer"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingCat(null)}
                          title="Cancelar"
                          className="p-1.5 bg-stone-200 hover:bg-stone-300 text-stone-700 rounded-lg cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-stone-900 font-display">{cat}</span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full font-mono font-bold bg-amber-100 text-amber-800">
                            {panes.length} {panes.length === 1 ? 'pan' : 'panes'}
                          </span>
                        </div>
                      </div>
                    )}

                    {!isEditing && (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleStartRenameCategory(cat)}
                          title="Modificar nombre de categoría"
                          className="p-1.5 text-stone-600 hover:text-stone-900 bg-white hover:bg-stone-100 border border-stone-200 rounded-lg transition-colors cursor-pointer"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteCategory(cat)}
                          title="Quitar categoría"
                          className="p-1.5 text-red-600 hover:text-red-800 bg-white hover:bg-red-50 border border-stone-200 rounded-lg transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Lista de panes asociados */}
                  <div className="pt-2 border-t border-stone-200/60">
                    <p className="text-[11px] text-stone-500 font-medium mb-1.5">Panes en esta sección:</p>
                    {panes.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {panes.map(p => (
                          <span
                            key={p.id}
                            className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 bg-white border border-stone-200 rounded-md text-stone-700 font-medium"
                          >
                            <Wheat className="w-3 h-3 text-amber-600" />
                            {p.nombre}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[11px] text-stone-400 italic">No hay panes asignados a esta categoría todavía.</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* MODAL: PRODUCTO (CREATE / EDIT) */}
      {showProductModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-stone-200 space-y-4 max-h-[90vh] overflow-y-auto">
            <h4 className="font-bold text-base text-stone-900 font-display">
              {editingProduct ? 'Editar Pan' : 'Nuevo Pan en Catálogo'}
            </h4>

            <form onSubmit={handleSaveProduct} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-stone-700 mb-1">Nombre del Pan:</label>
                <input
                  type="text"
                  required
                  value={prodForm.nombre}
                  onChange={e => setProdForm({ ...prodForm, nombre: e.target.value })}
                  placeholder="ej. Pan de Queso / Pandebono"
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">Precio de Venta (COP $):</label>
                  <input
                    type="number"
                    step="100"
                    min="100"
                    required
                    value={prodForm.precio}
                    onChange={e => setProdForm({ ...prodForm, precio: e.target.value })}
                    placeholder="3500"
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl font-mono font-bold"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block font-semibold text-stone-700">Categoría:</label>
                    <button
                      type="button"
                      onClick={() => {
                        setInlineNewCategory(!inlineNewCategory);
                        if (!inlineNewCategory) setProdForm({ ...prodForm, categoria: '' });
                        else setProdForm({ ...prodForm, categoria: categoriasList[0] || 'Pan Rústico' });
                      }}
                      className="text-[11px] text-amber-700 font-bold hover:underline cursor-pointer"
                    >
                      {inlineNewCategory ? '← Elegir existente' : '+ Nueva sección'}
                    </button>
                  </div>

                  {inlineNewCategory ? (
                    <input
                      type="text"
                      required
                      placeholder="Nombre de la nueva categoría..."
                      value={prodForm.categoria}
                      onChange={e => setProdForm({ ...prodForm, categoria: e.target.value })}
                      className="w-full px-3 py-2 bg-stone-50 border border-amber-400 rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  ) : (
                    <select
                      value={prodForm.categoria}
                      onChange={e => {
                        if (e.target.value === '__NEW__') {
                          setInlineNewCategory(true);
                          setProdForm({ ...prodForm, categoria: '' });
                        } else {
                          setProdForm({ ...prodForm, categoria: e.target.value });
                        }
                      }}
                      className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl"
                    >
                      {categoriasList.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                      <option value="__NEW__">+ Crear nueva categoría...</option>
                    </select>
                  )}
                </div>
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">Stock Inicial Disponible:</label>
                <input
                  type="number"
                  min="0"
                  value={prodForm.stock_disponible}
                  onChange={e => setProdForm({ ...prodForm, stock_disponible: e.target.value })}
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">Descripción / Notas:</label>
                <textarea
                  rows={2}
                  value={prodForm.descripcion}
                  onChange={e => setProdForm({ ...prodForm, descripcion: e.target.value })}
                  placeholder="Elaborado artesanalmente con fermentación lenta..."
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl"
                />
              </div>

              {/* Photo selector (Preset, Upload, or URL) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block font-semibold text-stone-700">Fotografía del Pan:</label>
                  <span className="text-[10px] text-emerald-700 font-semibold flex items-center gap-1">
                    <Zap className="w-3 h-3 text-amber-500" />
                    Optimización web automática
                  </span>
                </div>

                {/* Subir foto propia con compresión automática */}
                <div className="flex items-center gap-2">
                  <label className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-amber-50 hover:bg-amber-100 border border-amber-300 border-dashed rounded-xl text-amber-900 font-semibold cursor-pointer transition-colors text-xs">
                    <Camera className="w-4 h-4 text-amber-700" />
                    <span>{isOptimizingImage ? 'Optimizando foto...' : '📷 Subir foto (celular o PC)'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      disabled={isOptimizingImage}
                      onChange={handleImageFileUpload}
                      className="hidden"
                    />
                  </label>
                </div>

                {/* Badge de compresión exitosa */}
                {compressionStats && (
                  <div className="p-2 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center justify-between text-[11px] text-emerald-800">
                    <div className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>
                        Comprimida: <strong>{formatBytes(compressionStats.originalSize)}</strong> ➔ <strong>{formatBytes(compressionStats.compressedSize)}</strong>
                      </span>
                    </div>
                    <span className="font-bold bg-emerald-200/80 px-1.5 py-0.5 rounded text-[10px]">
                      -{compressionStats.savedPercentage}% peso
                    </span>
                  </div>
                )}

                {/* Presets de La Estrella del Socorro */}
                <div>
                  <p className="text-[10px] text-stone-500 mb-1">O elige una fotografía de catálogo de La Estrella:</p>
                  <div className="grid grid-cols-6 gap-1.5">
                    {PRESET_IMAGES.map((img, i) => (
                      <div
                        key={i}
                        onClick={() => {
                          setProdForm({ ...prodForm, imagen_url: img.url });
                          setCompressionStats(null);
                        }}
                        className={`aspect-square rounded-lg overflow-hidden border-2 cursor-pointer transition-all ${
                          prodForm.imagen_url === img.url
                            ? 'border-amber-600 ring-2 ring-amber-500/20'
                            : 'border-transparent opacity-65 hover:opacity-100'
                        }`}
                        title={img.name}
                      >
                        <img src={img.url} alt={img.name} className="w-full h-full object-cover" />
                      </div>
                    ))}
                  </div>
                </div>

                {/* URL manual */}
                <input
                  type="text"
                  value={prodForm.imagen_url}
                  onChange={e => {
                    const optimized = optimizeExternalImageUrl(e.target.value);
                    setProdForm({ ...prodForm, imagen_url: optimized });
                  }}
                  placeholder="O ingresa la URL de la imagen en internet"
                  className="w-full px-3 py-1.5 bg-stone-50 border border-stone-200 rounded-xl text-[11px] text-stone-600"
                />
              </div>

              {/* Availability setting */}
              <div className="flex items-center justify-between p-3 bg-stone-50 rounded-xl border border-stone-200">
                <div>
                  <span className="block font-semibold text-stone-800 text-xs">Disponibilidad en Catálogo:</span>
                  <span className="text-[11px] text-stone-500">
                    {prodForm.activo === 1 ? 'El pan se mostrará en el Punto de Venta (POS)' : 'El pan estará pausado temporalmente'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setProdForm({ ...prodForm, activo: prodForm.activo === 1 ? 0 : 1 })}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                    prodForm.activo === 1
                      ? 'bg-emerald-600 text-white hover:bg-emerald-500'
                      : 'bg-stone-300 text-stone-700 hover:bg-stone-400'
                  }`}
                >
                  {prodForm.activo === 1 ? 'Disponible (Activo)' : 'Pausado (Inactivo)'}
                </button>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-stone-100">
                {editingProduct ? (
                  <button
                    type="button"
                    onClick={() => handleDeleteProduct(editingProduct)}
                    className="flex items-center gap-1.5 text-xs text-red-600 hover:text-red-800 font-semibold cursor-pointer px-2 py-1.5 rounded-lg hover:bg-red-50 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Eliminar producto</span>
                  </button>
                ) : <div />}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowProductModal(false)}
                    className="px-3 py-2 text-stone-600 hover:text-stone-900 cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 text-white font-bold rounded-xl shadow-xs transition-all cursor-pointer"
                  >
                    Guardar Producto
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: INSUMO (CREATE / EDIT) */}
      {showInsumoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl border border-stone-200 space-y-4">
            <h4 className="font-bold text-base text-stone-900 font-display">
              {editingInsumo ? 'Editar Insumo' : 'Nuevo Insumo (Materia Prima)'}
            </h4>

            <form onSubmit={handleSaveInsumo} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-stone-700 mb-1">Nombre del Insumo:</label>
                <input
                  type="text"
                  required
                  value={insumoForm.nombre}
                  onChange={e => setInsumoForm({ ...insumoForm, nombre: e.target.value })}
                  placeholder="ej. Harina de Trigo Especial"
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">Unidad de Medida:</label>
                  <select
                    value={insumoForm.unidad_medida}
                    onChange={e => setInsumoForm({ ...insumoForm, unidad_medida: e.target.value })}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl"
                  >
                    <option value="kg">Kilogramos (kg)</option>
                    <option value="g">Gramos (g)</option>
                    <option value="L">Litros (L)</option>
                    <option value="ml">Mililitros (ml)</option>
                    <option value="unidad">Unidad (u.)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-stone-700 mb-1">Costo Unitario COP ($):</label>
                  <input
                    type="number"
                    step="50"
                    min="0"
                    required
                    value={insumoForm.costo_unitario}
                    onChange={e => setInsumoForm({ ...insumoForm, costo_unitario: e.target.value })}
                    placeholder="4200"
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl font-mono font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">Stock Actual:</label>
                  <input
                    type="number"
                    step="any"
                    value={insumoForm.stock_actual}
                    onChange={e => setInsumoForm({ ...insumoForm, stock_actual: e.target.value })}
                    placeholder="50"
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl font-mono"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-stone-700 mb-1">Stock Mínimo (Alerta):</label>
                  <input
                    type="number"
                    step="any"
                    value={insumoForm.stock_minimo}
                    onChange={e => setInsumoForm({ ...insumoForm, stock_minimo: e.target.value })}
                    placeholder="10"
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setShowInsumoModal(false)}
                  className="px-3 py-2 text-stone-600 hover:text-stone-900 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 text-white font-bold rounded-xl shadow-xs transition-all cursor-pointer"
                >
                  Guardar Insumo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
