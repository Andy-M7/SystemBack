const db = require('../config/db');

// REGISTRAR CLIENTE
const registrarCliente = (req, res) => {
  const { nombre_razon_social, documento, direccion, telefono } = req.body;

  // Validación de campos obligatorios
  if (!nombre_razon_social || !documento || !direccion || !telefono) {
    return res.status(400).send('Todos los campos son obligatorios');
  }

  // Validar formato de documento (DNI o RUC)
  if (!/^\d{8}$/.test(documento) && !/^\d{11}$/.test(documento)) {
    return res.status(400).send('El número de documento debe tener 8 (DNI) o 11 dígitos (RUC)');
  }

  // Validar solo números en teléfono
  if (!/^\d+$/.test(telefono)) {
    return res.status(400).send('El teléfono solo debe contener números');
  }

  // Verificar si el documento ya existe
  const sqlBuscar = 'SELECT id FROM clientes WHERE documento = ?';
  db.query(sqlBuscar, [documento], (err, result) => {
    if (err) return res.status(500).send('Error al verificar cliente existente');
    if (result.length > 0) return res.status(409).send('El cliente ya está registrado');

    // Insertar cliente
    const sqlInsertar = `
      INSERT INTO clientes (nombre_razon_social, documento, direccion, telefono)
      VALUES (?, ?, ?, ?)
    `;
    db.query(sqlInsertar, [nombre_razon_social.trim(), documento.trim(), direccion.trim(), telefono.trim()], (err) => {
      if (err) {
        console.error('Error al registrar cliente:', err);
        return res.status(500).send('Error al registrar cliente');
      }
      res.status(201).json({ success: true, mensaje: 'Cliente registrado correctamente' });
    });
  });
};

// OBTENER TODOS LOS CLIENTES
const getClientes = (req, res) => {
  const sql = `
    SELECT id, nombre_razon_social, documento, direccion, telefono
    FROM clientes
    ORDER BY nombre_razon_social ASC
  `;
  db.query(sql, (err, results) => {
    if (err) {
      console.error('Error al obtener los clientes:', err);
      return res.status(500).json({ error: 'Error al obtener clientes' });
    }
    res.status(200).json(results);
  });
};

// ACTUALIZAR CLIENTE
const actualizarCliente = (req, res) => {
  const { id } = req.params;
  const { nombre_razon_social, documento, direccion, telefono } = req.body;

  if (!nombre_razon_social || !documento || !direccion || !telefono) {
    return res.status(400).send('Todos los campos son obligatorios');
  }

  if (!/^\d{8}$/.test(documento) && !/^\d{11}$/.test(documento)) {
    return res.status(400).send('El número de documento debe tener 8 (DNI) o 11 dígitos (RUC)');
  }

  if (!/^\d+$/.test(telefono)) {
    return res.status(400).send('El teléfono solo debe contener números');
  }

  const sql = `
    UPDATE clientes
    SET nombre_razon_social = ?, documento = ?, direccion = ?, telefono = ?
    WHERE id = ?
  `;

  db.query(sql, [nombre_razon_social, documento, direccion, telefono, id], (err, result) => {
    if (err) {
      console.error('Error al actualizar cliente:', err);
      return res.status(500).json({ error: 'Error al actualizar cliente' });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Cliente no encontrado' });
    }

    res.status(200).json({ mensaje: 'Cliente actualizado correctamente' });
  });
};

// ELIMINAR CLIENTE (bloquea si tiene solicitudes Pendientes)
  const eliminarCliente = (req, res) => {
    const { id } = req.params;

    if (!id) return res.status(400).json({ error: 'ID de cliente requerido' });

    // 1) Verificar si el cliente tiene solicitudes en estado 'Pendiente'
    const sqlPend = `
      SELECT COUNT(*) AS total
      FROM solicitudes
      WHERE cliente_id = ? AND estado = 'Pendiente'
    `;

    db.query(sqlPend, [id], (err, rows) => {
      if (err) {
        console.error('Error al validar pendientes:', err);
        return res.status(500).json({ error: 'Error al validar solicitudes pendientes' });
      }

      const total = rows?.[0]?.total || 0;
      if (total > 0) {
        return res.status(409).json({
          error: 'No se puede eliminar el cliente: tiene solicitudes en estado Pendiente.',
          pendientes: total,
        });
      }

      // 2) Si no hay pendientes, eliminar
      const sql = 'DELETE FROM clientes WHERE id = ?';
      db.query(sql, [id], (err2, result) => {
        if (err2) {
          console.error('Error al eliminar cliente:', err2);
          return res.status(500).json({ error: 'Error al eliminar cliente' });
        }

        if (result.affectedRows === 0) {
          return res.status(404).json({ error: 'Cliente no encontrado' });
        }

        return res.status(200).json({ mensaje: 'Cliente eliminado correctamente' });
      });
    });
  };


// OBTENER UN CLIENTE POR ID
const obtenerClientePorId = (req, res) => {
  const { id } = req.params;

  const sql = 'SELECT * FROM clientes WHERE id = ?';

  db.query(sql, [id], (err, results) => {
    if (err) {
      console.error('Error al obtener cliente:', err);
      return res.status(500).json({ error: 'Error al obtener cliente' });
    }

    if (results.length === 0) {
      return res.status(404).json({ error: 'Cliente no encontrado' });
    }

    res.status(200).json(results[0]);
  });
};

// ✅ Verificar si un cliente tiene solicitudes 'Pendiente'
const verificarPendientesCliente = (req, res) => {
  const { cliente_id } = req.query;
  if (!cliente_id) {
    return res.status(400).json({ mensaje: 'cliente_id es requerido' });
  }

  const sql = `
    SELECT COUNT(*) AS total
    FROM solicitudes
    WHERE cliente_id = ? AND estado = 'Pendiente'
  `;

  db.query(sql, [cliente_id], (err, rows) => {
    if (err) {
      console.error('Error al consultar pendientes:', err);
      return res.status(500).json({ mensaje: 'Error al consultar pendientes' });
    }

    const total = rows?.[0]?.total || 0;
    return res.json({
      tienePendientes: total > 0,
      total,
    });
  });
};



module.exports = {
  registrarCliente,
  getClientes,
  actualizarCliente,
  eliminarCliente,
  obtenerClientePorId,
  verificarPendientesCliente,
};
