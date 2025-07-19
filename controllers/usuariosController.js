const db = require('../config/db');

// REGISTRAR USUARIO
const registrarUsuario = (req, res) => {
  const { empleado_id, correo_electronico, contrasena, rol } = req.body;

  if (!empleado_id || !correo_electronico || !contrasena || !rol) {
    return res.status(400).send('Complete todos los campos requeridos');
  }

  const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/;
  if (!emailRegex.test(correo_electronico)) {
    return res.status(400).send('El correo electrónico no es válido');
  }

  if (contrasena.length < 8) {
    return res.status(400).send('La contraseña debe tener al menos 8 caracteres');
  }

  // Verificar si ya existe un usuario para ese empleado
  const queryExisteUsuario = 'SELECT id FROM usuarios WHERE empleado_id = ?';
  db.query(queryExisteUsuario, [empleado_id], (err, result) => {
    if (err) return res.status(500).send('Error al verificar usuario existente');
    if (result.length > 0) {
      return res.status(400).send('Este empleado ya tiene un usuario registrado');
    }

    // Validar que el empleado existe y que el cargo coincide con el rol
    const queryEmpleado = 'SELECT cargo FROM empleados WHERE id = ?';
    db.query(queryEmpleado, [empleado_id], (err, resultEmpleado) => {
      if (err) return res.status(500).send('Error al obtener los datos del empleado');
      if (resultEmpleado.length === 0) return res.status(404).send('Empleado no encontrado');

      const cargoEmpleado = resultEmpleado[0].cargo;
      if (cargoEmpleado !== rol) {
        return res.status(400).send('El rol del usuario debe coincidir con el cargo del empleado');
      }

      const queryUsuario = `
        INSERT INTO usuarios (correo_electronico, contrasena, rol, empleado_id)
        VALUES (?, ?, ?, ?)
      `;
      db.query(queryUsuario, [correo_electronico, contrasena, rol, empleado_id], (err) => {
        if (err) {
          if (err.code === 'ER_DUP_ENTRY') {
            return res.status(400).send('El correo electrónico ya está registrado');
          }
          return res.status(500).send('Error al registrar el usuario');
        }
        res.status(201).send('Usuario registrado correctamente');
      });
    });
  });
};

// OBTENER TODOS LOS USUARIOS (nombre desde empleados)
const getUsuarios = (req, res) => {
  const sql = `
    SELECT u.id, e.nombres AS nombre, u.correo_electronico, u.rol
    FROM usuarios u
    INNER JOIN empleados e ON u.empleado_id = e.id
  `;

  db.query(sql, (err, results) => {
    if (err) {
      console.error('Error al obtener los usuarios:', err);
      return res.status(500).json({ error: 'Error al obtener usuarios' });
    }

    res.status(200).json(results);
  });
};

// ACTUALIZAR USUARIO (sin modificar nombre ni empleado_id)
const actualizarUsuario = (req, res) => {
  const { id } = req.params;
  const { correo_electronico, contrasena, rol } = req.body;

  if (!correo_electronico || !contrasena || !rol) {
    return res.status(400).json({ error: 'Complete todos los campos requeridos' });
  }

  const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/;
  if (!emailRegex.test(correo_electronico)) {
    return res.status(400).json({ error: 'El correo electrónico no es válido' });
  }

  if (contrasena.length < 8) {
    return res.status(400).json({ error: 'La contraseña debe tener al menos 8 caracteres' });
  }

  // Verificar si otro usuario ya tiene el mismo correo
  const queryCorreoExistente = `
    SELECT id FROM usuarios WHERE correo_electronico = ? AND id != ?
  `;

  db.query(queryCorreoExistente, [correo_electronico, id], (err, result) => {
    if (err) {
      console.error('Error al verificar correo duplicado:', err);
      return res.status(500).json({ error: 'Error al verificar el correo electrónico' });
    }

    if (result.length > 0) {
      return res.status(400).json({ error: 'El correo electrónico ya está en uso por otro usuario' });
    }

    // Si todo está bien, actualizar
    const sql = `
      UPDATE usuarios
      SET correo_electronico = ?, contrasena = ?, rol = ?
      WHERE id = ?
    `;

    db.query(sql, [correo_electronico, contrasena, rol, id], (err, result) => {
      if (err) {
        console.error('Error al actualizar el usuario:', err);
        return res.status(500).json({ error: 'Error al actualizar usuario' });
      }

      if (result.affectedRows === 0) {
        return res.status(404).json({ error: 'Usuario no encontrado' });
      }

      res.status(200).json({ mensaje: 'Usuario actualizado correctamente' });
    });
  });
};


// ELIMINAR USUARIO
const eliminarUsuario = (req, res) => {
  const { id } = req.params;

  const sql = 'DELETE FROM usuarios WHERE id = ?';

  db.query(sql, [id], (err, result) => {
    if (err) {
      console.error('Error al eliminar usuario:', err);
      return res.status(500).json({ error: 'Error al eliminar usuario' });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    res.status(200).json({ mensaje: 'Usuario eliminado correctamente' });
  });
};

module.exports = {
  registrarUsuario,
  getUsuarios,
  actualizarUsuario,
  eliminarUsuario,
};
