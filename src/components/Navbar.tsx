import React, { useState } from 'react';
import { ShoppingBag, Wheat, BarChart3, Settings2, Store, Menu, X } from 'lucide-react';

interface NavbarProps {
  currentModule: 'pos' | 'produccion' | 'dashboard' | 'admin';
  onChangeModule: (module: 'pos' | 'produccion' | 'dashboard' | 'admin') => void;
  cartCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({ currentModule, onChangeModule, cartCount }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleSelectModule = (mod: 'pos' | 'produccion' | 'dashboard' | 'admin') => {
    onChangeModule(mod);
    setMobileMenuOpen(false);
  };

  const navItems = [
    { id: 'pos', label: 'Punto de Venta', icon: Store, badge: cartCount > 0 && currentModule !== 'pos' ? cartCount : null },
    { id: 'produccion', label: 'Producción & Insumos', icon: Wheat, badge: null },
    { id: 'dashboard', label: 'Dashboard & Reportes', icon: BarChart3, badge: null },
    { id: 'admin', label: 'Recetas & Catálogo', icon: Settings2, badge: null },
  ] as const;

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-stone-200 shadow-xs">
      {/* Top brand accent gradient line */}
      <div className="h-1 w-full bg-gradient-to-r from-amber-500 via-orange-500 to-red-600"></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-2">
        
        {/* Zone 1: Authentic Logo of La Estrella del Socorro */}
        <div
          onClick={() => handleSelectModule('pos')}
          className="flex items-center cursor-pointer select-none shrink-0 py-1"
          title="Panadería La Estrella del Socorro"
        >
          <img
            src="/images/logo_estrella.png"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              if (!target.dataset.tried) {
                target.dataset.tried = '1';
                target.src = '/src/assets/images/logo_estrella.png';
              } else {
                target.src = 'https://www.kroman360.com/imagenes/logoestrella.png';
              }
            }}
            alt="Logo Panadería La Estrella del Socorro"
            className="w-[145px] sm:w-[175px] md:w-[195px] h-[50px] sm:h-[60px] md:h-[66px] object-contain transition-transform duration-150 hover:scale-[1.02]"
            style={{ objectFit: 'contain', aspectRatio: '500 / 200' }}
          />
        </div>

        {/* Zone 2: Desktop Navigation Links (Hidden on mobile and tablet to prevent overflow) */}
        <nav className="hidden lg:flex items-center gap-1 xl:gap-2 flex-nowrap">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentModule === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleSelectModule(item.id)}
                className={`flex items-center gap-1.5 xl:gap-2 px-3 xl:px-3.5 py-2 text-xs xl:text-sm rounded-xl transition-all duration-150 whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'bg-gradient-to-r from-red-600 via-orange-600 to-amber-500 text-white font-bold shadow-xs'
                    : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100 font-medium'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{item.label}</span>
                {item.badge && (
                  <span className="w-5 h-5 rounded-full bg-red-600 text-white text-xs font-bold flex items-center justify-center tabular-nums">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: Desktop Right Status & Action */}
        <div className="hidden lg:flex items-center gap-2.5 shrink-0">
          <div className="flex items-center gap-2 text-xs text-stone-600 border border-stone-200 rounded-xl px-2.5 xl:px-3 py-1.5 bg-stone-50">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="font-medium text-[11px] xl:text-xs">Caja 1 · El Socorro</span>
          </div>

          {currentModule !== 'pos' && (
            <button
              onClick={() => handleSelectModule('pos')}
              className="px-3 xl:px-3.5 py-2 text-xs font-bold text-white bg-gradient-to-r from-red-600 via-orange-600 to-amber-500 hover:brightness-105 rounded-xl transition-all shadow-xs flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              <span>Ir a Caja</span>
            </button>
          )}
        </div>

        {/* Mobile & Tablet Controls: Quick Cart + Hamburger Toggle */}
        <div className="flex lg:hidden items-center gap-2">
          {currentModule !== 'pos' && (
            <button
              onClick={() => handleSelectModule('pos')}
              className="px-2.5 py-1.5 text-xs font-bold text-white bg-gradient-to-r from-red-600 to-orange-500 rounded-lg flex items-center gap-1 shadow-xs cursor-pointer"
              title="Ir a Punto de Venta"
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Caja</span>
              {cartCount > 0 && (
                <span className="w-4 h-4 rounded-full bg-white text-red-600 text-[10px] font-bold flex items-center justify-center">
                  {cartCount}
                </span>
              )}
            </button>
          )}

          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-xl text-stone-700 hover:text-stone-900 hover:bg-stone-100 border border-stone-200 transition-colors cursor-pointer"
            aria-label="Abrir menú de navegación"
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile & Tablet Dropdown Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-stone-200 bg-white/98 backdrop-blur-md px-4 pt-3 pb-5 space-y-2 shadow-lg animate-in slide-in-from-top-2 duration-200">
          <div className="text-[11px] font-bold text-stone-400 uppercase tracking-wider px-2 py-1">
            Módulos del Sistema
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentModule === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleSelectModule(item.id)}
                  className={`w-full flex items-center justify-between p-3 rounded-xl transition-all cursor-pointer text-left text-sm ${
                    isActive
                      ? 'bg-gradient-to-r from-red-600 via-orange-600 to-amber-500 text-white font-bold shadow-xs'
                      : 'bg-stone-50 hover:bg-stone-100 text-stone-700 font-medium border border-stone-200/80'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isActive ? 'bg-white/20 text-white' : 'bg-stone-200/60 text-stone-700'}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span className="px-2 py-0.5 rounded-full bg-red-600 text-white text-xs font-bold tabular-nums">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Cashier status footer in mobile menu */}
          <div className="pt-2 mt-2 border-t border-stone-100 flex items-center justify-between px-2 text-xs text-stone-500">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>Caja 1 · El Socorro · Turno Abierto</span>
            </div>
            <span className="font-mono text-[11px]">COP ($)</span>
          </div>
        </div>
      )}
    </header>
  );
};
