const db = require('../config/db');

// Función para obtener todos los empleados
const getEmpleados = (req, res) => {
  db.query('SELECT * FROM empleados', (err, results) => {
    if (err) {
      return res.status(500).send('Error al consultar los empleados');
    }
    res.json(results);
  });
};

// Función para registrar un nuevo empleado
const registrarEmpleado = (req, res) => {
  const { dni, nombres, apellidos, cargo, estado } = req.body;

  if (!dni || !nombres || !apellidos || !cargo || !estado) {
    return res.status(400).send('Complete todos los campos requeridos');
  }

  if (!/^\d{8}$/.test(dni)) {
    return res.status(400).send('El DNI debe tener exactamente 8 dígitos numéricos');
  }

  const validCargos = ['Supervisor', 'Técnico', 'Administrador', 'Logística'];
  if (!validCargos.includes(cargo)) {
    return res.status(400).send('El cargo debe ser uno de los siguientes: Supervisor, Técnico, Administrador, Logística');
  }

  if (estado !== 'Activo' && estado !== 'Inactivo') {
    return res.status(400).send('El estado debe ser "Activo" o "Inactivo"');
  }

  db.query('SELECT * FROM empleados WHERE dni = ?', [dni], (err, results) => {
    if (err) {
      return res.status(500).send('Error al consultar el DNI');
    }

    if (results.length > 0) {
      return res.status(400).send('Empleado ya registrado');
    }

    const query = 'INSERT INTO empleados (dni, nombres, apellidos, cargo, estado) VALUES (?, ?, ?, ?, ?)';
    db.query(query, [dni, nombres, apellidos, cargo, estado], (err, result) => {
      if (err) {
        return res.status(500).send('Error al registrar el empleado');
      }
      res.status(201).send('Empleado registrado correctamente');
    });
  });
};

// Función para actualizar un empleado (todos los campos)
const actualizarEmpleado = (req, res) => {
  const { id } = req.params;
  const { dni, nombres, apellidos, cargo, estado } = req.body;

  if (!dni || !nombres || !apellidos || !cargo || !estado) {
    return res.status(400).send('Complete todos los campos requeridos');
  }

  const query = 'UPDATE empleados SET dni = ?, nombres = ?, apellidos = ?, cargo = ?, estado = ? WHERE id = ?';
  db.query(query, [dni, nombres, apellidos, cargo, estado, id], (err, result) => {
    if (err) {
      return res.status(500).send('Error al actualizar el empleado');
    }
    if (result.affectedRows === 0) {
      return res.status(404).send('Empleado no encontrado');
    }
    res.send('Empleado actualizado con éxito');
  });
};

// Función para eliminar un empleado
const eliminarEmpleado = (req, res) => {
  const { id } = req.params;

  const query = 'DELETE FROM empleados WHERE id = ?';
  db.query(query, [id], (err, result) => {
    if (err) {
      return res.status(500).send('Error al eliminar el empleado');
    }
    if (result.affectedRows === 0) {
      return res.status(404).send('Empleado no encontrado');
    }
    res.send('Empleado eliminado con éxito');
  });
};

// ✅ Nueva función para actualizar solo el estado
const actualizarEstado = (req, res) => {
  const { id } = req.params;
  const { estado } = req.body;

  if (estado !== 'Activo' && estado !== 'Inactivo') {
    return res.status(400).send('El estado debe ser "Activo" o "Inactivo"');
  }

  const query = 'UPDATE empleados SET estado = ? WHERE id = ?';
  db.query(query, [estado, id], (err, result) => {
    if (err) {
      return res.status(500).send('Error al actualizar el estado del empleado');
    }
    if (result.affectedRows === 0) {
      return res.status(404).send('Empleado no encontrado');
    }
    res.send('Estado del empleado actualizado con éxito');
  });
};

module.exports = {
  getEmpleados,
  registrarEmpleado,
  actualizarEmpleado,
  eliminarEmpleado,
  actualizarEstado, 
};
