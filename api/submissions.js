const sqlite3 = require('sqlite3').verbose();
const DB_PATH = '/tmp/contact.db';

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method Not Allowed' });

  try {
    const db = new sqlite3.Database(DB_PATH);
    db.all('SELECT * FROM submissions ORDER BY date DESC', [], (err, rows) => {
      db.close();
      if (err) {
        console.error('DB error:', err);
        return res.status(500).json({ error: 'Error interno del servidor' });
      }
      return res.status(200).json(rows || []);
    });
  } catch (err) {
    console.error('Error:', err);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
};
