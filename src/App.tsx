import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { POSModule } from './components/POSModule';
import { ProduccionModule } from './components/ProduccionModule';
import { DashboardModule } from './components/DashboardModule';
import { AdminModule } from './components/AdminModule';
import { ReceiptModal } from './components/ReceiptModal';
import { ConnectivitySyncBar } from './components/ConnectivitySyncBar';
import { Producto, Insumo, TicketVenta } from './types';
import { api } from './services/api';
import { AlertCircle, RefreshCw } from 'lucide-react';

export default function App() {
  const [currentModule, setCurrentModule] = useState<'pos' | 'produccion' | 'dashboard' | 'admin'>(() => {
    try {
      const saved = localStorage.getItem('estrella_active_module');
      if (saved && ['pos', 'produccion', 'dashboard', 'admin'].includes(saved)) {
        return saved as any;
      }
    } catch {}
    return 'pos';
  });

  const [productos, setProductos] = useState<Producto[]>(() => api.getCachedOrFallbackProductos());
  const [insumos, setInsumos] = useState<Insumo[]>(() => api.getCachedOrFallbackInsumos());
  const [lastTicket, setLastTicket] = useState<TicketVenta | null>(() => {
    try {
      const saved = localStorage.getItem('estrella_last_ticket');
      if (saved) return JSON.parse(saved);
    } catch {}
    return null;
  });
  const [isLoading, setIsLoading] = useState(false);
  const [connectionNotice, setConnectionNotice] = useState<string | null>(null);

  const handleModuleChange = (mod: 'pos' | 'produccion' | 'dashboard' | 'admin') => {
    setCurrentModule(mod);
    try {
      localStorage.setItem('estrella_active_module', mod);
    } catch {}
  };

  const fetchGlobalData = async () => {
    try {
      const [prods, ins] = await Promise.all([
        api.getProductos(true),
        api.getInsumos(),
      ]);
      setProductos(prods);
      setInsumos(ins);
      setConnectionNotice(null);
    } catch (err: any) {
      console.warn('Aviso de conexión al servidor central:', err);
      setConnectionNotice('Operando en modo de respaldo local. Los cambios del catálogo se sincronizarán al reconectar.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchGlobalData();
  }, []);

  const handleSaleComplete = (ticket: TicketVenta) => {
    setLastTicket(ticket);
    try {
      localStorage.setItem('estrella_last_ticket', JSON.stringify(ticket));
    } catch {}
    fetchGlobalData();
  };

  return (
    <div className="min-h-screen bg-stone-100 flex flex-col font-sans text-stone-900 selection:bg-amber-200 overflow-x-hidden">
      
      {/* Universal Top Bar */}
      <Navbar
        currentModule={currentModule}
        onChangeModule={handleModuleChange}
        cartCount={0}
      />

      {/* Connectivity & Offline Sync Status Bar */}
      <ConnectivitySyncBar />

      {/* Non-blocking Connection Notice Banner */}
      {connectionNotice && (
        <div className="bg-amber-500/10 border-b border-amber-300 text-amber-900 px-4 py-2 text-xs flex items-center justify-between transition-all">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-700 shrink-0" />
            <span>{connectionNotice}</span>
          </div>
          <button
            onClick={() => {
              setIsLoading(true);
              fetchGlobalData();
            }}
            disabled={isLoading}
            className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-[11px] font-semibold flex items-center gap-1 cursor-pointer transition-colors"
          >
            <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Reconectar</span>
          </button>
        </div>
      )}

      {/* Main Content Area - Always accessible */}
      <main className="flex-1 flex flex-col">
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
            Moneda: Peso Colombiano (COP) · Base de Datos en la Nube Supabase (PostgreSQL)
          </span>
        </div>
      </footer>
    </div>
  );
}
