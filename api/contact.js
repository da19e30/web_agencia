const fs = require('fs');

const SUBMISSIONS_PATH = '/tmp/submissions.json';

// Helper to parse body if it's a string
function parseBody(req) {
  let body = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch (e) {
      body = null;
    }
  }
  return body || {};
}

// Email validation regex
function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const body = parseBody(req);
  const { name, email, service, budget, message } = body;

  // Validation
  if (!name || !email || !message) {
    return res.status(400).json({ error: 'Faltan campos obligatorios (name, email, message)' });
  }
  if (!isValidEmail(email)) {
    return res.status(400).json({ error: 'Formato de email inválido' });
  }
  if (name.length > 100 || message.length > 1000) {
    return res.status(400).json({ error: 'Campos demasiado largos' });
  }

  try {
    let submissions = [];
    if (fs.existsSync(SUBMISSIONS_PATH)) {
      const raw = fs.readFileSync(SUBMISSIONS_PATH, 'utf8');
      submissions = JSON.parse(raw);
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
    console.error('Error handling contact submission:', err);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}

module.exports = handler;
export default handler;
