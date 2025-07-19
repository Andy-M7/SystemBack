const express = require('express');
const router = express.Router();
const productosController = require('../controllers/productosController');

// Ruta para listar todos los productos
router.get('/', productosController.listarProductos);

// Ruta para buscar productos por código o nombre (usar ?q=)
router.get('/buscar', productosController.buscarProducto);

// Ruta para obtener solo productos activos
router.get('/activos', productosController.productosActivos);

// Ruta para registrar un nuevo producto
router.post('/', productosController.registrarProducto);

// Ruta para listar todos los productos
router.get('/listar', productosController.listarProductos);

//Ruta para estado
router.put('/estado/:codigo', productosController.cambiarEstadoProducto);

// Ruta para actualizar un producto existente
router.put('/:codigo', productosController.actualizarProducto);

// Ruta para importar productos desde archivo Excel
router.post('/importar-productos', productosController.importarProductos);





module.exports = router;
