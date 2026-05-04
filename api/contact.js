const sqlite3 = require('sqlite3').verbose();
const nodemailer = require('nodemailer');

const DB_PATH = '/tmp/contact.db';

function openDB() {
  const db = new sqlite3.Database(DB_PATH);
  db.run(`CREATE TABLE IF NOT EXISTS submissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    service TEXT,
    budget TEXT,
    message TEXT NOT NULL,
    date TEXT NOT NULL
  )`);
  return db;
}

function insertSubmission(db, { name, email, service, budget, message, date }) {
  return new Promise((resolve, reject) => {
    db.run(
      'INSERT INTO submissions (name, email, service, budget, message, date) VALUES (?,?,?,?,?,?)',
      [name, email, service, budget, message, date],
      function(err) { if (err) reject(err); else resolve(this.lastID); }
    );
  });
}

function sendWelcomeEmail(toEmail, name) {
  const transporter = nodemailer.createTransporter({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  const mailOptions = {
    from: process.env.WELCOME_FROM || process.env.SMTP_USER,
    to: toEmail,
    subject: process.env.WELCOME_SUBJECT || 'Gracias por contactarnos',
    text: `Hola ${name},\n\nGracias por contactar con MapGenius Solutions. Hemos recibido tu mensaje y te responderemos pronto.\n\nSaludos,\nMapGenius Team`,
  };

  return transporter.sendMail(mailOptions);
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  const body = req.body || {};
  const { name, email, service = 'No especificado', budget = 'No especificado', message } = body;

  if (!name || !email || !message) {
    return res.status(400).json({ error: 'Faltan campos obligatorios (name, email, message)' });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Formato de email inválido' });
  }

  let db;
  try {
    db = openDB();
    const date = new Date().toISOString();
    await insertSubmission(db, { name: String(name).trim(), email: String(email).trim(), service, budget, message: String(message).trim(), date });

    if (process.env.SMTP_USER && process.env.SMTP_PASS) {
      try {
        await sendWelcomeEmail(email, name);
      } catch (mailErr) {
        console.error('Email send error:', mailErr);
      }
    } else {
      console.log('SMTP credencials not set; skipping welcome email.');
    }

    db.close();
    return res.status(200).json({ success: true, message: 'Mensaje enviado correctamente. Te hemos enviado un email de bienvenida.' });
  } catch (err) {
    if (db) db.close();
    console.error('Error:', err);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
};
