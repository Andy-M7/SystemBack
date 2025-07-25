const db = require('../config/db');
const path = require('path');
const fs = require('fs');
const PDFDocument = require('pdfkit');

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

// 11. Enviar solicitud (nuevo: 'Enviar a Logística')
const enviarSolicitud = (req, res) => {
  const { id } = req.params;

  // 1. Verifica que la solicitud está pendiente
  const validarSolicitud = 'SELECT estado FROM solicitudes WHERE id = ?';
  db.query(validarSolicitud, [id], (err, solicitudRes) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Error al consultar la solicitud.' });
    }
    if (solicitudRes.length === 0) {
      return res.status(404).json({ error: 'Solicitud no encontrada.' });
    }

    const estado = solicitudRes[0].estado;
    if (estado !== 'Pendiente') {
      return res
        .status(400)
        .json({ error: 'La solicitud ya fue enviada o procesada.' });
    }

    // 2. Verifica que tenga al menos un producto
    const validarProductos = 'SELECT COUNT(*) AS total FROM detalle_solicitud WHERE solicitud_id = ?';
    db.query(validarProductos, [id], (err, productosRes) => {
      if (err) return res.status(500).json({ error: 'Error al consultar productos.' });
      if (productosRes[0].total === 0) {
        return res.status(400).json({ error: 'No se puede enviar una solicitud sin productos.' });
      }

      // 3. Cambia el estado a 'Enviada'
      const actualizar = `
        UPDATE solicitudes 
        SET estado = 'Enviada', ultima_actualizacion = CURRENT_TIMESTAMP
        WHERE id = ?
      `;
      db.query(actualizar, [id], (err) => {
        if (err) return res.status(500).json({ error: 'Error al actualizar el estado.' });

        // 4. Devuelve estado actualizado al frontend
        return res.json({
          mensaje: 'Solicitud enviada a logística correctamente.',
          estado: 'Enviada',
          solicitud_id: id,
        });
      });
    });
  });
};



// 12. Generar y guardar PDF de solicitud en disco (moderno/corregido)
const generarYGuardarPDFSolicitud = (req, res) => {
  const { id } = req.params;
  console.log('➡️ Iniciando generación de PDF para solicitud', id);

  const sqlCabecera = `
    SELECT s.id, s.fecha, s.version, s.estado,
           c.nombre_razon_social AS cliente, c.direccion, c.telefono
    FROM solicitudes s
    JOIN clientes c ON s.cliente_id = c.id
    WHERE s.id = ?
  `;
  const sqlDetalle = `
    SELECT p.nombre AS producto, d.cantidad, d.observacion, d.producto_codigo AS codigo, u.nombre AS unidad
    FROM detalle_solicitud d
    JOIN productos p ON d.producto_codigo = p.codigo
    JOIN unidades_medida u ON p.unidad_medida_id = u.id
    WHERE d.solicitud_id = ?
  `;

  db.query(sqlCabecera, [id], (err, solicitudRows) => {
    if (err) {
      console.error('❌ Error SQL cabecera:', err);
      return res.status(500).json({ error: 'Error al obtener solicitud' });
    }
    if (solicitudRows.length === 0) return res.status(404).json({ error: 'Solicitud no encontrada' });

    db.query(sqlDetalle, [id], (err, detalleRows) => {
      if (err) {
        console.error('❌ Error SQL detalle:', err);
        return res.status(500).json({ error: 'Error al obtener detalles' });
      }

      const solicitud = solicitudRows[0];
      const carpetaPDFs = path.join(__dirname, '..', 'assets', 'pdfs');
      if (!fs.existsSync(carpetaPDFs)){
        fs.mkdirSync(carpetaPDFs, { recursive: true });
      }
      const filename = `solicitud_${id}.pdf`;
      const rutaArchivo = path.join(carpetaPDFs, filename);

      console.log('📝 Escribiendo PDF en:', rutaArchivo);
      const doc = new PDFDocument({ margin: 25, size: 'A4' });
      const stream = fs.createWriteStream(rutaArchivo);
      doc.pipe(stream);

      // --- Título, Cabecera, Tabla, Footer: aquí va EXACTO lo que ya tienes ---
      doc.fontSize(13).font('Helvetica-Bold').fillColor('red')
        .text('REQUERIMIENTO DE MATERIALES', 0, 20, { align: 'center' });
      doc.fontSize(10).font('Helvetica').fillColor('black')
        .text('SISTEMA INTEGRADO DE GESTIÓN', { align: 'center' });
      doc.fontSize(9)
        .text('Código: RG-24-SIG-GB', 400, 22)
        .text('Versión 00', 500, 36);

      const yCab = 60;
      doc.rect(25, yCab, 550, 36).stroke();
      doc.font('Helvetica-Bold').fontSize(9);
      doc.text('CLIENTE:', 28, yCab + 3);
      doc.font('Helvetica').text(solicitud.cliente, 75, yCab + 3);
      doc.font('Helvetica-Bold').text('DIRECCIÓN:', 28, yCab + 18);
      doc.font('Helvetica').text(solicitud.direccion, 90, yCab + 18);
      doc.font('Helvetica-Bold').text('TELÉFONO:', 400, yCab + 3);
      doc.font('Helvetica').text(solicitud.telefono, 465, yCab + 3);
      doc.font('Helvetica-Bold').text('FECHA:', 400, yCab + 18);
      doc.font('Helvetica').text(
        solicitud.fecha ? new Date(solicitud.fecha).toLocaleDateString() : '', 
        450, yCab + 18
      );
      doc.fillColor('black').font('Helvetica-Bold').fontSize(10)
        .rect(25, yCab + 38, 550, 18).fillAndStroke('#FFFBEA', '#000');
      doc.fillColor('black').text(
        'Por favor, solicite con anticipación su requerimiento para evitar contratiempos.',
        27, yCab + 41, { width: 546, align: 'center' }
      );

      const tableTop = yCab + 62;
      const columnPos = {
        item: 30,
        cod: 60,
        prod: 120,
        unidad: 325,
        cant: 385,
        obs: 440,
      };

      doc.font('Helvetica-Bold').fontSize(9);
      doc.rect(25, tableTop, 550, 18).fillAndStroke('#EAEAEA', '#000');
      doc.fillColor('black')
        .text('ITEM', columnPos.item, tableTop + 4, { width: 28, align: 'center' })
        .text('COD', columnPos.cod, tableTop + 4, { width: 58, align: 'center' })
        .text('PRODUCTO', columnPos.prod, tableTop + 4, { width: 205, align: 'center' })
        .text('UNIDAD', columnPos.unidad, tableTop + 4, { width: 55, align: 'center' })
        .text('CANTIDAD', columnPos.cant, tableTop + 4, { width: 50, align: 'center' })
        .text('OBSERVACIONES', columnPos.obs, tableTop + 4, { width: 130, align: 'center' });

      let y = tableTop + 18;
      let rowHeight = 18;
      detalleRows.forEach((prod, idx) => {
        doc.rect(25, y, 550, rowHeight).stroke();
        doc.font('Helvetica').fontSize(9).fillColor('black')
          .text(idx + 1, columnPos.item, y + 4, { width: 28, align: 'center' })
          .text(prod.codigo || '', columnPos.cod, y + 4, { width: 58, align: 'center' })
          .text(prod.producto || '', columnPos.prod, y + 4, { width: 205 })
          .text(prod.unidad || '', columnPos.unidad, y + 4, { width: 55, align: 'center' })
          .text(prod.cantidad || '', columnPos.cant, y + 4, { width: 50, align: 'center' });
        if (prod.observacion) {
          doc.font('Helvetica-Bold').fillColor('red')
            .text(prod.observacion, columnPos.obs, y + 4, { width: 130 });
          doc.font('Helvetica').fillColor('black');
        }
        y += rowHeight;
      });

      for (let i = detalleRows.length; i < 10; i++) {
        doc.rect(25, y, 550, rowHeight).stroke();
        y += rowHeight;
      }

      doc.font('Helvetica-Bold').fontSize(9)
        .text('Estado:', 25, y + 25)
        .font('Helvetica').text(solicitud.estado, 70, y + 25)
        .font('Helvetica-Bold')
        .text('Versión:', 200, y + 25)
        .font('Helvetica').text(solicitud.version, 250, y + 25);

      doc.end();

      stream.on('finish', () => {
        console.log('✅ PDF generado correctamente:', rutaArchivo);
        return res.json({
          message: 'PDF generado correctamente',
          url: `/pdfs/${filename}`
        });
      });
      stream.on('error', (err) => {
        console.error('❌ Error al guardar PDF:', err);
        return res.status(500).json({ error: 'Error al guardar PDF: ' + err.message });
      });
    });
  });
};

// 13. Descargar PDF generado
const descargarPDFSolicitud = (req, res) => {
  const { id } = req.params;
  const filename = `solicitud_${id}.pdf`;
  const rutaArchivo = path.join(__dirname, '..', 'assets', 'pdfs', filename);

  if (!fs.existsSync(rutaArchivo)) {
    return res.status(404).json({ error: 'PDF no existe' });
  }
  res.download(rutaArchivo, filename);
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
  generarYGuardarPDFSolicitud,
  descargarPDFSolicitud,
  enviarSolicitud,
};

