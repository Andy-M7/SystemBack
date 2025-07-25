const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');

// Rutas importadas
const empleadosRoutes = require('./routes/empleadosRoutes');
const usuariosRoutes = require('./routes/usuariosRoutes');
const authRoutes = require('./routes/authRoutes');
const clientesRoutes = require('./routes/clientesRoutes');
const productosRoutes = require('./routes/productosRoutes');
const unidadRoutes = require('./routes/unidadRoutes');
const solicitudesRoutes = require('./routes/solicitudesRoutes');

const app = express();
const port = 5000;

// Servir archivos estáticos desde /public
app.use(express.static(path.join(__dirname, 'public')));

// ⭐️ Servir PDFs estáticos desde /assets/pdfs como /pdfs ⭐️
app.use('/pdfs', express.static(path.join(__dirname, 'assets/pdfs')));

// Middleware global
app.use(cors());
app.use(bodyParser.json());

// Log de todas las solicitudes
app.use((req, res, next) => {
  console.log(`[${req.method}] ${req.originalUrl}`);
  next();
});

// Rutas reales
app.use('/empleados', empleadosRoutes);
app.use('/api/usuarios', usuariosRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/clientes', clientesRoutes);
app.use('/api/productos', productosRoutes);
app.use('/api/unidades', unidadRoutes);
app.use('/api/solicitudes', solicitudesRoutes);

// Middleware de error global
app.use((err, req, res, next) => {
  console.error('🔥 Error:', err);
  res.status(500).json({ error: 'Error interno del servidor' });
});

// Inicio del servidor
app.listen(port, '0.0.0.0', () => {
  console.log(`✅ Servidor corriendo en http://0.0.0.0:${port}`);
});
