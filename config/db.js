const mysql = require('mysql2');

const db = mysql.createConnection({
  host: 'localhost',
  user: 'Andy',  
  password: '1234',  
  database: 'Grupo_Bax', 
});

db.connect((err) => {
  if (err) {
    console.error('Error de conexión a la base de datos: ' + err.stack);
    return;
  }
  console.log('Conectado a la base de datos MySQL');
});

module.exports = db;
