const db = require('../config/db');

// Listar todas las unidades
const listarUnidades = (req, res) => {
  db.query('SELECT * FROM unidades_medida', (err, resultados) => {
    if (err) return res.status(500).json({ mensaje: 'Error al obtener unidades', err });
    res.json(resultados);
  });
};

// Buscar una unidad por nombre
const buscarUnidadPorNombre = (req, res) => {
  const { nombre } = req.params;
  db.query('SELECT * FROM unidades_medida WHERE nombre = ?', [nombre], (err, resultados) => {
    if (err) return res.status(500).json({ mensaje: 'Error al buscar unidad', err });
    if (resultados.length === 0) return res.status(404).json({ mensaje: 'Unidad no encontrada' });
    res.json(resultados[0]);
  });
};

// Registrar una unidad
const registrarUnidad = (req, res) => {
  const { nombre } = req.body;
  if (!nombre) return res.status(400).json({ mensaje: 'El nombre es obligatorio' });
  db.query('INSERT INTO unidades_medida (nombre) VALUES (?)', [nombre], (err) => {
    if (err) return res.status(500).json({ mensaje: 'Error al registrar unidad', err });
    res.status(201).json({ mensaje: 'Unidad registrada correctamente' });
  });
};

// Actualizar el nombre de una unidad
const actualizarUnidad = (req, res) => {
  const { nombreAnterior } = req.params;
  const { nombreNuevo } = req.body;
  if (!nombreNuevo) return res.status(400).json({ mensaje: 'El nuevo nombre es obligatorio' });

  db.query('UPDATE unidades_medida SET nombre = ? WHERE nombre = ?', [nombreNuevo, nombreAnterior], (err, result) => {
    if (err) return res.status(500).json({ mensaje: 'Error al actualizar unidad', err });
    if (result.affectedRows === 0) return res.status(404).json({ mensaje: 'Unidad no encontrada' });
    res.json({ mensaje: 'Unidad actualizada correctamente' });
  });
};

// Eliminar una unidad
const eliminarUnidad = (req, res) => {
  const { nombre } = req.params;
  db.query('DELETE FROM unidades_medida WHERE nombre = ?', [nombre], (err, result) => {
    if (err) return res.status(500).json({ mensaje: 'Error al eliminar unidad', err });
    if (result.affectedRows === 0) return res.status(404).json({ mensaje: 'Unidad no encontrada' });
    res.json({ mensaje: 'Unidad eliminada correctamente' });
  });
};

module.exports = {
  listarUnidades,
  buscarUnidadPorNombre,
  registrarUnidad,
  actualizarUnidad,
  eliminarUnidad
};
