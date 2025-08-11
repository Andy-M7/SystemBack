const express = require('express');
const router = express.Router();
const clientesController = require('../controllers/clientesController');

// Rutas RESTful
router.post('/', clientesController.registrarCliente);
router.get('/', clientesController.getClientes);

// 🔎 (Opcional) Chequeo previo: ¿cliente tiene solicitudes Pendientes?
// IMPORTANTE: debe ir antes de '/:id'
router.get('/pendientes', clientesController.verificarPendientesCliente);

router.get('/:id', clientesController.obtenerClientePorId);
router.put('/:id', clientesController.actualizarCliente);

// 🛡️ Elimina con bloqueo (backend ya valida 409 si tiene Pendientes)
router.delete('/:id', clientesController.eliminarCliente);

module.exports = router;
