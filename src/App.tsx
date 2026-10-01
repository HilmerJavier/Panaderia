import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { POSModule } from './components/POSModule';
import { ProduccionModule } from './components/ProduccionModule';
import { DashboardModule } from './components/DashboardModule';
import { AdminModule } from './components/AdminModule';
import { ReceiptModal } from './components/ReceiptModal';
import { Producto, Insumo, TicketVenta } from './types';
import { api } from './services/api';
import { Wheat, AlertCircle, RefreshCw } from 'lucide-react';

export default function App() {
  const [currentModule, setCurrentModule] = useState<'pos' | 'produccion' | 'dashboard' | 'admin'>('pos');
  const [productos, setProductos] = useState<Producto[]>([]);
  const [insumos, setInsumos] = useState<Insumo[]>([]);
  const [lastTicket, setLastTicket] = useState<TicketVenta | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const fetchGlobalData = async () => {
    try {
      setLoadError(null);
      const [prods, ins] = await Promise.all([
        api.getProductos(),
        api.getInsumos(),
      ]);
      setProductos(prods);
      setInsumos(ins);
    } catch (err: any) {
      console.error('Error cargando datos principales:', err);
      setLoadError('No se pudo conectar con el servidor de la panadería. Asegúrate de que el backend esté ejecutándose.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchGlobalData();
  }, []);

  const handleSaleComplete = (ticket: TicketVenta) => {
    setLastTicket(ticket);
    fetchGlobalData();
  };

  return (
    <div className="min-h-screen bg-stone-100 flex flex-col font-sans text-stone-900 selection:bg-amber-200 overflow-x-hidden">
      
      {/* Universal Top Bar */}
      <Navbar
        currentModule={currentModule}
        onChangeModule={setCurrentModule}
        cartCount={0}
      />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col">
        {isLoading ? (
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-stone-500">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-600 flex items-center justify-center animate-spin mb-4">
              <Wheat className="w-6 h-6" />
            </div>
            <p className="font-semibold text-stone-700 text-sm">Cargando sistema de panadería...</p>
            <p className="text-xs text-stone-400 mt-1">Conectando con base de datos relacional y recetas</p>
          </div>
        ) : loadError ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 max-w-md mx-auto text-center">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mb-3">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-stone-900 text-base">Error de Conexión</h3>
            <p className="text-xs text-stone-600 mt-1 leading-relaxed">{loadError}</p>
            <button
              onClick={() => {
                setIsLoading(true);
                fetchGlobalData();
              }}
              className="mt-4 px-4 py-2 bg-stone-900 text-white rounded-xl text-xs font-semibold hover:bg-stone-800 transition-colors flex items-center gap-2 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Reintentar Conexión</span>
            </button>
          </div>
        ) : (
          <>
            {currentModule === 'pos' && (
              <POSModule
                productos={productos}
                onSaleComplete={handleSaleComplete}
                onRefreshData={fetchGlobalData}
              />
            )}

            {currentModule === 'produccion' && (
              <ProduccionModule
                productos={productos}
                onRefreshAll={fetchGlobalData}
              />
            )}

            {currentModule === 'dashboard' && (
              <DashboardModule />
            )}

            {currentModule === 'admin' && (
              <AdminModule
                productos={productos}
                insumos={insumos}
                onRefreshAll={fetchGlobalData}
              />
            )}
          </>
        )}
      </main>

      {/* Thermal Receipt Print / Success Modal */}
      <ReceiptModal
        ticket={lastTicket}
        onClose={() => setLastTicket(null)}
      />

      {/* Global Minimal Footer */}
      <footer className="bg-stone-900 text-stone-400 border-t border-stone-800 py-3 px-6 text-center text-xs">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>Panadería La Estrella del Socorro · Sistema de Gestión de Obrador & POS</span>
          <span className="font-mono text-amber-400/80 text-[11px]">
            Moneda: Peso Colombiano (COP) · Base de Datos SQLite Relacional
          </span>
        </div>
      </footer>
    </div>
  );
}
