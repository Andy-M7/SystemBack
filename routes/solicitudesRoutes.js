const express = require('express');
const router = express.Router();
const controller = require('../controllers/solicitudesController');

// =====================
//      CRUD Solicitud
// =====================
// Registrar nueva solicitud
router.post('/', controller.registrarSolicitud);

// (OPCIONAL) Si no usas /registrar explícitamente, puedes eliminar esta.
// router.post('/registrar', controller.registrarSolicitud);

// =====================
//    Detalle productos
// =====================
// Agregar productos en bloque a solicitud existente
router.post('/:solicitud_id/detalle', controller.agregarDetalleBloque);

// Agregar producto individual a una solicitud (se puede mantener si usas esta vía también)
router.post('/detalle', controller.agregarDetalle);

// Editar producto de solicitud
router.put('/detalle/:detalle_id', controller.editarDetalle);

// Eliminar producto de solicitud
router.delete('/detalle/:detalle_id', controller.eliminarDetalle);

// =====================
//    Consultas variadas
// =====================
// Obtener solicitudes por usuario
router.get('/usuario/:id', controller.obtenerSolicitudesPorUsuario);

// Obtener productos de una solicitud
router.get('/detalle/:solicitud_id', controller.obtenerDetalle);

// Historial con filtros (query params)
router.get('/historial', controller.historialSolicitudes);

// Obtener una solicitud por ID
router.get('/:solicitud_id', controller.obtenerSolicitudPorId);

// =====================
//      PDF FUNCTIONS
// =====================

// Recomendado (para generar y GUARDAR el PDF en disco)
router.post('/:id/generar_pdf', controller.generarYGuardarPDFSolicitud);

// Descargar el PDF previamente generado
router.get('/:id/descargar_pdf', controller.descargarPDFSolicitud);

// (OPCIONAL LEGACY: Generar Y ENVIAR PDF AL VUELO, no guardar - si quieres mantenerlo; si NO, puedes quitarlo)
//router.get('/:id/pdf', controller.generarPDFSolicitud);

module.exports = router;
