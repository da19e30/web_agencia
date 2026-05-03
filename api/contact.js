const initSqlJs = require('sql.js');
const fs = require('fs');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { name, email, service, budget, message } = req.body;
  if (!name || !email || !message) {
    return res.status(400).json({ error: 'Faltan campos obligatorios' });
  }

  const DB_PATH = '/tmp/contact.db';
  const SQL = await initSqlJs();
  let db;

  if (fs.existsSync(DB_PATH)) {
    const buf = fs.readFileSync(DB_PATH);
    db = new SQL.Database(buf);
  } else {
    db = new SQL.Database();
    db.run(`CREATE TABLE IF NOT EXISTS submissions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      service TEXT,
      budget TEXT,
      message TEXT NOT NULL,
      date TEXT NOT NULL
    )`);
  }

  db.run(
    'INSERT INTO submissions (name, email, service, budget, message, date) VALUES (?,?,?,?,?,?)',
    [name, email, service || 'No especificado', budget || 'No especificado', message, new Date().toISOString()]
  );

  const data = db.export();
  fs.writeFileSync(DB_PATH, Buffer.from(data));

  return res.status(200).json({ success: true, message: 'Mensaje enviado correctamente' });
};
