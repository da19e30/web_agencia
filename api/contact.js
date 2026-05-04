const fs = require('fs');

const SUBMISSIONS_PATH = '/tmp/submissions.json';

function parseBody(req) {
  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch (e) { body = null; }
  }
  return body || {};
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  const { name, email, service, budget, message } = parseBody(req);

  if (!name || !email || !message) {
    return res.status(400).json({ error: 'Faltan campos obligatorios (name, email, message)' });
  }
  if (!isValidEmail(email)) {
    return res.status(400).json({ error: 'Formato de email inválido' });
  }

  try {
    let submissions = [];
    if (fs.existsSync(SUBMISSIONS_PATH)) {
      submissions = JSON.parse(fs.readFileSync(SUBMISSIONS_PATH, 'utf8'));
    }

    const newSubmission = {
      id: submissions.length ? submissions[submissions.length - 1].id + 1 : 1,
      name: String(name).trim(),
      email: String(email).trim(),
      service: service ? String(service) : 'No especificado',
      budget: budget ? String(budget) : 'No especificado',
      message: String(message).trim(),
      date: new Date().toISOString(),
    };

    submissions.push(newSubmission);
    fs.writeFileSync(SUBMISSIONS_PATH, JSON.stringify(submissions, null, 2));

    return res.status(200).json({ success: true, message: 'Mensaje enviado correctamente' });
  } catch (err) {
    console.error('Error:', err);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
};
