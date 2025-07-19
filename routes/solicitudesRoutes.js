const express = require('express');
const router = express.Router();
const controller = require('../controllers/solicitudesController');

// ✅ NUEVA ruta para aceptar POST /api/solicitudes
router.post('/', controller.registrarSolicitud);

// Registro de solicitud
router.post('/registrar', controller.registrarSolicitud);

// Agregar productos en bloque
router.post('/:solicitud_id/detalle', controller.agregarDetalleBloque);

// Agregar producto individual
router.post('/detalle', controller.agregarDetalle);

// Editar producto de solicitud
router.put('/detalle/:detalle_id', controller.editarDetalle);

// Eliminar producto de solicitud
router.delete('/detalle/:detalle_id', controller.eliminarDetalle);

// Obtener solicitudes por usuario
router.get('/usuario/:id', controller.obtenerSolicitudesPorUsuario);

// Obtener productos de una solicitud
router.get('/detalle/:solicitud_id', controller.obtenerDetalle);

// Ver historial con filtros
router.get('/historial', controller.historialSolicitudes);

// Obtener una solicitud por ID
router.get('/:solicitud_id', controller.obtenerSolicitudPorId);

// Generar PDF por solicitud
router.get('/:id/pdf', controller.generarPDFSolicitud);


module.exports = router;
