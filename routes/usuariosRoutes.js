const express = require('express');
const router = express.Router();
const usuariosController = require('../controllers/usuariosController'); // Ruta del controlador

// Obtener todos los usuarios
router.get('/', usuariosController.getUsuarios);

// Registrar un nuevo usuario
router.post('/', usuariosController.registrarUsuario);

// Actualizar los datos de un usuario
router.put('/:id', usuariosController.actualizarUsuario);

// Eliminar un usuario
router.delete('/:id', usuariosController.eliminarUsuario);

module.exports = router;
