import initSqlJs, { Database } from 'sql.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.resolve(__dirname, '../../data');
const DB_PATH = path.resolve(DATA_DIR, 'panaderia.sqlite');

let dbInstance: Database | null = null;

export async function getDatabase(): Promise<Database> {
  if (dbInstance) return dbInstance;

  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  const SQL = await initSqlJs();

  if (fs.existsSync(DB_PATH)) {
    try {
      const fileBuffer = fs.readFileSync(DB_PATH);
      dbInstance = new SQL.Database(fileBuffer);
      console.log('Base de datos SQLite cargada desde:', DB_PATH);
      // Ensure foreign keys enabled
      dbInstance.run('PRAGMA foreign_keys = ON;');
      return dbInstance;
    } catch (e) {
      console.error('Error cargando base de datos existente, inicializando nueva:', e);
    }
  }

  dbInstance = new SQL.Database();
  dbInstance.run('PRAGMA foreign_keys = ON;');
  initializeSchema(dbInstance);
  seedInitialData(dbInstance);
  saveDatabase();
  console.log('Base de datos SQLite inicializada y sembrada con éxito.');
  return dbInstance;
}

export function saveDatabase(): void {
  if (!dbInstance) return;
  try {
    const data = dbInstance.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(DB_PATH, buffer);
  } catch (err) {
    console.error('Error guardando base de datos SQLite:', err);
  }
}

function initializeSchema(db: Database): void {
  const schemaSql = `
    -- 1. TABLA INSUMOS (Materia Prima)
    CREATE TABLE IF NOT EXISTS insumos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL,
      unidad_medida TEXT NOT NULL, -- 'kg', 'g', 'L', 'ml', 'unidad'
      costo_unitario REAL NOT NULL, -- Costo por unidad de medida base (ej. costo por kg)
      stock_actual REAL NOT NULL DEFAULT 0,
      stock_minimo REAL NOT NULL DEFAULT 5,
      stock_inicial REAL NOT NULL DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    -- 2. TABLA PRODUCTOS (Panes y Bollería)
    CREATE TABLE IF NOT EXISTS productos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL,
      descripcion TEXT,
      precio REAL NOT NULL,
      categoria TEXT DEFAULT 'Pan Rústico', -- 'Pan Rústico', 'Pan Blanco', 'Bollería / Dulce', 'Especiales'
      imagen_url TEXT,
      stock_disponible INTEGER NOT NULL DEFAULT 20,
      activo INTEGER NOT NULL DEFAULT 1,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    -- 3. TABLA RECETAS (Escandallos: relación N a M entre Productos e Insumos)
    CREATE TABLE IF NOT EXISTS recetas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      producto_id INTEGER NOT NULL,
      insumo_id INTEGER NOT NULL,
      cantidad REAL NOT NULL, -- Cantidad de insumo por unidad de producto (en la unidad_medida del insumo)
      FOREIGN KEY (producto_id) REFERENCES productos(id) ON DELETE CASCADE,
      FOREIGN KEY (insumo_id) REFERENCES insumos(id) ON DELETE CASCADE,
      UNIQUE (producto_id, insumo_id)
    );

    -- 4. TABLA VENTAS (Cabecera de Venta / Tickets)
    CREATE TABLE IF NOT EXISTS ventas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      codigo_ticket TEXT NOT NULL UNIQUE,
      fecha TEXT NOT NULL,
      subtotal REAL NOT NULL,
      impuesto REAL NOT NULL DEFAULT 0,
      total REAL NOT NULL,
      metodo_pago TEXT NOT NULL DEFAULT 'Efectivo', -- 'Efectivo', 'Tarjeta', 'Transferencia'
      costo_insumos_total REAL NOT NULL DEFAULT 0,
      cajero TEXT DEFAULT 'Caja 1',
      notas TEXT
    );

    -- 5. TABLA DETALLE_VENTAS (Líneas de la comanda)
    CREATE TABLE IF NOT EXISTS detalle_ventas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      venta_id INTEGER NOT NULL,
      producto_id INTEGER NOT NULL,
      cantidad INTEGER NOT NULL,
      precio_unitario REAL NOT NULL,
      subtotal REAL NOT NULL,
      costo_unitario_insumos REAL NOT NULL DEFAULT 0,
      FOREIGN KEY (venta_id) REFERENCES ventas(id) ON DELETE CASCADE,
      FOREIGN KEY (producto_id) REFERENCES productos(id)
    );

    -- 6. TABLA PRODUCCION (Control diario de panadería)
    CREATE TABLE IF NOT EXISTS produccion (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      fecha TEXT NOT NULL,
      producto_id INTEGER NOT NULL,
      cantidad_producida INTEGER NOT NULL,
      merma_unidades INTEGER NOT NULL DEFAULT 0,
      maestro_panadero TEXT DEFAULT 'Maestro Panadero',
      tanda TEXT DEFAULT 'Mañana', -- 'Mañana', 'Tarde', 'Noche'
      notas TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (producto_id) REFERENCES productos(id)
    );

    -- 7. TABLA MOVIMIENTOS_INVENTARIO (Kardex / Auditoría de insumos)
    CREATE TABLE IF NOT EXISTS movimientos_inventario (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      fecha TEXT NOT NULL,
      insumo_id INTEGER NOT NULL,
      tipo TEXT NOT NULL, -- 'VENTA', 'PRODUCCION', 'REABASTECIMIENTO', 'AJUSTE', 'MERMA'
      cantidad REAL NOT NULL, -- Positivo si entra, negativo si sale
      stock_resultante REAL NOT NULL,
      motivo TEXT,
      referencia_id INTEGER,
      FOREIGN KEY (insumo_id) REFERENCES insumos(id)
    );
  `;

  db.run(schemaSql);
}

function seedInitialData(db: Database): void {
  // Insumos base en Pesos Colombianos (COP)
  const insumos = [
    { nombre: 'Harina de Trigo Especial W300', unidad: 'kg', costo: 4200, stock: 85.0, min: 25.0 },
    { nombre: 'Levadura Fresca Prensada', unidad: 'kg', costo: 18000, stock: 3.5, min: 2.0 },
    { nombre: 'Masa Madre Natural Activa', unidad: 'kg', costo: 5000, stock: 12.0, min: 5.0 },
    { nombre: 'Mantequilla Artesanal 82% MG', unidad: 'kg', costo: 32000, stock: 7.2, min: 6.0 },
    { nombre: 'Sal Marina Fina', unidad: 'kg', costo: 2000, stock: 18.0, min: 5.0 },
    { nombre: 'Azúcar Blanca Refinada', unidad: 'kg', costo: 4600, stock: 15.0, min: 8.0 },
    { nombre: 'Agua Purificada Filtrada', unidad: 'L', costo: 200, stock: 500.0, min: 100.0 },
    { nombre: 'Chocolate Repostería 65%', unidad: 'kg', costo: 48000, stock: 3.5, min: 5.0 }, // ALERTA: bajo stock
    { nombre: 'Aceite de Oliva Virgen Extra', unidad: 'L', costo: 36000, stock: 4.5, min: 3.0 },
    { nombre: 'Queso Campesino Rallado', unidad: 'kg', costo: 24000, stock: 9.0, min: 4.0 },
  ];

  for (const ins of insumos) {
    db.run(
      `INSERT INTO insumos (nombre, unidad_medida, costo_unitario, stock_actual, stock_minimo, stock_inicial) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [ins.nombre, ins.unidad, ins.costo, ins.stock, ins.min, ins.stock]
    );
  }

  // Productos iniciales en Pesos Colombianos (COP) con las imágenes de La Estrella del Socorro
  const productos = [
    {
      nombre: 'Baguette Tradicional Francesa',
      descripcion: 'Corteza crujiente dorada y miga alveolada con 24h de fermentación lenta.',
      precio: 3500,
      categoria: 'Pan Rústico',
      imagen_url: '/src/assets/images/pan_estrella_1.jpg',
      stock_disponible: 32,
    },
    {
      nombre: 'Pan Campesino de Masa Madre',
      descripcion: 'Hogaza rústica 100% masa madre con greña pronunciada y acidez equilibrada.',
      precio: 15000,
      categoria: 'Especiales',
      imagen_url: '/src/assets/images/pan_estrella_2.jpg',
      stock_disponible: 18,
    },
    {
      nombre: 'Croissant Francés de Mantequilla',
      descripcion: 'Hojaldre artesanal con mantequilla pura al 82%, capas finas y esponjosas.',
      precio: 5500,
      categoria: 'Bollería / Dulce',
      imagen_url: '/src/assets/images/pan_estrella_3.jpg',
      stock_disponible: 25,
    },
    {
      nombre: 'Ciabatta Rústica de Aceite de Oliva',
      descripcion: 'Pan italiano de alta hidratación con aceite de oliva virgen extra y miga abierta.',
      precio: 4800,
      categoria: 'Pan Blanco',
      imagen_url: '/src/assets/images/pan_estrella_4.jpg',
      stock_disponible: 22,
    },
    {
      nombre: 'Pan Brioche / Blandito Artesanal',
      descripcion: 'Pan suave y esponjoso dorado al huevo, ideal para sándwich y hamburguesas.',
      precio: 2500,
      categoria: 'Pan Blanco',
      imagen_url: '/src/assets/images/pan_estrella_5.jpg',
      stock_disponible: 30,
    },
    {
      nombre: 'Pan Especial de la Casa La Estrella',
      descripcion: 'Receta insignia con corteza caramelizada, toque de mantequilla y semillas.',
      precio: 4200,
      categoria: 'Especiales',
      imagen_url: '/src/assets/images/pan_estrella_6.jpg',
      stock_disponible: 24,
    },
  ];

  for (const prod of productos) {
    db.run(
      `INSERT INTO productos (nombre, descripcion, precio, categoria, imagen_url, stock_disponible)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [prod.nombre, prod.descripcion, prod.precio, prod.categoria, prod.imagen_url, prod.stock_disponible]
    );
  }

  // Recetas (Escandallos por unidad de pan)
  const recetas = [
    // Baguette
    { producto_id: 1, insumo_id: 1, cantidad: 0.30 }, // 300g harina ($1.260)
    { producto_id: 1, insumo_id: 2, cantidad: 0.005 }, // 5g levadura ($90)
    { producto_id: 1, insumo_id: 5, cantidad: 0.006 }, // 6g sal ($12)
    { producto_id: 1, insumo_id: 7, cantidad: 0.20 },  // 200ml agua ($40)

    // Masa Madre (Hogaza 800g)
    { producto_id: 2, insumo_id: 1, cantidad: 0.55 }, // 550g harina ($2.310)
    { producto_id: 2, insumo_id: 3, cantidad: 0.15 }, // 150g masa madre ($750)
    { producto_id: 2, insumo_id: 5, cantidad: 0.012 }, // 12g sal ($24)
    { producto_id: 2, insumo_id: 7, cantidad: 0.38 }, // 380ml agua ($76)

    // Croissant
    { producto_id: 3, insumo_id: 1, cantidad: 0.08 }, // 80g harina ($336)
    { producto_id: 3, insumo_id: 4, cantidad: 0.045 }, // 45g mantequilla ($1.440)
    { producto_id: 3, insumo_id: 6, cantidad: 0.015 }, // 15g azúcar ($69)
    { producto_id: 3, insumo_id: 2, cantidad: 0.003 }, // 3g levadura ($54)
    { producto_id: 3, insumo_id: 5, cantidad: 0.002 }, // 2g sal ($4)

    // Ciabatta
    { producto_id: 4, insumo_id: 1, cantidad: 0.35 }, // 350g harina ($1.470)
    { producto_id: 4, insumo_id: 9, cantidad: 0.025 }, // 25ml AOVE ($900)
    { producto_id: 4, insumo_id: 2, cantidad: 0.006 }, // 6g levadura ($108)
    { producto_id: 4, insumo_id: 5, cantidad: 0.007 }, // 7g sal ($14)
    { producto_id: 4, insumo_id: 7, cantidad: 0.28 }, // 280ml agua ($56)

    // Pan Brioche / Blandito
    { producto_id: 5, insumo_id: 1, cantidad: 0.12 }, // 120g harina ($504)
    { producto_id: 5, insumo_id: 4, cantidad: 0.015 }, // 15g mantequilla ($480)
    { producto_id: 5, insumo_id: 2, cantidad: 0.003 }, // 3g levadura ($54)
    { producto_id: 5, insumo_id: 6, cantidad: 0.010 }, // 10g azúcar ($46)
    { producto_id: 5, insumo_id: 5, cantidad: 0.002 }, // 2g sal ($4)

    // Pan Especial La Estrella
    { producto_id: 6, insumo_id: 1, cantidad: 0.28 }, // 280g harina ($1.176)
    { producto_id: 6, insumo_id: 4, cantidad: 0.020 }, // 20g mantequilla ($640)
    { producto_id: 6, insumo_id: 2, cantidad: 0.005 }, // 5g levadura ($90)
    { producto_id: 6, insumo_id: 5, cantidad: 0.005 }, // 5g sal ($10)
    { producto_id: 6, insumo_id: 7, cantidad: 0.18 }, // 180ml agua ($36)
  ];

  for (const r of recetas) {
    db.run(
      `INSERT INTO recetas (producto_id, insumo_id, cantidad) VALUES (?, ?, ?)`,
      [r.producto_id, r.insumo_id, r.cantidad]
    );
  }

  // Semilla de Producción Diaria Reciente
  const hoy = new Date().toISOString().split('T')[0];
  const ayer = new Date(Date.now() - 86400000).toISOString().split('T')[0];

  const producciones = [
    { fecha: hoy, producto_id: 1, cant: 45, merma: 2, tanda: 'Mañana', panadero: 'Carlos Gómez' },
    { fecha: hoy, producto_id: 2, cant: 22, merma: 1, tanda: 'Mañana', panadero: 'Carlos Gómez' },
    { fecha: hoy, producto_id: 3, cant: 35, merma: 3, tanda: 'Mañana', panadero: 'Marta Rivas' },
    { fecha: ayer, producto_id: 1, cant: 50, merma: 1, tanda: 'Mañana', panadero: 'Carlos Gómez' },
    { fecha: ayer, producto_id: 4, cant: 30, merma: 2, tanda: 'Tarde', panadero: 'Carlos Gómez' },
  ];

  for (const p of producciones) {
    db.run(
      `INSERT INTO produccion (fecha, producto_id, cantidad_producida, merma_unidades, tanda, maestro_panadero, notas)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [p.fecha, p.producto_id, p.cant, p.merma, p.tanda, p.panadero, 'Tanda estándar horneada a 220°C con vapor']
    );
  }

  // Semilla de Ventas Anteriores en COP
  const ventasEjemplo = [
    {
      codigo: 'TKT-20260929-001',
      fecha: `${ayer} 08:30:00`,
      subtotal: 21500,
      impuesto: 0,
      total: 21500,
      metodo: 'Efectivo',
      costo_insumos: 6200,
      items: [
        { prod: 1, cant: 3, pUnit: 3500, cUnit: 1402 },
        { prod: 3, cant: 2, pUnit: 5500, cUnit: 1903 },
      ]
    },
    {
      codigo: 'TKT-20260929-002',
      fecha: `${ayer} 11:15:00`,
      subtotal: 40300,
      impuesto: 0,
      total: 40300,
      metodo: 'Tarjeta',
      costo_insumos: 11500,
      items: [
        { prod: 2, cant: 2, pUnit: 15000, cUnit: 3160 },
        { prod: 4, cant: 1, pUnit: 4800, cUnit: 2548 },
        { prod: 3, cant: 1, pUnit: 5500, cUnit: 1903 },
      ]
    },
    {
      codigo: 'TKT-20260930-001',
      fecha: `${hoy} 09:12:00`,
      subtotal: 22000,
      impuesto: 0,
      total: 22000,
      metodo: 'Efectivo',
      costo_insumos: 5964,
      items: [
        { prod: 1, cant: 2, pUnit: 3500, cUnit: 1402 },
        { prod: 2, cant: 1, pUnit: 15000, cUnit: 3160 },
      ]
    },
    {
      codigo: 'TKT-20260930-002',
      fecha: `${hoy} 12:45:00`,
      subtotal: 35100,
      impuesto: 0,
      total: 35100,
      metodo: 'Transferencia',
      costo_insumos: 10400,
      items: [
        { prod: 3, cant: 4, pUnit: 5500, cUnit: 1903 },
        { prod: 4, cant: 2, pUnit: 4800, cUnit: 2548 },
        { prod: 1, cant: 1, pUnit: 3500, cUnit: 1402 },
      ]
    }
  ];

  for (const v of ventasEjemplo) {
    db.run(
      `INSERT INTO ventas (codigo_ticket, fecha, subtotal, impuesto, total, metodo_pago, costo_insumos_total)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [v.codigo, v.fecha, v.subtotal, v.impuesto, v.total, v.metodo, v.costo_insumos]
    );

    const ventaIdRes = db.exec(`SELECT last_insert_rowid() as id`);
    const ventaId = ventaIdRes[0].values[0][0] as number;

    for (const item of v.items) {
      db.run(
        `INSERT INTO detalle_ventas (venta_id, producto_id, cantidad, precio_unitario, subtotal, costo_unitario_insumos)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [ventaId, item.prod, item.cant, item.pUnit, item.cant * item.pUnit, item.cUnit]
      );
    }
  }
}
