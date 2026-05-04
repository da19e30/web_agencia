const fs = require('fs');

// Path to temporary JSON file for submissions (Vercel /tmp is writable)
const SUBMISSIONS_PATH = '/tmp/submissions.json';

/**
 * Simple validation helpers
 */
const isValidEmail = (email) => /^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$/.test(email);

module.exports = async (req, res) => {
  // Enable CORS for any origin (adjust in production as needed)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { name, email, service = 'No especificado', budget = 'No especificado', message } = req.body || {};

  // Basic validation
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
    // Load existing submissions from /tmp or start with empty array
    let submissions = [];
    if (fs.existsSync(SUBMISSIONS_PATH)) {
      const raw = fs.readFileSync(SUBMISSIONS_PATH, 'utf8');
      submissions = JSON.parse(raw);
    }

    const newSubmission = {
      id: submissions.length ? submissions[submissions.length - 1].id + 1 : 1,
      name,
      email,
      service,
      budget,
      message,
      date: new Date().toISOString(),
    };
    submissions.push(newSubmission);

    // Persist back to /tmp (atomic write)
    fs.writeFileSync(SUBMISSIONS_PATH, JSON.stringify(submissions, null, 2));

    return res.status(200).json({ success: true, message: 'Mensaje enviado correctamente' });
  } catch (err) {
    console.error('Error handling contact submission:', err);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
};
