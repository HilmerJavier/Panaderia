// server.ts
import express from "express";
import { createServer as createViteServer } from "vite";
import path2 from "path";
import { fileURLToPath as fileURLToPath2 } from "url";

// src/server/routes.ts
import { Router } from "express";

// src/server/db.ts
import initSqlJs from "sql.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
var __filename = fileURLToPath(import.meta.url);
var __dirname = path.dirname(__filename);
var DATA_DIR = path.resolve(__dirname, "../../data");
var DB_PATH = path.resolve(DATA_DIR, "panaderia.sqlite");
var dbInstance = null;
async function getDatabase() {
  if (dbInstance) return dbInstance;
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  const SQL = await initSqlJs();
  if (fs.existsSync(DB_PATH)) {
    try {
      const fileBuffer = fs.readFileSync(DB_PATH);
      dbInstance = new SQL.Database(fileBuffer);
      console.log("Base de datos SQLite cargada desde:", DB_PATH);
      dbInstance.run("PRAGMA foreign_keys = ON;");
      return dbInstance;
    } catch (e) {
      console.error("Error cargando base de datos existente, inicializando nueva:", e);
    }
  }
  dbInstance = new SQL.Database();
  dbInstance.run("PRAGMA foreign_keys = ON;");
  initializeSchema(dbInstance);
  seedInitialData(dbInstance);
  saveDatabase();
  console.log("Base de datos SQLite inicializada y sembrada con \xE9xito.");
  return dbInstance;
}
function saveDatabase() {
  if (!dbInstance) return;
  try {
    const data = dbInstance.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(DB_PATH, buffer);
  } catch (err) {
    console.error("Error guardando base de datos SQLite:", err);
  }
}
function initializeSchema(db) {
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

    -- 2. TABLA PRODUCTOS (Panes y Boller\xEDa)
    CREATE TABLE IF NOT EXISTS productos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL,
      descripcion TEXT,
      precio REAL NOT NULL,
      categoria TEXT DEFAULT 'Pan R\xFAstico', -- 'Pan R\xFAstico', 'Pan Blanco', 'Boller\xEDa / Dulce', 'Especiales'
      imagen_url TEXT,
      stock_disponible INTEGER NOT NULL DEFAULT 20,
      activo INTEGER NOT NULL DEFAULT 1,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    -- 3. TABLA RECETAS (Escandallos: relaci\xF3n N a M entre Productos e Insumos)
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

    -- 5. TABLA DETALLE_VENTAS (L\xEDneas de la comanda)
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

    -- 6. TABLA PRODUCCION (Control diario de panader\xEDa)
    CREATE TABLE IF NOT EXISTS produccion (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      fecha TEXT NOT NULL,
      producto_id INTEGER NOT NULL,
      cantidad_producida INTEGER NOT NULL,
      merma_unidades INTEGER NOT NULL DEFAULT 0,
      maestro_panadero TEXT DEFAULT 'Maestro Panadero',
      tanda TEXT DEFAULT 'Ma\xF1ana', -- 'Ma\xF1ana', 'Tarde', 'Noche'
      notas TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (producto_id) REFERENCES productos(id)
    );

    -- 7. TABLA MOVIMIENTOS_INVENTARIO (Kardex / Auditor\xEDa de insumos)
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
function seedInitialData(db) {
  const insumos = [
    { nombre: "Harina de Trigo Especial W300", unidad: "kg", costo: 4200, stock: 85, min: 25 },
    { nombre: "Levadura Fresca Prensada", unidad: "kg", costo: 18e3, stock: 3.5, min: 2 },
    { nombre: "Masa Madre Natural Activa", unidad: "kg", costo: 5e3, stock: 12, min: 5 },
    { nombre: "Mantequilla Artesanal 82% MG", unidad: "kg", costo: 32e3, stock: 7.2, min: 6 },
    { nombre: "Sal Marina Fina", unidad: "kg", costo: 2e3, stock: 18, min: 5 },
    { nombre: "Az\xFAcar Blanca Refinada", unidad: "kg", costo: 4600, stock: 15, min: 8 },
    { nombre: "Agua Purificada Filtrada", unidad: "L", costo: 200, stock: 500, min: 100 },
    { nombre: "Chocolate Reposter\xEDa 65%", unidad: "kg", costo: 48e3, stock: 3.5, min: 5 },
    // ALERTA: bajo stock
    { nombre: "Aceite de Oliva Virgen Extra", unidad: "L", costo: 36e3, stock: 4.5, min: 3 },
    { nombre: "Queso Campesino Rallado", unidad: "kg", costo: 24e3, stock: 9, min: 4 }
  ];
  for (const ins of insumos) {
    db.run(
      `INSERT INTO insumos (nombre, unidad_medida, costo_unitario, stock_actual, stock_minimo, stock_inicial) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [ins.nombre, ins.unidad, ins.costo, ins.stock, ins.min, ins.stock]
    );
  }
  const productos = [
    {
      nombre: "Baguette Tradicional Francesa",
      descripcion: "Corteza crujiente dorada y miga alveolada con 24h de fermentaci\xF3n lenta.",
      precio: 3500,
      categoria: "Pan R\xFAstico",
      imagen_url: "/images/pan_estrella_1.jpg",
      stock_disponible: 32
    },
    {
      nombre: "Pan Campesino de Masa Madre",
      descripcion: "Hogaza r\xFAstica 100% masa madre con gre\xF1a pronunciada y acidez equilibrada.",
      precio: 15e3,
      categoria: "Especiales",
      imagen_url: "/images/pan_estrella_2.jpg",
      stock_disponible: 18
    },
    {
      nombre: "Croissant Franc\xE9s de Mantequilla",
      descripcion: "Hojaldre artesanal con mantequilla pura al 82%, capas finas y esponjosas.",
      precio: 5500,
      categoria: "Boller\xEDa / Dulce",
      imagen_url: "/images/pan_estrella_3.jpg",
      stock_disponible: 25
    },
    {
      nombre: "Ciabatta R\xFAstica de Aceite de Oliva",
      descripcion: "Pan italiano de alta hidrataci\xF3n con aceite de oliva virgen extra y miga abierta.",
      precio: 4800,
      categoria: "Pan Blanco",
      imagen_url: "/images/pan_estrella_4.jpg",
      stock_disponible: 22
    },
    {
      nombre: "Pan Brioche / Blandito Artesanal",
      descripcion: "Pan suave y esponjoso dorado al huevo, ideal para s\xE1ndwich y hamburguesas.",
      precio: 2500,
      categoria: "Pan Blanco",
      imagen_url: "/images/pan_estrella_5.jpg",
      stock_disponible: 30
    },
    {
      nombre: "Pan Especial de la Casa La Estrella",
      descripcion: "Receta insignia con corteza caramelizada, toque de mantequilla y semillas.",
      precio: 4200,
      categoria: "Especiales",
      imagen_url: "/images/pan_estrella_6.jpg",
      stock_disponible: 24
    }
  ];
  for (const prod of productos) {
    db.run(
      `INSERT INTO productos (nombre, descripcion, precio, categoria, imagen_url, stock_disponible)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [prod.nombre, prod.descripcion, prod.precio, prod.categoria, prod.imagen_url, prod.stock_disponible]
    );
  }
  const recetas = [
    // Baguette
    { producto_id: 1, insumo_id: 1, cantidad: 0.3 },
    // 300g harina ($1.260)
    { producto_id: 1, insumo_id: 2, cantidad: 5e-3 },
    // 5g levadura ($90)
    { producto_id: 1, insumo_id: 5, cantidad: 6e-3 },
    // 6g sal ($12)
    { producto_id: 1, insumo_id: 7, cantidad: 0.2 },
    // 200ml agua ($40)
    // Masa Madre (Hogaza 800g)
    { producto_id: 2, insumo_id: 1, cantidad: 0.55 },
    // 550g harina ($2.310)
    { producto_id: 2, insumo_id: 3, cantidad: 0.15 },
    // 150g masa madre ($750)
    { producto_id: 2, insumo_id: 5, cantidad: 0.012 },
    // 12g sal ($24)
    { producto_id: 2, insumo_id: 7, cantidad: 0.38 },
    // 380ml agua ($76)
    // Croissant
    { producto_id: 3, insumo_id: 1, cantidad: 0.08 },
    // 80g harina ($336)
    { producto_id: 3, insumo_id: 4, cantidad: 0.045 },
    // 45g mantequilla ($1.440)
    { producto_id: 3, insumo_id: 6, cantidad: 0.015 },
    // 15g azúcar ($69)
    { producto_id: 3, insumo_id: 2, cantidad: 3e-3 },
    // 3g levadura ($54)
    { producto_id: 3, insumo_id: 5, cantidad: 2e-3 },
    // 2g sal ($4)
    // Ciabatta
    { producto_id: 4, insumo_id: 1, cantidad: 0.35 },
    // 350g harina ($1.470)
    { producto_id: 4, insumo_id: 9, cantidad: 0.025 },
    // 25ml AOVE ($900)
    { producto_id: 4, insumo_id: 2, cantidad: 6e-3 },
    // 6g levadura ($108)
    { producto_id: 4, insumo_id: 5, cantidad: 7e-3 },
    // 7g sal ($14)
    { producto_id: 4, insumo_id: 7, cantidad: 0.28 },
    // 280ml agua ($56)
    // Pan Brioche / Blandito
    { producto_id: 5, insumo_id: 1, cantidad: 0.12 },
    // 120g harina ($504)
    { producto_id: 5, insumo_id: 4, cantidad: 0.015 },
    // 15g mantequilla ($480)
    { producto_id: 5, insumo_id: 2, cantidad: 3e-3 },
    // 3g levadura ($54)
    { producto_id: 5, insumo_id: 6, cantidad: 0.01 },
    // 10g azúcar ($46)
    { producto_id: 5, insumo_id: 5, cantidad: 2e-3 },
    // 2g sal ($4)
    // Pan Especial La Estrella
    { producto_id: 6, insumo_id: 1, cantidad: 0.28 },
    // 280g harina ($1.176)
    { producto_id: 6, insumo_id: 4, cantidad: 0.02 },
    // 20g mantequilla ($640)
    { producto_id: 6, insumo_id: 2, cantidad: 5e-3 },
    // 5g levadura ($90)
    { producto_id: 6, insumo_id: 5, cantidad: 5e-3 },
    // 5g sal ($10)
    { producto_id: 6, insumo_id: 7, cantidad: 0.18 }
    // 180ml agua ($36)
  ];
  for (const r of recetas) {
    db.run(
      `INSERT INTO recetas (producto_id, insumo_id, cantidad) VALUES (?, ?, ?)`,
      [r.producto_id, r.insumo_id, r.cantidad]
    );
  }
  const hoy = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
  const ayer = new Date(Date.now() - 864e5).toISOString().split("T")[0];
  const producciones = [
    { fecha: hoy, producto_id: 1, cant: 45, merma: 2, tanda: "Ma\xF1ana", panadero: "Carlos G\xF3mez" },
    { fecha: hoy, producto_id: 2, cant: 22, merma: 1, tanda: "Ma\xF1ana", panadero: "Carlos G\xF3mez" },
    { fecha: hoy, producto_id: 3, cant: 35, merma: 3, tanda: "Ma\xF1ana", panadero: "Marta Rivas" },
    { fecha: ayer, producto_id: 1, cant: 50, merma: 1, tanda: "Ma\xF1ana", panadero: "Carlos G\xF3mez" },
    { fecha: ayer, producto_id: 4, cant: 30, merma: 2, tanda: "Tarde", panadero: "Carlos G\xF3mez" }
  ];
  for (const p of producciones) {
    db.run(
      `INSERT INTO produccion (fecha, producto_id, cantidad_producida, merma_unidades, tanda, maestro_panadero, notas)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [p.fecha, p.producto_id, p.cant, p.merma, p.tanda, p.panadero, "Tanda est\xE1ndar horneada a 220\xB0C con vapor"]
    );
  }
  const ventasEjemplo = [
    {
      codigo: "TKT-20260929-001",
      fecha: `${ayer} 08:30:00`,
      subtotal: 21500,
      impuesto: 0,
      total: 21500,
      metodo: "Efectivo",
      costo_insumos: 6200,
      items: [
        { prod: 1, cant: 3, pUnit: 3500, cUnit: 1402 },
        { prod: 3, cant: 2, pUnit: 5500, cUnit: 1903 }
      ]
    },
    {
      codigo: "TKT-20260929-002",
      fecha: `${ayer} 11:15:00`,
      subtotal: 40300,
      impuesto: 0,
      total: 40300,
      metodo: "Tarjeta",
      costo_insumos: 11500,
      items: [
        { prod: 2, cant: 2, pUnit: 15e3, cUnit: 3160 },
        { prod: 4, cant: 1, pUnit: 4800, cUnit: 2548 },
        { prod: 3, cant: 1, pUnit: 5500, cUnit: 1903 }
      ]
    },
    {
      codigo: "TKT-20260930-001",
      fecha: `${hoy} 09:12:00`,
      subtotal: 22e3,
      impuesto: 0,
      total: 22e3,
      metodo: "Efectivo",
      costo_insumos: 5964,
      items: [
        { prod: 1, cant: 2, pUnit: 3500, cUnit: 1402 },
        { prod: 2, cant: 1, pUnit: 15e3, cUnit: 3160 }
      ]
    },
    {
      codigo: "TKT-20260930-002",
      fecha: `${hoy} 12:45:00`,
      subtotal: 35100,
      impuesto: 0,
      total: 35100,
      metodo: "Transferencia",
      costo_insumos: 10400,
      items: [
        { prod: 3, cant: 4, pUnit: 5500, cUnit: 1903 },
        { prod: 4, cant: 2, pUnit: 4800, cUnit: 2548 },
        { prod: 1, cant: 1, pUnit: 3500, cUnit: 1402 }
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
    const ventaId = ventaIdRes[0].values[0][0];
    for (const item of v.items) {
      db.run(
        `INSERT INTO detalle_ventas (venta_id, producto_id, cantidad, precio_unitario, subtotal, costo_unitario_insumos)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [ventaId, item.prod, item.cant, item.pUnit, item.cant * item.pUnit, item.cUnit]
      );
    }
  }
}

// src/server/routes.ts
var apiRouter = Router();
async function executeQuery(sql, params = []) {
  const db = await getDatabase();
  const stmt = db.prepare(sql);
  if (params.length > 0) {
    stmt.bind(params);
  }
  const results = [];
  while (stmt.step()) {
    results.push(stmt.getAsObject());
  }
  stmt.free();
  return results;
}
apiRouter.get("/productos", async (req, res) => {
  try {
    const db = await getDatabase();
    const productos = await executeQuery(`
      SELECT p.*,
        (
          SELECT COALESCE(SUM(r.cantidad * i.costo_unitario), 0)
          FROM recetas r
          JOIN insumos i ON r.insumo_id = i.id
          WHERE r.producto_id = p.id
        ) as costo_produccion_unitario
      FROM productos p
      WHERE p.activo = 1
      ORDER BY p.id ASC
    `);
    const recetas = await executeQuery(`
      SELECT r.id, r.producto_id, r.insumo_id, r.cantidad,
             i.nombre as insumo_nombre, i.unidad_medida, i.costo_unitario
      FROM recetas r
      JOIN insumos i ON r.insumo_id = i.id
    `);
    const productosConRecetas = productos.map((p) => ({
      ...p,
      precio: Number(p.precio),
      costo_produccion_unitario: Number(Number(p.costo_produccion_unitario).toFixed(3)),
      stock_disponible: Number(p.stock_disponible),
      receta: recetas.filter((r) => r.producto_id === p.id).map((r) => ({
        ...r,
        cantidad: Number(r.cantidad),
        costo_unitario: Number(r.costo_unitario),
        subtotal_costo: Number((r.cantidad * r.costo_unitario).toFixed(3))
      }))
    }));
    res.json(productosConRecetas);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
apiRouter.post("/productos", async (req, res) => {
  try {
    const { nombre, descripcion, precio, categoria, imagen_url, stock_disponible, ingredientes } = req.body;
    if (!nombre || precio === void 0) {
      return res.status(400).json({ error: "Nombre y precio son requeridos" });
    }
    const db = await getDatabase();
    db.run(
      `INSERT INTO productos (nombre, descripcion, precio, categoria, imagen_url, stock_disponible)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [nombre, descripcion || "", Number(precio), categoria || "Pan R\xFAstico", imagen_url || "", Number(stock_disponible || 0)]
    );
    const idRes = db.exec("SELECT last_insert_rowid() as id");
    const newId = idRes[0].values[0][0];
    if (Array.isArray(ingredientes) && ingredientes.length > 0) {
      for (const ing of ingredientes) {
        if (ing.insumo_id && ing.cantidad > 0) {
          db.run(
            `INSERT INTO recetas (producto_id, insumo_id, cantidad) VALUES (?, ?, ?)`,
            [newId, Number(ing.insumo_id), Number(ing.cantidad)]
          );
        }
      }
    }
    saveDatabase();
    res.status(201).json({ id: newId, message: "Producto creado exitosamente" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
apiRouter.put("/productos/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, descripcion, precio, categoria, imagen_url, stock_disponible, ingredientes } = req.body;
    const db = await getDatabase();
    db.run(
      `UPDATE productos 
       SET nombre = ?, descripcion = ?, precio = ?, categoria = ?, imagen_url = ?, stock_disponible = ?
       WHERE id = ?`,
      [nombre, descripcion, Number(precio), categoria, imagen_url, Number(stock_disponible), Number(id)]
    );
    if (Array.isArray(ingredientes)) {
      db.run("DELETE FROM recetas WHERE producto_id = ?", [Number(id)]);
      for (const ing of ingredientes) {
        if (ing.insumo_id && ing.cantidad > 0) {
          db.run(
            `INSERT INTO recetas (producto_id, insumo_id, cantidad) VALUES (?, ?, ?)`,
            [Number(id), Number(ing.insumo_id), Number(ing.cantidad)]
          );
        }
      }
    }
    saveDatabase();
    res.json({ message: "Producto actualizado exitosamente" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
apiRouter.delete("/productos/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const db = await getDatabase();
    db.run("UPDATE productos SET activo = 0 WHERE id = ?", [Number(id)]);
    saveDatabase();
    res.json({ message: "Producto desactivado" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
apiRouter.get("/insumos", async (req, res) => {
  try {
    const insumos = await executeQuery(`
      SELECT i.*,
        CASE
          WHEN i.stock_actual <= i.stock_minimo THEN 'critico'
          WHEN i.stock_actual <= (i.stock_minimo * 1.3) THEN 'advertencia'
          ELSE 'normal'
        END as estado_alerta
      FROM insumos i
      ORDER BY 
        CASE 
          WHEN i.stock_actual <= i.stock_minimo THEN 1
          WHEN i.stock_actual <= (i.stock_minimo * 1.3) THEN 2
          ELSE 3
        END, i.nombre ASC
    `);
    res.json(insumos.map((i) => ({
      ...i,
      costo_unitario: Number(i.costo_unitario),
      stock_actual: Number(Number(i.stock_actual).toFixed(2)),
      stock_minimo: Number(i.stock_minimo),
      stock_inicial: Number(i.stock_inicial)
    })));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
apiRouter.post("/insumos", async (req, res) => {
  try {
    const { nombre, unidad_medida, costo_unitario, stock_actual, stock_minimo } = req.body;
    if (!nombre || !unidad_medida || costo_unitario === void 0) {
      return res.status(400).json({ error: "Nombre, unidad de medida y costo son requeridos" });
    }
    const db = await getDatabase();
    const stock = Number(stock_actual || 0);
    db.run(
      `INSERT INTO insumos (nombre, unidad_medida, costo_unitario, stock_actual, stock_minimo, stock_inicial)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [nombre, unidad_medida, Number(costo_unitario), stock, Number(stock_minimo || 5), stock]
    );
    saveDatabase();
    res.status(201).json({ message: "Insumo creado con \xE9xito" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
apiRouter.put("/insumos/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, unidad_medida, costo_unitario, stock_actual, stock_minimo } = req.body;
    const db = await getDatabase();
    db.run(
      `UPDATE insumos
       SET nombre = ?, unidad_medida = ?, costo_unitario = ?, stock_actual = ?, stock_minimo = ?
       WHERE id = ?`,
      [nombre, unidad_medida, Number(costo_unitario), Number(stock_actual), Number(stock_minimo), Number(id)]
    );
    saveDatabase();
    res.json({ message: "Insumo actualizado con \xE9xito" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
apiRouter.post("/insumos/:id/restock", async (req, res) => {
  try {
    const { id } = req.params;
    const { cantidad, motivo } = req.body;
    const cantNum = Number(cantidad);
    if (!cantNum || cantNum <= 0) {
      return res.status(400).json({ error: "Cantidad inv\xE1lida para reabastecer" });
    }
    const db = await getDatabase();
    const current = await executeQuery("SELECT stock_actual, nombre FROM insumos WHERE id = ?", [Number(id)]);
    if (current.length === 0) return res.status(404).json({ error: "Insumo no encontrado" });
    const newStock = Number(current[0].stock_actual) + cantNum;
    db.run("UPDATE insumos SET stock_actual = ? WHERE id = ?", [newStock, Number(id)]);
    const ahora = (/* @__PURE__ */ new Date()).toISOString().replace("T", " ").substring(0, 19);
    db.run(
      `INSERT INTO movimientos_inventario (fecha, insumo_id, tipo, cantidad, stock_resultante, motivo)
       VALUES (?, ?, 'REABASTECIMIENTO', ?, ?, ?)`,
      [ahora, Number(id), cantNum, newStock, motivo || "Compra/Reabastecimiento regular"]
    );
    saveDatabase();
    res.json({ message: `Insumo reabastecido (+${cantNum})`, stock_actual: newStock });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
apiRouter.post("/ventas", async (req, res) => {
  try {
    const { items, metodo_pago = "Efectivo", aplicar_impuesto = false, cajero = "Caja Principal" } = req.body;
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "La comanda no tiene productos" });
    }
    const db = await getDatabase();
    const ahora = /* @__PURE__ */ new Date();
    const fechaStr = ahora.toISOString().replace("T", " ").substring(0, 19);
    const dateCode = ahora.toISOString().substring(0, 10).replace(/-/g, "");
    const randomSuffix = Math.floor(1e3 + Math.random() * 9e3);
    const codigoTicket = `TKT-${dateCode}-${randomSuffix}`;
    let subtotal = 0;
    let costoTotalInsumosVenta = 0;
    const processedItems = [];
    const insumosADescontar = /* @__PURE__ */ new Map();
    for (const item of items) {
      const prodRes = await executeQuery("SELECT * FROM productos WHERE id = ?", [Number(item.producto_id)]);
      if (prodRes.length === 0) continue;
      const prod = prodRes[0];
      const itemQty = Number(item.cantidad);
      const itemSubtotal = itemQty * Number(prod.precio);
      subtotal += itemSubtotal;
      const receta = await executeQuery(`
        SELECT r.insumo_id, r.cantidad, i.nombre, i.unidad_medida, i.costo_unitario, i.stock_actual
        FROM recetas r
        JOIN insumos i ON r.insumo_id = i.id
        WHERE r.producto_id = ?
      `, [prod.id]);
      let itemCostoUnitario = 0;
      for (const r of receta) {
        const insumoId = Number(r.insumo_id);
        const consumoTotalInsumo = Number(r.cantidad) * itemQty;
        itemCostoUnitario += Number(r.cantidad) * Number(r.costo_unitario);
        if (insumosADescontar.has(insumoId)) {
          const prev = insumosADescontar.get(insumoId);
          prev.cantidad += consumoTotalInsumo;
        } else {
          insumosADescontar.set(insumoId, {
            insumoId,
            nombre: r.nombre,
            cantidad: consumoTotalInsumo,
            unidad: r.unidad_medida,
            costo_unitario: Number(r.costo_unitario)
          });
        }
      }
      costoTotalInsumosVenta += itemCostoUnitario * itemQty;
      processedItems.push({
        producto_id: prod.id,
        nombre: prod.nombre,
        precio_unitario: Number(prod.precio),
        cantidad: itemQty,
        subtotal: itemSubtotal,
        costo_unitario_insumos: itemCostoUnitario
      });
    }
    const impuesto = aplicar_impuesto ? Number((subtotal * 0.16).toFixed(2)) : 0;
    const total = Number((subtotal + impuesto).toFixed(2));
    db.run(
      `INSERT INTO ventas (codigo_ticket, fecha, subtotal, impuesto, total, metodo_pago, costo_insumos_total, cajero)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [codigoTicket, fechaStr, subtotal, impuesto, total, metodo_pago, Number(costoTotalInsumosVenta.toFixed(3)), cajero]
    );
    const ventaIdRes = db.exec("SELECT last_insert_rowid() as id");
    const ventaId = ventaIdRes[0].values[0][0];
    for (const pi of processedItems) {
      db.run(
        `INSERT INTO detalle_ventas (venta_id, producto_id, cantidad, precio_unitario, subtotal, costo_unitario_insumos)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [ventaId, pi.producto_id, pi.cantidad, pi.precio_unitario, pi.subtotal, pi.costo_unitario_insumos]
      );
      db.run(
        `UPDATE productos SET stock_disponible = MAX(0, stock_disponible - ?) WHERE id = ?`,
        [pi.cantidad, pi.producto_id]
      );
    }
    const insumosDescontadosLog = [];
    for (const [insumoId, d] of insumosADescontar.entries()) {
      const insumoCurrent = await executeQuery("SELECT stock_actual FROM insumos WHERE id = ?", [insumoId]);
      const actualStock = insumoCurrent.length > 0 ? Number(insumoCurrent[0].stock_actual) : 0;
      const nuevoStock = Number(Math.max(0, actualStock - d.cantidad).toFixed(3));
      db.run(`UPDATE insumos SET stock_actual = ? WHERE id = ?`, [nuevoStock, insumoId]);
      db.run(
        `INSERT INTO movimientos_inventario (fecha, insumo_id, tipo, cantidad, stock_resultante, motivo, referencia_id)
         VALUES (?, ?, 'VENTA', ?, ?, ?, ?)`,
        [fechaStr, insumoId, -d.cantidad, nuevoStock, `Descuento autom\xE1tico por Venta #${codigoTicket}`, ventaId]
      );
      insumosDescontadosLog.push({
        insumo: d.nombre,
        descontado: Number(d.cantidad.toFixed(3)),
        unidad: d.unidad,
        stock_restante: nuevoStock
      });
    }
    saveDatabase();
    res.status(201).json({
      success: true,
      ticket: {
        id: ventaId,
        codigo_ticket: codigoTicket,
        fecha: fechaStr,
        cajero,
        metodo_pago,
        items: processedItems,
        subtotal: Number(subtotal.toFixed(2)),
        impuesto,
        total,
        costo_insumos: Number(costoTotalInsumosVenta.toFixed(2)),
        insumos_descontados: insumosDescontadosLog
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
apiRouter.get("/ventas", async (req, res) => {
  try {
    const limit = Number(req.query.limit || 50);
    const ventas = await executeQuery(`
      SELECT v.*,
        (SELECT COUNT(*) FROM detalle_ventas WHERE venta_id = v.id) as total_lineas,
        (SELECT SUM(cantidad) FROM detalle_ventas WHERE venta_id = v.id) as total_panes
      FROM ventas v
      ORDER BY v.id DESC
      LIMIT ?
    `, [limit]);
    res.json(ventas.map((v) => ({
      ...v,
      subtotal: Number(v.subtotal),
      impuesto: Number(v.impuesto),
      total: Number(v.total),
      costo_insumos_total: Number(v.costo_insumos_total),
      total_panes: Number(v.total_panes || 0)
    })));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
apiRouter.get("/ventas/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const venta = await executeQuery("SELECT * FROM ventas WHERE id = ?", [Number(id)]);
    if (venta.length === 0) return res.status(404).json({ error: "Ticket no encontrado" });
    const items = await executeQuery(`
      SELECT dv.*, p.nombre as producto_nombre, p.imagen_url
      FROM detalle_ventas dv
      JOIN productos p ON dv.producto_id = p.id
      WHERE dv.venta_id = ?
    `, [Number(id)]);
    res.json({
      ...venta[0],
      items
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
apiRouter.get("/produccion", async (req, res) => {
  try {
    const fecha = req.query.fecha;
    let sql = `
      SELECT p.*, prod.nombre as producto_nombre, prod.precio as producto_precio, prod.imagen_url
      FROM produccion p
      JOIN productos prod ON p.producto_id = prod.id
    `;
    const params = [];
    if (fecha) {
      sql += ` WHERE p.fecha = ?`;
      params.push(fecha);
    }
    sql += ` ORDER BY p.id DESC LIMIT 50`;
    const registros = await executeQuery(sql, params);
    res.json(registros);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
apiRouter.post("/produccion", async (req, res) => {
  try {
    const { producto_id, cantidad_producida, merma_unidades = 0, maestro_panadero, tanda, notas, fecha } = req.body;
    if (!producto_id || !cantidad_producida) {
      return res.status(400).json({ error: "Producto y cantidad producida son requeridos" });
    }
    const db = await getDatabase();
    const hoy = fecha || (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
    const cantNum = Number(cantidad_producida);
    const mermaNum = Number(merma_unidades);
    const prodId = Number(producto_id);
    db.run(
      `INSERT INTO produccion (fecha, producto_id, cantidad_producida, merma_unidades, maestro_panadero, tanda, notas)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [hoy, prodId, cantNum, mermaNum, maestro_panadero || "Maestro Panadero", tanda || "Ma\xF1ana", notas || ""]
    );
    const netUnits = Math.max(0, cantNum - mermaNum);
    db.run(`UPDATE productos SET stock_disponible = stock_disponible + ? WHERE id = ?`, [netUnits, prodId]);
    saveDatabase();
    res.status(201).json({ message: "Producci\xF3n registrada exitosamente", unidades_netas: netUnits });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
apiRouter.get("/reportes/produccion-inventario", async (req, res) => {
  try {
    const insumos = await executeQuery(`
      SELECT i.*,
        -- Total consumido por ventas registradas
        COALESCE((
          SELECT SUM(dv.cantidad * r.cantidad)
          FROM detalle_ventas dv
          JOIN recetas r ON dv.producto_id = r.producto_id
          WHERE r.insumo_id = i.id
        ), 0) as consumido_por_ventas,

        -- Total consumido seg\xFAn producci\xF3n registrada
        COALESCE((
          SELECT SUM(p.cantidad_producida * r.cantidad)
          FROM produccion p
          JOIN recetas r ON p.producto_id = r.producto_id
          WHERE r.insumo_id = i.id
        ), 0) as consumo_teorico_produccion,

        -- Merma de insumos asociada a mermas de producci\xF3n
        COALESCE((
          SELECT SUM(p.merma_unidades * r.cantidad)
          FROM produccion p
          JOIN recetas r ON p.producto_id = r.producto_id
          WHERE r.insumo_id = i.id
        ), 0) as merma_insumo_estimada,

        -- Reabastecimientos registrados
        COALESCE((
          SELECT SUM(m.cantidad)
          FROM movimientos_inventario m
          WHERE m.insumo_id = i.id AND m.tipo = 'REABASTECIMIENTO'
        ), 0) as total_reabastecido
      FROM insumos i
      ORDER BY i.nombre ASC
    `);
    const contraste = insumos.map((i) => {
      const stockInicial = Number(i.stock_inicial || 0);
      const stockActual = Number(i.stock_actual);
      const stockMinimo = Number(i.stock_minimo);
      const consumidoVentas = Number(Number(i.consumido_por_ventas).toFixed(3));
      const consumoProduccion = Number(Number(i.consumo_teorico_produccion).toFixed(3));
      const mermaEstimada = Number(Number(i.merma_insumo_estimada).toFixed(3));
      const reabastecido = Number(Number(i.total_reabastecido).toFixed(3));
      const stockEsperado = stockInicial + reabastecido - consumoProduccion;
      const discrepancia = Number((stockActual - stockEsperado).toFixed(3));
      let nivelAlerta = "normal";
      if (stockActual <= stockMinimo) {
        nivelAlerta = "critico";
      } else if (stockActual <= stockMinimo * 1.3) {
        nivelAlerta = "advertencia";
      }
      return {
        id: i.id,
        nombre: i.nombre,
        unidad_medida: i.unidad_medida,
        costo_unitario: Number(i.costo_unitario),
        stock_inicial: stockInicial,
        stock_actual: stockActual,
        stock_minimo: stockMinimo,
        consumido_por_ventas: consumidoVentas,
        consumo_teorico_produccion: consumoProduccion,
        merma_estimada: mermaEstimada,
        reabastecido,
        discrepancia,
        nivel_alerta: nivelAlerta
      };
    });
    res.json(contraste);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
apiRouter.get("/reportes/dashboard", async (req, res) => {
  try {
    const periodo = req.query.periodo || "todo";
    const hoyStr = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
    let dateFilter = "";
    if (periodo === "hoy") {
      dateFilter = `WHERE DATE(fecha) = DATE('${hoyStr}')`;
    } else if (periodo === "semana") {
      dateFilter = `WHERE DATE(fecha) >= DATE('${hoyStr}', '-7 days')`;
    } else if (periodo === "mes") {
      dateFilter = `WHERE DATE(fecha) >= DATE('${hoyStr}', '-30 days')`;
    }
    const balanceRes = await executeQuery(`
      SELECT 
        COUNT(id) as total_transacciones,
        COALESCE(SUM(total), 0) as total_ventas_dinero,
        COALESCE(SUM(subtotal), 0) as subtotal_ventas,
        COALESCE(SUM(impuesto), 0) as total_impuestos,
        COALESCE(SUM(costo_insumos_total), 0) as costo_total_insumos
      FROM ventas
      ${dateFilter}
    `);
    const unidadesRes = await executeQuery(`
      SELECT COALESCE(SUM(dv.cantidad), 0) as total_panes_vendidos
      FROM detalle_ventas dv
      JOIN ventas v ON dv.venta_id = v.id
      ${dateFilter ? dateFilter.replace("fecha", "v.fecha") : ""}
    `);
    const topProductos = await executeQuery(`
      SELECT p.id, p.nombre, p.categoria, p.imagen_url, p.precio,
        SUM(dv.cantidad) as unidades_vendidas,
        SUM(dv.subtotal) as ingresos_generados,
        SUM(dv.cantidad * dv.costo_unitario_insumos) as costo_insumos_acumulado
      FROM detalle_ventas dv
      JOIN productos p ON dv.producto_id = p.id
      JOIN ventas v ON dv.venta_id = v.id
      ${dateFilter ? dateFilter.replace("fecha", "v.fecha") : ""}
      GROUP BY p.id
      ORDER BY unidades_vendidas DESC
      LIMIT 5
    `);
    const ventasPorDia = await executeQuery(`
      SELECT 
        SUBSTR(fecha, 1, 10) as dia,
        COUNT(id) as cantidad_ventas,
        COALESCE(SUM(total), 0) as total_dinero,
        COALESCE(SUM(costo_insumos_total), 0) as costo_insumos
      FROM ventas
      GROUP BY SUBSTR(fecha, 1, 10)
      ORDER BY dia DESC
      LIMIT 10
    `);
    const metodosPago = await executeQuery(`
      SELECT metodo_pago, COUNT(id) as count, COALESCE(SUM(total), 0) as total
      FROM ventas
      ${dateFilter}
      GROUP BY metodo_pago
    `);
    const produccionRes = await executeQuery(`
      SELECT 
        COALESCE(SUM(cantidad_producida), 0) as total_producido,
        COALESCE(SUM(merma_unidades), 0) as total_merma
      FROM produccion
    `);
    const balance = balanceRes[0];
    const totalVentas = Number(balance.total_ventas_dinero || 0);
    const costoInsumos = Number(balance.costo_total_insumos || 0);
    const gananciaBruta = totalVentas - costoInsumos;
    const margenPorcentaje = totalVentas > 0 ? Number((gananciaBruta / totalVentas * 100).toFixed(1)) : 0;
    const ticketPromedio = Number(balance.total_transacciones) > 0 ? Number((totalVentas / Number(balance.total_transacciones)).toFixed(2)) : 0;
    res.json({
      periodo,
      metricas: {
        total_ventas: Number(totalVentas.toFixed(2)),
        total_transacciones: Number(balance.total_transacciones || 0),
        total_panes_vendidos: Number(unidadesRes[0]?.total_panes_vendidos || 0),
        costo_total_insumos: Number(costoInsumos.toFixed(2)),
        ganancia_bruta: Number(gananciaBruta.toFixed(2)),
        margen_porcentaje: margenPorcentaje,
        ticket_promedio: ticketPromedio,
        total_producido: Number(produccionRes[0]?.total_producido || 0),
        total_merma: Number(produccionRes[0]?.total_merma || 0)
      },
      top_productos: topProductos.map((tp) => ({
        ...tp,
        unidades_vendidas: Number(tp.unidades_vendidas),
        ingresos_generados: Number(Number(tp.ingresos_generados).toFixed(2)),
        costo_insumos_acumulado: Number(Number(tp.costo_insumos_acumulado).toFixed(2)),
        margen_estimado: Number(tp.ingresos_generados) > 0 ? Number(((Number(tp.ingresos_generados) - Number(tp.costo_insumos_acumulado)) / Number(tp.ingresos_generados) * 100).toFixed(1)) : 0
      })),
      ventas_por_dia: ventasPorDia.reverse().map((vpd) => ({
        ...vpd,
        total_dinero: Number(Number(vpd.total_dinero).toFixed(2)),
        costo_insumos: Number(Number(vpd.costo_insumos).toFixed(2)),
        ganancia: Number((Number(vpd.total_dinero) - Number(vpd.costo_insumos)).toFixed(2))
      })),
      metodos_pago: metodosPago.map((mp) => ({
        ...mp,
        count: Number(mp.count),
        total: Number(Number(mp.total).toFixed(2))
      }))
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// server.ts
var __filename2 = fileURLToPath2(import.meta.url);
var __dirname2 = path2.dirname(__filename2);
async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3e3;
  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ extended: true, limit: "10mb" }));
  try {
    await getDatabase();
    console.log("\u2713 SQLite Database initialized successfully");
  } catch (err) {
    console.error("Failed to initialize database:", err);
  }
  app.use("/api", apiRouter);
  if (process.env.NODE_ENV === "production") {
    const distPath = path2.resolve(__dirname2, "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path2.resolve(distPath, "index.html"));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`\u2713 PanArte Bakery Server ready on http://0.0.0.0:${PORT}`);
  });
}
startServer().catch((err) => {
  console.error("Server startup error:", err);
});
