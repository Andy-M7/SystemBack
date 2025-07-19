const db = require('../config/db');

const loginUsuario = (req, res) => {
  const { correo_electronico, contrasena } = req.body;

  if (!correo_electronico || !contrasena) {
    return res.status(400).json({ error: 'Correo y contraseña son requeridos' });
  }

  const sql = `
      SELECT 
        u.id AS id,
        u.correo_electronico AS correo, 
        u.rol, 
        e.nombres AS nombre
      FROM usuarios u
      INNER JOIN empleados e ON u.empleado_id = e.id
      WHERE u.correo_electronico = ? AND u.contrasena = ?
    `;


  db.query(sql, [correo_electronico, contrasena], (err, results) => {
    if (err) {
      console.error('Error en el login:', err);
      return res.status(500).json({ error: 'Error en el servidor' });
    }

    if (results.length === 0) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const usuario = results[0];

    res.status(200).json({
      mensaje: 'Login exitoso',
      usuario: {
        id: usuario.id,    
        correo: usuario.correo,
        nombre: usuario.nombre,
        rol: usuario.rol
      }
    });


  });
};

module.exports = { loginUsuario };
