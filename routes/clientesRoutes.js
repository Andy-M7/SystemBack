const express = require('express');
const router = express.Router();
const clientesController = require('../controllers/clientesController');

// Rutas RESTful correctas
router.post('/', clientesController.registrarCliente);
router.get('/', clientesController.getClientes);
router.put('/:id', clientesController.actualizarCliente);
router.delete('/:id', clientesController.eliminarCliente);
router.get('/:id', clientesController.obtenerClientePorId);


module.exports = router;

