import { Router, Request, Response } from 'express';
import { getDatabase, saveDatabase } from './db.js';

export const apiRouter = Router();

// Helper to run query and return array of objects
function queryAll<T = any>(sql: string, params: any[] = []): T[] {
  // Synchronous execution using cached DB instance
  throw new Error('Use async query helper');
}

async function executeQuery<T = any>(sql: string, params: any[] = []): Promise<T[]> {
  const db = await getDatabase();
  const stmt = db.prepare(sql);
  if (params.length > 0) {
    stmt.bind(params);
  }
  const results: T[] = [];
  while (stmt.step()) {
    results.push(stmt.getAsObject() as T);
  }
  stmt.free();
  return results;
}

// -------------------------------------------------------------
// MÓDULO 1 & 4: PRODUCTOS
// -------------------------------------------------------------
apiRouter.get('/productos', async (req: Request, res: Response) => {
  try {
    const db = await getDatabase();
    // Query products
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

    // Get recipes for each product
    const recetas = await executeQuery(`
      SELECT r.id, r.producto_id, r.insumo_id, r.cantidad,
             i.nombre as insumo_nombre, i.unidad_medida, i.costo_unitario
      FROM recetas r
      JOIN insumos i ON r.insumo_id = i.id
    `);

    const productosConRecetas = productos.map(p => ({
      ...p,
      precio: Number(p.precio),
      costo_produccion_unitario: Number(Number(p.costo_produccion_unitario).toFixed(3)),
      stock_disponible: Number(p.stock_disponible),
      receta: recetas.filter(r => r.producto_id === p.id).map(r => ({
        ...r,
        cantidad: Number(r.cantidad),
        costo_unitario: Number(r.costo_unitario),
        subtotal_costo: Number((r.cantidad * r.costo_unitario).toFixed(3))
      }))
    }));

    res.json(productosConRecetas);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

apiRouter.post('/productos', async (req: Request, res: Response) => {
  try {
    const { nombre, descripcion, precio, categoria, imagen_url, stock_disponible, ingredientes } = req.body;
    if (!nombre || precio === undefined) {
      return res.status(400).json({ error: 'Nombre y precio son requeridos' });
    }

    const db = await getDatabase();
    db.run(
      `INSERT INTO productos (nombre, descripcion, precio, categoria, imagen_url, stock_disponible)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [nombre, descripcion || '', Number(precio), categoria || 'Pan Rústico', imagen_url || '', Number(stock_disponible || 0)]
    );

    const idRes = db.exec('SELECT last_insert_rowid() as id');
    const newId = idRes[0].values[0][0] as number;

    // Insert recipes if provided
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
    res.status(201).json({ id: newId, message: 'Producto creado exitosamente' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

apiRouter.put('/productos/:id', async (req: Request, res: Response) => {
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

    // Update recipes if provided
    if (Array.isArray(ingredientes)) {
      db.run('DELETE FROM recetas WHERE producto_id = ?', [Number(id)]);
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
    res.json({ message: 'Producto actualizado exitosamente' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

apiRouter.delete('/productos/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const db = await getDatabase();
    db.run('UPDATE productos SET activo = 0 WHERE id = ?', [Number(id)]);
    saveDatabase();
    res.json({ message: 'Producto desactivado' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// -------------------------------------------------------------
// MÓDULO 2 & 4: INSUMOS (Materia Prima)
// -------------------------------------------------------------
apiRouter.get('/insumos', async (req: Request, res: Response) => {
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

    res.json(insumos.map(i => ({
      ...i,
      costo_unitario: Number(i.costo_unitario),
      stock_actual: Number(Number(i.stock_actual).toFixed(2)),
      stock_minimo: Number(i.stock_minimo),
      stock_inicial: Number(i.stock_inicial)
    })));
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

apiRouter.post('/insumos', async (req: Request, res: Response) => {
  try {
    const { nombre, unidad_medida, costo_unitario, stock_actual, stock_minimo } = req.body;
    if (!nombre || !unidad_medida || costo_unitario === undefined) {
      return res.status(400).json({ error: 'Nombre, unidad de medida y costo son requeridos' });
    }

    const db = await getDatabase();
    const stock = Number(stock_actual || 0);
    db.run(
      `INSERT INTO insumos (nombre, unidad_medida, costo_unitario, stock_actual, stock_minimo, stock_inicial)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [nombre, unidad_medida, Number(costo_unitario), stock, Number(stock_minimo || 5), stock]
    );

    saveDatabase();
    res.status(201).json({ message: 'Insumo creado con éxito' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

apiRouter.put('/insumos/:id', async (req: Request, res: Response) => {
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
    res.json({ message: 'Insumo actualizado con éxito' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Reabastecimiento rápido de insumo
apiRouter.post('/insumos/:id/restock', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { cantidad, motivo } = req.body;
    const cantNum = Number(cantidad);
    if (!cantNum || cantNum <= 0) {
      return res.status(400).json({ error: 'Cantidad inválida para reabastecer' });
    }

    const db = await getDatabase();
    const current = await executeQuery('SELECT stock_actual, nombre FROM insumos WHERE id = ?', [Number(id)]);
    if (current.length === 0) return res.status(404).json({ error: 'Insumo no encontrado' });

    const newStock = Number(current[0].stock_actual) + cantNum;
    db.run('UPDATE insumos SET stock_actual = ? WHERE id = ?', [newStock, Number(id)]);

    const ahora = new Date().toISOString().replace('T', ' ').substring(0, 19);
    db.run(
      `INSERT INTO movimientos_inventario (fecha, insumo_id, tipo, cantidad, stock_resultante, motivo)
       VALUES (?, ?, 'REABASTECIMIENTO', ?, ?, ?)`,
      [ahora, Number(id), cantNum, newStock, motivo || 'Compra/Reabastecimiento regular']
    );

    saveDatabase();
    res.json({ message: `Insumo reabastecido (+${cantNum})`, stock_actual: newStock });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// -------------------------------------------------------------
// MÓDULO 1: PUNTO DE VENTA (REGISTRAR VENTA Y DESCUENTO AUTOMÁTICO)
// -------------------------------------------------------------
apiRouter.post('/ventas', async (req: Request, res: Response) => {
  try {
    const { items, metodo_pago = 'Efectivo', aplicar_impuesto = false, cajero = 'Caja Principal' } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'La comanda no tiene productos' });
    }

    const db = await getDatabase();
    const ahora = new Date();
    const fechaStr = ahora.toISOString().replace('T', ' ').substring(0, 19);
    const dateCode = ahora.toISOString().substring(0, 10).replace(/-/g, '');
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const codigoTicket = `TKT-${dateCode}-${randomSuffix}`;

    // Calculate totals and cost of ingredients
    let subtotal = 0;
    let costoTotalInsumosVenta = 0;
    const processedItems: any[] = [];
    const insumosADescontar: Map<number, { insumoId: number; nombre: string; cantidad: number; unidad: string; costo_unitario: number }> = new Map();

    for (const item of items) {
      const prodRes = await executeQuery('SELECT * FROM productos WHERE id = ?', [Number(item.producto_id)]);
      if (prodRes.length === 0) continue;
      const prod = prodRes[0];

      const itemQty = Number(item.cantidad);
      const itemSubtotal = itemQty * Number(prod.precio);
      subtotal += itemSubtotal;

      // Look up recipe
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
          const prev = insumosADescontar.get(insumoId)!;
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

    // 1. Insert header
    db.run(
      `INSERT INTO ventas (codigo_ticket, fecha, subtotal, impuesto, total, metodo_pago, costo_insumos_total, cajero)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [codigoTicket, fechaStr, subtotal, impuesto, total, metodo_pago, Number(costoTotalInsumosVenta.toFixed(3)), cajero]
    );

    const ventaIdRes = db.exec('SELECT last_insert_rowid() as id');
    const ventaId = ventaIdRes[0].values[0][0] as number;

    // 2. Insert line items & reduce finished goods stock
    for (const pi of processedItems) {
      db.run(
        `INSERT INTO detalle_ventas (venta_id, producto_id, cantidad, precio_unitario, subtotal, costo_unitario_insumos)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [ventaId, pi.producto_id, pi.cantidad, pi.precio_unitario, pi.subtotal, pi.costo_unitario_insumos]
      );

      // Decrement product ready stock (min 0)
      db.run(
        `UPDATE productos SET stock_disponible = MAX(0, stock_disponible - ?) WHERE id = ?`,
        [pi.cantidad, pi.producto_id]
      );
    }

    // 3. DESCUENTO AUTOMÁTICO DE INSUMOS SEGÚN RECETA
    const insumosDescontadosLog: any[] = [];
    for (const [insumoId, d] of insumosADescontar.entries()) {
      const insumoCurrent = await executeQuery('SELECT stock_actual FROM insumos WHERE id = ?', [insumoId]);
      const actualStock = insumoCurrent.length > 0 ? Number(insumoCurrent[0].stock_actual) : 0;
      const nuevoStock = Number(Math.max(0, actualStock - d.cantidad).toFixed(3));

      db.run(`UPDATE insumos SET stock_actual = ? WHERE id = ?`, [nuevoStock, insumoId]);

      db.run(
        `INSERT INTO movimientos_inventario (fecha, insumo_id, tipo, cantidad, stock_resultante, motivo, referencia_id)
         VALUES (?, ?, 'VENTA', ?, ?, ?, ?)`,
        [fechaStr, insumoId, -d.cantidad, nuevoStock, `Descuento automático por Venta #${codigoTicket}`, ventaId]
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
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

apiRouter.get('/ventas', async (req: Request, res: Response) => {
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

    res.json(ventas.map(v => ({
      ...v,
      subtotal: Number(v.subtotal),
      impuesto: Number(v.impuesto),
      total: Number(v.total),
      costo_insumos_total: Number(v.costo_insumos_total),
      total_panes: Number(v.total_panes || 0)
    })));
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Detalle de un ticket específico
apiRouter.get('/ventas/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const venta = await executeQuery('SELECT * FROM ventas WHERE id = ?', [Number(id)]);
    if (venta.length === 0) return res.status(404).json({ error: 'Ticket no encontrado' });

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
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// -------------------------------------------------------------
// MÓDULO 2: PRODUCCIÓN DIARIA & CONTRASTE DE INVENTARIOS
// -------------------------------------------------------------
apiRouter.get('/produccion', async (req: Request, res: Response) => {
  try {
    const fecha = req.query.fecha as string;
    let sql = `
      SELECT p.*, prod.nombre as producto_nombre, prod.precio as producto_precio, prod.imagen_url
      FROM produccion p
      JOIN productos prod ON p.producto_id = prod.id
    `;
    const params: any[] = [];
    if (fecha) {
      sql += ` WHERE p.fecha = ?`;
      params.push(fecha);
    }
    sql += ` ORDER BY p.id DESC LIMIT 50`;

    const registros = await executeQuery(sql, params);
    res.json(registros);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

apiRouter.post('/produccion', async (req: Request, res: Response) => {
  try {
    const { producto_id, cantidad_producida, merma_unidades = 0, maestro_panadero, tanda, notas, fecha } = req.body;
    if (!producto_id || !cantidad_producida) {
      return res.status(400).json({ error: 'Producto y cantidad producida son requeridos' });
    }

    const db = await getDatabase();
    const hoy = fecha || new Date().toISOString().split('T')[0];
    const cantNum = Number(cantidad_producida);
    const mermaNum = Number(merma_unidades);
    const prodId = Number(producto_id);

    db.run(
      `INSERT INTO produccion (fecha, producto_id, cantidad_producida, merma_unidades, maestro_panadero, tanda, notas)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [hoy, prodId, cantNum, mermaNum, maestro_panadero || 'Maestro Panadero', tanda || 'Mañana', notas || '']
    );

    // Increase product stock (produced units minus waste)
    const netUnits = Math.max(0, cantNum - mermaNum);
    db.run(`UPDATE productos SET stock_disponible = stock_disponible + ? WHERE id = ?`, [netUnits, prodId]);

    saveDatabase();
    res.status(201).json({ message: 'Producción registrada exitosamente', unidades_netas: netUnits });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Contraste Dinámico de Inventario de Insumos:
// [Inventario Inicial] vs [Insumos Consumidos por Ventas] vs [Producción Real / Consumo Teórico] vs [Stock Actual] vs [Merma Estimada]
apiRouter.get('/reportes/produccion-inventario', async (req: Request, res: Response) => {
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

        -- Total consumido según producción registrada
        COALESCE((
          SELECT SUM(p.cantidad_producida * r.cantidad)
          FROM produccion p
          JOIN recetas r ON p.producto_id = r.producto_id
          WHERE r.insumo_id = i.id
        ), 0) as consumo_teorico_produccion,

        -- Merma de insumos asociada a mermas de producción
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

    const contraste = insumos.map(i => {
      const stockInicial = Number(i.stock_inicial || 0);
      const stockActual = Number(i.stock_actual);
      const stockMinimo = Number(i.stock_minimo);
      const consumidoVentas = Number(Number(i.consumido_por_ventas).toFixed(3));
      const consumoProduccion = Number(Number(i.consumo_teorico_produccion).toFixed(3));
      const mermaEstimada = Number(Number(i.merma_insumo_estimada).toFixed(3));
      const reabastecido = Number(Number(i.total_reabastecido).toFixed(3));

      // Diferencia / balance: (Stock Inicial + Reabastecido - Consumo Producción) vs Stock Actual
      const stockEsperado = stockInicial + reabastecido - consumoProduccion;
      const discrepancia = Number((stockActual - stockEsperado).toFixed(3));

      // Stock Alert
      let nivelAlerta: 'critico' | 'advertencia' | 'normal' = 'normal';
      if (stockActual <= stockMinimo) {
        nivelAlerta = 'critico';
      } else if (stockActual <= stockMinimo * 1.3) {
        nivelAlerta = 'advertencia';
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
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// -------------------------------------------------------------
// MÓDULO 3: DASHBOARD Y REPORTES FINANCIEROS
// -------------------------------------------------------------
apiRouter.get('/reportes/dashboard', async (req: Request, res: Response) => {
  try {
    const periodo = (req.query.periodo as string) || 'todo'; // 'hoy', 'semana', 'mes', 'todo'
    const hoyStr = new Date().toISOString().split('T')[0];

    // Filter condition
    let dateFilter = '';
    if (periodo === 'hoy') {
      dateFilter = `WHERE DATE(fecha) = DATE('${hoyStr}')`;
    } else if (periodo === 'semana') {
      dateFilter = `WHERE DATE(fecha) >= DATE('${hoyStr}', '-7 days')`;
    } else if (periodo === 'mes') {
      dateFilter = `WHERE DATE(fecha) >= DATE('${hoyStr}', '-30 days')`;
    }

    // 1. Balance metrics
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

    // Total units of bread sold
    const unidadesRes = await executeQuery(`
      SELECT COALESCE(SUM(dv.cantidad), 0) as total_panes_vendidos
      FROM detalle_ventas dv
      JOIN ventas v ON dv.venta_id = v.id
      ${dateFilter ? dateFilter.replace('fecha', 'v.fecha') : ''}
    `);

    // Top selling products
    const topProductos = await executeQuery(`
      SELECT p.id, p.nombre, p.categoria, p.imagen_url, p.precio,
        SUM(dv.cantidad) as unidades_vendidas,
        SUM(dv.subtotal) as ingresos_generados,
        SUM(dv.cantidad * dv.costo_unitario_insumos) as costo_insumos_acumulado
      FROM detalle_ventas dv
      JOIN productos p ON dv.producto_id = p.id
      JOIN ventas v ON dv.venta_id = v.id
      ${dateFilter ? dateFilter.replace('fecha', 'v.fecha') : ''}
      GROUP BY p.id
      ORDER BY unidades_vendidas DESC
      LIMIT 5
    `);

    // Sales by day (last 7 days or current period)
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

    // Payment methods breakdown
    const metodosPago = await executeQuery(`
      SELECT metodo_pago, COUNT(id) as count, COALESCE(SUM(total), 0) as total
      FROM ventas
      ${dateFilter}
      GROUP BY metodo_pago
    `);

    // Total production summary
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
    const margenPorcentaje = totalVentas > 0 ? Number(((gananciaBruta / totalVentas) * 100).toFixed(1)) : 0;
    const ticketPromedio = Number(balance.total_transacciones) > 0 
      ? Number((totalVentas / Number(balance.total_transacciones)).toFixed(2)) 
      : 0;

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
      top_productos: topProductos.map(tp => ({
        ...tp,
        unidades_vendidas: Number(tp.unidades_vendidas),
        ingresos_generados: Number(Number(tp.ingresos_generados).toFixed(2)),
        costo_insumos_acumulado: Number(Number(tp.costo_insumos_acumulado).toFixed(2)),
        margen_estimado: Number(tp.ingresos_generados) > 0
          ? Number((((Number(tp.ingresos_generados) - Number(tp.costo_insumos_acumulado)) / Number(tp.ingresos_generados)) * 100).toFixed(1))
          : 0
      })),
      ventas_por_dia: ventasPorDia.reverse().map(vpd => ({
        ...vpd,
        total_dinero: Number(Number(vpd.total_dinero).toFixed(2)),
        costo_insumos: Number(Number(vpd.costo_insumos).toFixed(2)),
        ganancia: Number((Number(vpd.total_dinero) - Number(vpd.costo_insumos)).toFixed(2))
      })),
      metodos_pago: metodosPago.map(mp => ({
        ...mp,
        count: Number(mp.count),
        total: Number(Number(mp.total).toFixed(2))
      }))
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});
