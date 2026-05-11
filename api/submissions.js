const fs = require('fs');

const SUBMISSIONS_PATH = '/tmp/submissions.json';

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method Not Allowed' });

  try {
    if (!fs.existsSync(SUBMISSIONS_PATH)) return res.status(200).json([]);
    const submissions = JSON.parse(fs.readFileSync(SUBMISSIONS_PATH, 'utf8'));
    return res.status(200).json(submissions);
  } catch (err) {
    console.error('Error:', err);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
};
