const express = require('express');
const path = require('path');
const fs = require('fs');
const initSqlJs = require('sql.js');

const app = express();
const PORT = 3000;
const DB_FILE = path.join(__dirname, 'contact.db');

// Inicializa sql.js y luego arranca el servidor
initSqlJs().then(SQL => {
  // Carga BD existente o crea una nueva
  let db;
  if (fs.existsSync(DB_FILE)) {
    const buf = fs.readFileSync(DB_FILE);
    db = new SQL.Database(buf);
  } else {
    db = new SQL.Database();
  }

  // Crea la tabla si no existe
  db.run(`CREATE TABLE IF NOT EXISTS submissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    service TEXT,
    budget TEXT,
    message TEXT NOT NULL,
    date TEXT NOT NULL
  )`);

  // Función para guardar la BD en disco
  function persist() {
    const data = db.export();
    fs.writeFileSync(DB_FILE, Buffer.from(data));
  }

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(express.static(__dirname));

  // Endpoint para recibir el formulario
  app.post('/api/contact', (req, res) => {
    const { name, email, service, budget, message } = req.body;
    if (!name || !email || !message) {
      return res.status(400).json({ error: 'Faltan campos obligatorios' });
    }
    try {
      db.run(
        'INSERT INTO submissions (name, email, service, budget, message, date) VALUES (?,?,?,?,?,?)',
        [name, email, service || 'No especificado', budget || 'No especificado', message, new Date().toISOString()]
      );
      persist();
      res.json({ success: true, message: 'Mensaje enviado correctamente' });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  });

  // Endpoint para consultar envíos (útil para debug)
  app.get('/api/submissions', (req, res) => {
    try {
      const result = db.exec('SELECT * FROM submissions ORDER BY date DESC');
      if (!result[0]) return res.json([]);
      const cols = result[0].columns;
      const rows = result[0].values.map(row => {
        return cols.reduce((obj, col, i) => { obj[col] = row[i]; return obj; }, {});
      });
      res.json(rows);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  });

  app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
  });
});
