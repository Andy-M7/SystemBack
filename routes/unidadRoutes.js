const express = require('express');
const router = express.Router();
const unidadController = require('../controllers/unidadController');

// Obtener todas las unidades
router.get('/', unidadController.listarUnidades);

// Buscar unidad por nombre
router.get('/:nombre', unidadController.buscarUnidadPorNombre);

// Registrar nueva unidad
router.post('/', unidadController.registrarUnidad);

// Actualizar nombre de unidad (nombre anterior en URL, nuevo nombre en body)
router.put('/:nombreAnterior', unidadController.actualizarUnidad);

// Eliminar unidad por nombre
router.delete('/:nombre', unidadController.eliminarUnidad);

module.exports = router;
