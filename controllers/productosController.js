const db = require('../config/db');
const XLSX = require('xlsx');

// 🔍 Buscar por nombre o código
const buscarProducto = (req, res) => {
  const { criterio } = req.query;

  if (!criterio || criterio.trim() === '') {
    return res.status(400).json({ mensaje: 'Ingrese un dato para realizar la búsqueda' });
  }

  const sql = `
    SELECT p.codigo, p.nombre, p.descripcion, u.nombre AS unidad_medida, p.estado
    FROM productos p
    JOIN unidades_medida u ON p.unidad_medida_id = u.id
    WHERE p.nombre LIKE ? OR p.codigo LIKE ?
    ORDER BY p.nombre ASC
    LIMIT 1
  `;
  const valorBusqueda = `%${criterio.trim()}%`;

  db.query(sql, [valorBusqueda, valorBusqueda], (err, resultados) => {
    if (err) return res.status(500).json({ mensaje: 'Error en la base de datos', error: err });
    if (resultados.length === 0) return res.status(404).json({ mensaje: 'Producto no encontrado' });
    return res.json(resultados[0]);
  });
};

// 📋 Listar productos con filtros
const listarProductos = (req, res) => {
  const { unidad, estado } = req.query;

  let sql = `
    SELECT p.codigo, p.nombre, p.descripcion, u.nombre AS unidad_medida, p.estado
    FROM productos p
    JOIN unidades_medida u ON p.unidad_medida_id = u.id
    WHERE 1 = 1
  `;
  const valores = [];

  if (unidad) {
    sql += ' AND u.nombre = ?';
    valores.push(unidad);
  }

  if (estado) {
    sql += ' AND p.estado = ?';
    valores.push(estado);
  }

  sql += ' ORDER BY p.nombre ASC';

  db.query(sql, valores, (err, resultados) => {
    if (err) return res.status(500).json({ mensaje: 'Error al obtener productos', error: err });
    if (resultados.length === 0) return res.status(200).json({ mensaje: 'No hay productos registrados en el catálogo' });
    return res.json(resultados);
  });
};

// 📦 Productos activos para selección
const productosActivos = (req, res) => {
  const sql = `
    SELECT p.codigo, p.nombre, u.nombre AS unidad_medida
    FROM productos p
    JOIN unidades_medida u ON p.unidad_medida_id = u.id
    WHERE p.estado = 'Activo'
    ORDER BY p.nombre ASC
  `;

  db.query(sql, (err, resultados) => {
    if (err) return res.status(500).json({ mensaje: 'Error al obtener productos activos', error: err });
    res.json(resultados);
  });
};

// 📝 Registrar nuevo producto (sin stock)
const registrarProducto = (req, res) => {
  const { codigo, nombre, descripcion, unidad_medida_id, estado } = req.body;

  if (!codigo || !nombre || !descripcion || !unidad_medida_id) {
    return res.status(400).json({ mensaje: 'Todos los campos son obligatorios.' });
  }

  const checkSql = 'SELECT * FROM productos WHERE codigo = ?';
  db.query(checkSql, [codigo], (err2, resultados) => {
    if (err2) return res.status(500).json({ mensaje: 'Error en la base de datos', error: err2 });
    if (resultados.length > 0) return res.status(409).json({ mensaje: 'Este código ya está registrado.' });

    const insertSql = `
      INSERT INTO productos (codigo, nombre, descripcion, unidad_medida_id, estado)
      VALUES (?, ?, ?, ?, ?)
    `;
    db.query(insertSql, [codigo, nombre, descripcion, unidad_medida_id, estado || 'Activo'], (err3) => {
      if (err3) return res.status(500).json({ mensaje: 'Error al registrar el producto', error: err3 });
      res.status(201).json({ mensaje: 'Producto registrado correctamente.' });
    });
  });
};

// 🔁 Cambiar estado Activo/Inactivo
const cambiarEstadoProducto = (req, res) => {
  const { codigo } = req.params;
  const { estado } = req.body;

  if (!codigo || !estado) return res.status(400).json({ mensaje: 'Código y estado requeridos.' });

  const sql = 'UPDATE productos SET estado = ? WHERE codigo = ?';
  db.query(sql, [estado, codigo], (err) => {
    if (err) return res.status(500).json({ mensaje: 'Error al cambiar estado', error: err });
    res.json({ mensaje: 'Estado actualizado correctamente.' });
  });
};

// ✏️ Actualizar producto existente
const actualizarProducto = (req, res) => {
  const { codigo } = req.params;
  const { nombre, descripcion, unidad_medida_id } = req.body;

  if (!codigo || !nombre || !descripcion || !unidad_medida_id) {
    return res.status(400).json({ mensaje: 'Todos los campos son obligatorios.' });
  }

  const sql = `
    UPDATE productos
    SET nombre = ?, descripcion = ?, unidad_medida_id = ?
    WHERE codigo = ?
  `;
  db.query(sql, [nombre, descripcion, unidad_medida_id, codigo], (err2, resultado) => {
    if (err2) return res.status(500).json({ mensaje: 'Error al actualizar el producto.', error: err2 });
    if (resultado.affectedRows === 0) return res.status(404).json({ mensaje: 'Producto no encontrado.' });
    res.json({ mensaje: 'Producto actualizado correctamente.' });
  });
};

// 📥 Importar desde Excel (sin stock)
const importarProductos = async (req, res) => {
  const { nombreArchivo, base64 } = req.body;
  if (!nombreArchivo || !base64) return res.status(400).json({ mensaje: 'Faltan datos para la importación.' });

  try {
    const buffer = Buffer.from(base64, 'base64');
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const hoja = workbook.Sheets[workbook.SheetNames[0]];
    const productos = XLSX.utils.sheet_to_json(hoja);

    if (!Array.isArray(productos) || productos.length === 0) {
      return res.status(400).json({ mensaje: 'El archivo está vacío o mal formateado.' });
    }

    const errores = new Set();
    const exitos = [];

    for (const [index, prod] of productos.entries()) {
      const { codigo, nombre, descripcion, unidad_medida } = prod;
      const esCodigoNumerico = /^\d+$/.test(String(codigo));

      if (!codigo || !nombre || !descripcion || !unidad_medida || !esCodigoNumerico) {
        errores.add(`Fila ${index + 2}: Datos inválidos.`);
        continue;
      }

      const unidadQuery = 'SELECT id FROM unidades_medida WHERE nombre = ?';
      const [unidad] = await new Promise((resolve) =>
        db.query(unidadQuery, [unidad_medida], (err, rows) => resolve(err || rows))
      );

      if (!unidad || !unidad.id) {
        errores.add(`Fila ${index + 2}: Unidad de medida no válida.`);
        continue;
      }

      const sql = `
        INSERT INTO productos (codigo, nombre, descripcion, unidad_medida_id, estado)
        VALUES (?, ?, ?, ?, 'Activo')
        ON DUPLICATE KEY UPDATE
          nombre = VALUES(nombre),
          descripcion = VALUES(descripcion),
          unidad_medida_id = VALUES(unidad_medida_id),
          estado = 'Activo'
      `;

      await new Promise((resolve) =>
        db.query(sql, [codigo, nombre, descripcion, unidad.id], (err2) => {
          if (err2) errores.add(`Fila ${index + 2}: Error en base de datos.`);
          else exitos.push(codigo);
          resolve();
        })
      );
    }

    return res.status(exitos.length === 0 ? 400 : 200).json({
      mensaje: `${exitos.length} productos importados.`,
      errores: Array.from(errores),
    });

  } catch (error) {
    console.error('Error al procesar Excel:', error);
    return res.status(500).json({ mensaje: 'Error procesando archivo.', error });
  }
};

module.exports = {
  buscarProducto,
  listarProductos,
  productosActivos,
  registrarProducto,
  cambiarEstadoProducto,
  actualizarProducto,
  importarProductos,
};
