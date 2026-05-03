const initSqlJs = require('sql.js');
const fs = require('fs');

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const DB_PATH = '/tmp/contact.db';
  const SQL = await initSqlJs();
  let db;

  if (fs.existsSync(DB_PATH)) {
    const buf = fs.readFileSync(DB_PATH);
    db = new SQL.Database(buf);
  } else {
    return res.status(200).json([]);
  }

  const result = db.exec('SELECT * FROM submissions ORDER BY date DESC');
  if (!result[0]) {
    return res.status(200).json([]);
  }

  const cols = result[0].columns;
  const rows = result[0].values.map(row => {
    return cols.reduce((obj, col, i) => { obj[col] = row[i]; return obj; }, {});
  });

  return res.status(200).json(rows);
};
