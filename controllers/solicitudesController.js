const db = require('../config/db');

// 1. Registrar nueva solicitud
const registrarSolicitud = (req, res) => {
  const { cliente_id, usuario_id } = req.body;
  const fecha = new Date().toISOString().split('T')[0];

  const validarSQL = `
    SELECT id, estado FROM solicitudes 
    WHERE cliente_id = ? AND usuario_id = ? AND fecha = ?
  `;
  db.query(validarSQL, [cliente_id, usuario_id, fecha], (err, results) => {
    if (err) return res.status(500).json({ error: err });

    if (results.length > 0) {
      const solicitud = results[0];
      if (solicitud.estado === 'Pendiente') {
        return res.status(409).json({
          message: 'Ya registraste una solicitud pendiente hoy para este cliente.',
          solicitud_id: solicitud.id,
          estado: solicitud.estado,
          puedeContinuar: true
        });
      } else {
        return res.status(409).json({
          message: `Ya se registró una solicitud hoy para este cliente con estado: ${solicitud.estado}.`,
          solicitud_id: solicitud.id,
          estado: solicitud.estado,
          puedeContinuar: false
        });
      }
    }

    const insertSQL = `
      INSERT INTO solicitudes (cliente_id, usuario_id, fecha)
      VALUES (?, ?, ?)
    `;
    db.query(insertSQL, [cliente_id, usuario_id, fecha], (err, result) => {
      if (err) return res.status(500).json({ error: err });

      const selectSQL = 'SELECT id, estado FROM solicitudes WHERE id = ?';
      db.query(selectSQL, [result.insertId], (err, rows) => {
        if (err) return res.status(500).json({ error: err });
        return res.status(201).json(rows[0]);
      });
    });
  });
};

// 2. Agregar múltiples productos
const agregarDetalleBloque = (req, res) => {
  const { solicitud_id } = req.params;
  const { productos } = req.body;

  const validar = `SELECT estado FROM solicitudes WHERE id = ?`;
  db.query(validar, [solicitud_id], (err, results) => {
    if (err) return res.status(500).json({ error: err });
    if (results.length === 0) return res.status(404).json({ message: 'Solicitud no encontrada' });
    if (results[0].estado !== 'Pendiente') {
      return res.status(400).json({ message: 'No se puede agregar productos a una solicitud no pendiente.' });
    }

    const values = productos.map(p => [solicitud_id, p.codigo, p.cantidad, p.observacion || null]);
    const insertSQL = `
      INSERT INTO detalle_solicitud (solicitud_id, producto_codigo, cantidad, observacion)
      VALUES ?
    `;
    db.query(insertSQL, [values], (err) => {
      if (err) return res.status(500).json({ error: err });
      return res.status(201).json({ success: true, message: 'Productos agregados correctamente' });
    });
  });
};

// 3. Agregar producto individual
const agregarDetalle = (req, res) => {
  const { solicitud_id, producto_codigo, cantidad, observacion } = req.body;

  const validar = `SELECT estado FROM solicitudes WHERE id = ?`;
  db.query(validar, [solicitud_id], (err, results) => {
    if (err) return res.status(500).json({ error: err });
    if (results.length === 0) return res.status(404).json({ message: 'Solicitud no encontrada' });
    if (results[0].estado !== 'Pendiente') {
      return res.status(400).json({ message: 'No se puede agregar productos a una solicitud no pendiente.' });
    }

    const insertar = `
      INSERT INTO detalle_solicitud (solicitud_id, producto_codigo, cantidad, observacion)
      VALUES (?, ?, ?, ?)
    `;
    db.query(insertar, [solicitud_id, producto_codigo, cantidad, observacion || null], (err) => {
      if (err) return res.status(500).json({ error: err });
      return res.status(201).json({ message: 'Detalle agregado correctamente' });
    });
  });
};

// 4. Editar producto
const editarDetalle = (req, res) => {
  const { detalle_id } = req.params;
  const { cantidad, observacion } = req.body;

  const validar = `
    SELECT s.estado FROM detalle_solicitud d
    JOIN solicitudes s ON s.id = d.solicitud_id
    WHERE d.id = ?
  `;
  db.query(validar, [detalle_id], (err, results) => {
    if (err) return res.status(500).json({ error: err });
    if (results.length === 0) return res.status(404).json({ message: 'Detalle no encontrado' });
    if (results[0].estado !== 'Pendiente') {
      return res.status(400).json({ message: 'No se puede modificar esta solicitud. Ya fue enviada.' });
    }

    const actualizar = `UPDATE detalle_solicitud SET cantidad = ?, observacion = ? WHERE id = ?`;
    db.query(actualizar, [cantidad, observacion || null, detalle_id], (err) => {
      if (err) return res.status(500).json({ error: err });
      return res.json({ message: 'Detalle actualizado correctamente' });
    });
  });
};

// 5. Eliminar producto
const eliminarDetalle = (req, res) => {
  const { detalle_id } = req.params;

  const validar = `
    SELECT s.estado FROM detalle_solicitud d
    JOIN solicitudes s ON s.id = d.solicitud_id
    WHERE d.id = ?
  `;
  db.query(validar, [detalle_id], (err, results) => {
    if (err) return res.status(500).json({ error: err });
    if (results.length === 0) return res.status(404).json({ message: 'Detalle no encontrado' });
    if (results[0].estado !== 'Pendiente') {
      return res.status(400).json({ message: 'No se puede eliminar este producto. Ya fue enviada.' });
    }

    db.query('DELETE FROM detalle_solicitud WHERE id = ?', [detalle_id], (err) => {
      if (err) return res.status(500).json({ error: err });
      return res.json({ message: 'Producto eliminado correctamente' });
    });
  });
};

// 6. Obtener solicitudes por usuario
const obtenerSolicitudesPorUsuario = (req, res) => {
  const { id } = req.params;

  const sql = `
    SELECT s.id, c.nombre_razon_social AS cliente, s.fecha, s.estado, s.version
    FROM solicitudes s
    JOIN clientes c ON s.cliente_id = c.id
    WHERE s.usuario_id = ?
    ORDER BY s.fecha DESC
  `;
  db.query(sql, [id], (err, results) => {
    if (err) return res.status(500).json({ error: err });
    return res.json(results);
  });
};

// 7. Obtener productos de una solicitud
const obtenerDetalle = (req, res) => {
  const { solicitud_id } = req.params;

  const sql = `
    SELECT d.id, p.nombre AS producto, d.cantidad, d.observacion
    FROM detalle_solicitud d
    JOIN productos p ON p.codigo = d.producto_codigo
    WHERE d.solicitud_id = ?
  `;
  db.query(sql, [solicitud_id], (err, results) => {
    if (err) return res.status(500).json({ error: err });
    return res.json(results);
  });
};

// 8. Historial con filtros
const historialSolicitudes = (req, res) => {
  const { usuario_id, estado, fecha_ini, fecha_fin, cliente_id } = req.query;

  let sql = `
    SELECT s.id, c.nombre_razon_social AS cliente, s.fecha, s.estado, s.version, s.ultima_actualizacion
    FROM solicitudes s
    JOIN clientes c ON s.cliente_id = c.id
    WHERE s.usuario_id = ?
  `;
  const params = [usuario_id];

  if (estado) {
    sql += ' AND s.estado = ?';
    params.push(estado);
  }

  if (fecha_ini && fecha_fin) {
    sql += ' AND s.fecha BETWEEN ? AND ?';
    params.push(fecha_ini, fecha_fin);
  }

  if (cliente_id) {
    sql += ' AND s.cliente_id = ?';
    params.push(cliente_id);
  }

  sql += ' ORDER BY s.fecha DESC';

  db.query(sql, params, (err, results) => {
    if (err) return res.status(500).json({ error: err });
    return res.json(results);
  });
};

// 9. Obtener solicitud por ID
const obtenerSolicitudPorId = (req, res) => {
  const { solicitud_id } = req.params;

  const sql1 = 'SELECT estado FROM solicitudes WHERE id = ?';
  db.query(sql1, [solicitud_id], (err, solicitudRows) => {
    if (err) return res.status(500).json({ error: 'Error al obtener solicitud' });

    if (solicitudRows.length === 0) {
      return res.status(404).json({ message: 'Solicitud no encontrada' });
    }

    const sql2 = `
      SELECT 
        ds.id AS detalle_id,
        ds.cantidad,
        ds.observacion,
        p.nombre
      FROM detalle_solicitud ds
      JOIN productos p ON ds.producto_codigo = p.codigo
      WHERE ds.solicitud_id = ?
    `;
    db.query(sql2, [solicitud_id], (err, detalleRows) => {
      if (err) return res.status(500).json({ error: 'Error al obtener detalles' });

      res.json({
        estado: solicitudRows[0].estado,
        detalles: detalleRows.map((item) => ({
          detalle_id: item.detalle_id,
          nombre: item.nombre,
          cantidad: item.cantidad.toString(),
          observacion: item.observacion || '',
        })),
      });
    });
  });
};

// 10. Forzar registro sin validación
const forzarRegistrarSolicitud = (req, res) => {
  const { cliente_id, usuario_id } = req.body;
  const fecha = new Date().toISOString().split('T')[0];

  const insertSQL = `
    INSERT INTO solicitudes (cliente_id, usuario_id, fecha)
    VALUES (?, ?, ?)
  `;
  db.query(insertSQL, [cliente_id, usuario_id, fecha], (err, result) => {
    if (err) return res.status(500).json({ error: err });
    return res.status(201).json({
      message: 'Solicitud registrada correctamente',
      id: result.insertId,
      estado: 'Pendiente'
    });
  });
};

// 11. Enviar solicitud (nuevo)
const enviarSolicitud = (req, res) => {
  const { id } = req.params;

  const validarSolicitud = 'SELECT estado FROM solicitudes WHERE id = ?';
  db.query(validarSolicitud, [id], (err, solicitudRes) => {
    if (err) return res.status(500).json({ error: err });
    if (solicitudRes.length === 0) return res.status(404).json({ error: 'Solicitud no encontrada' });

    const estado = solicitudRes[0].estado;
    if (estado !== 'Pendiente') {
      return res.status(400).json({ error: 'La solicitud ya fue procesada o está cerrada.' });
    }

    const validarProductos = 'SELECT COUNT(*) AS total FROM detalle_solicitud WHERE solicitud_id = ?';
    db.query(validarProductos, [id], (err, productosRes) => {
      if (err) return res.status(500).json({ error: err });

      if (productosRes[0].total === 0) {
        return res.status(400).json({ error: 'No se puede enviar una solicitud sin productos.' });
      }

      const actualizar = "UPDATE solicitudes SET estado = 'Enviada', ultima_actualizacion = CURRENT_TIMESTAMP WHERE id = ?";
      db.query(actualizar, [id], (err) => {
        if (err) return res.status(500).json({ error: err });
        return res.json({ mensaje: 'Solicitud enviada correctamente' });
      });
    });
  });
};

const PDFDocument = require('pdfkit');

// 12. Generar PDF de solicitud
const generarPDFSolicitud = (req, res) => {
  const { id } = req.params;

  const sqlCabecera = `
    SELECT s.id, s.fecha, s.version, s.estado,
           c.nombre_razon_social AS cliente, c.direccion
    FROM solicitudes s
    JOIN clientes c ON s.cliente_id = c.id
    WHERE s.id = ?
  `;
  const sqlDetalle = `
    SELECT p.nombre AS producto, d.cantidad, d.observacion
    FROM detalle_solicitud d
    JOIN productos p ON d.producto_codigo = p.codigo
    WHERE d.solicitud_id = ?
  `;

  db.query(sqlCabecera, [id], (err, solicitudRows) => {
    if (err) return res.status(500).json({ error: 'Error al obtener solicitud' });
    if (solicitudRows.length === 0) return res.status(404).json({ error: 'Solicitud no encontrada' });

    db.query(sqlDetalle, [id], (err, detalleRows) => {
      if (err) return res.status(500).json({ error: 'Error al obtener detalles' });

      const doc = new PDFDocument({ margin: 50 });

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename=solicitud_${id}.pdf`);
      doc.pipe(res);

      const solicitud = solicitudRows[0];

      doc.fontSize(18).text('Solicitud de Materiales', { align: 'center' });
      doc.moveDown();

      doc.fontSize(12).text(`Cliente: ${solicitud.cliente}`);
      doc.text(`Dirección: ${solicitud.direccion}`);
      doc.text(`Fecha: ${solicitud.fecha}`);
      doc.text(`Solicitud ID: ${solicitud.id}`);
      doc.text(`Versión: ${solicitud.version}`);
      doc.text(`Estado: ${solicitud.estado}`);
      doc.moveDown();

      doc.fontSize(14).text('Productos Solicitados:', { underline: true });
      doc.moveDown(0.5);

      detalleRows.forEach((item, i) => {
        doc.fontSize(12).text(`${i + 1}. ${item.producto}`);
        doc.text(`   Cantidad: ${item.cantidad}`);
        if (item.observacion) {
          doc.text(`   Observación: ${item.observacion}`);
        }
        doc.moveDown(0.3);
      });

      doc.end();
    });
  });
};


module.exports = {
  registrarSolicitud,
  agregarDetalleBloque,
  agregarDetalle,
  editarDetalle,
  eliminarDetalle,
  obtenerSolicitudesPorUsuario,
  obtenerDetalle,
  historialSolicitudes,
  obtenerSolicitudPorId,
  forzarRegistrarSolicitud,
  enviarSolicitud, // ✅ nuevo
  generarPDFSolicitud // ✅ nuevo
};
