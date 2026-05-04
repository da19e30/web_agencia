const fs = require('fs');
const nodemailer = require('nodemailer');

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

function sendWelcomeEmail(toEmail, name) {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.log('SMTP credencials not set; skipping welcome email.');
    return Promise.resolve();
  }

  const transporter = nodemailer.createTransporter({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  return transporter.sendMail({
    from: process.env.WELCOME_FROM || process.env.SMTP_USER,
    to: toEmail,
    subject: process.env.WELCOME_SUBJECT || 'Gracias por contactarnos',
    text: `Hola ${name},\n\nGracias por contactar con MapGenius Solutions. Hemos recibido tu mensaje y te responderemos pronto.\n\nSaludos,\nMapGenius Team`,
  });
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  const body = parseBody(req);
  const { name, email, service = 'No especificado', budget = 'No especificado', message } = body;

  if (!name || !email || !message) {
    return res.status(400).json({ error: 'Faltan campos obligatorios (name, email, message)' });
  }
  if (!isValidEmail(email)) {
    return res.status(400).json({ error: 'Formato de email invalido' });
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
      service,
      budget,
      message: String(message).trim(),
      date: new Date().toISOString(),
    };

    submissions.push(newSubmission);
    fs.writeFileSync(SUBMISSIONS_PATH, JSON.stringify(submissions, null, 2));

    // Send welcome email (async, don't block response)
    sendWelcomeEmail(email, name).catch(err => console.error('Email error:', err));

    return res.status(200).json({ success: true, message: 'Mensaje enviado correctamente. Te hemos enviado un email de bienvenida.' });
  } catch (err) {
    console.error('Error:', err);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
};
