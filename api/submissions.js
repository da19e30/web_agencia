const fs = require('fs');

const SUBMISSIONS_PATH = '/tmp/submissions.json';

async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    if (!fs.existsSync(SUBMISSIONS_PATH)) {
      return res.status(200).json([]);
    }
    const raw = fs.readFileSync(SUBMISSIONS_PATH, 'utf8');
    const submissions = JSON.parse(raw);
    return res.status(200).json(submissions);
  } catch (err) {
    console.error('Error reading submissions:', err);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}

module.exports = handler;
export default handler;
