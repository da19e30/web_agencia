const express = require('express');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const nodemailer = require('nodemailer');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 80;

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5, // Limitar cada IP a 5 solicitudes por ventana
  message: 'Demasiadas solicitudes. Por favor, intenta de nuevo en 15 minutos.'
});
app.use('/api/contact', limiter);

// Database file path
const DB_FILE = path.join(__dirname, 'contact.db');

// Initialize sql.js
let db;
(async () => {
  const initSqlJs = require('sql.js');
  const SQL = await initSqlJs();
  // Carga BD existente o crea una nueva
  if (fs.existsSync(DB_FILE)) {
    const buf = fs.readFileSync(DB_FILE);
    db = new SQL.Database(buf);
  } else {
    db = new SQL.Database();
  }

  // Crea la tabla si no existe
  db.run(`CREATE TABLE IF NOT EXISTS submissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    service TEXT,
    budget TEXT,
    message TEXT NOT NULL,
    date TEXT NOT NULL
  )`);
})();

// Email transport (Nodemailer with SendGrid)
const transporter = nodemailer.createTransport({
  host: 'smtp.sendgrid.net',
  port: 587,
  secure: false,
  auth: {
    user: 'apikey',
    pass: process.env.SENDGRID_API_KEY,
  },
});

/**
 * Generate HTML template for contact notifications
 */
function generateContactEmailTemplate(data) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; margin: 0; padding: 20px; background-color: #f8f9fa; }
        .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .header { background-color: #10B981; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; }
        .info-item { margin: 10px 0; padding: 10px; background-color: #f3f4f6; border-radius: 4px; }
        .label { font-weight: 600; color: #374151; }
        .footer { text-align: center; padding: 15px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 0.9em; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Nuevo Mensaje de Contacto</h1>
          <p>MapGenius Solutions</p>
        </div>
        <div class="content">
          <div class="info-item">
            <span class="label">Nombre:</span> ${data.name}
          </div>
          <div class="info-item">
            <span class="label">Email:</span> <a href="mailto:${data.email}">${data.email}</a>
          </div>
          ${data.service !== 'No especificado' ? `
          <div class="info-item">
            <span class="label">Servicio:</span> ${data.service}
          </div>
          ` : ''}
          ${data.budget !== 'No especificado' ? `
          <div class="info-item">
            <span class="label">Presupuesto:</span> ${data.budget}
          </div>
          ` : ''}
          <div class="info-item">
            <span class="label">Mensaje:</span>
            <p style="margin: 5px 0; white-space: pre-wrap;">${data.message}</p>
          </div>
          <div class="info-item">
            <span class="label">Fecha:</span> ${new Date(data.date).toLocaleString('es-ES')}
          </div>
        </div>
        <div class="footer">
          <p>Este es un mensaje automático. Por favor, responde directamente a este correo.</p>
          <p>&copy; 2026 MapGenius Solutions</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

/**
 * Send contact email to the business owner
 */
async function sendContactEmail(data) {
  try {
    const mailOptions = {
      from: process.env.SENDER_EMAIL || 'contacto@mapgenius.com',
      to: process.env.RECIPIENT_EMAIL || 'victor@mapgenius.com',
      subject: `Nuevo mensaje de ${data.name} - MapGenius`,
      html: generateContactEmailTemplate(data),
    };

    await transporter.sendMail(mailOptions);
    console.log('Contact email sent successfully');
  } catch (error) {
    console.error('Error sending contact email:', error);
    // Don't throw, just log - we still want to respond to the client
  }
}

/**
 * Send welcome email to new registered users
 */
async function sendWelcomeEmail(toEmail, name, company = '') {
  if (!process.env.WELCOME_FROM) return;

  const welcomeTemplate = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; margin: 0; padding: 0; background-color: #f8f9fa; }
        .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .header { background-color: #10B981; color: white; padding: 40px 30px; text-align: center; }
        .header h1 { margin: 0; font-size: 28px; }
        .content { padding: 40px 30px; }
        .welcome-message { margin-bottom: 30px; }
        .welcome-message p { margin: 0 0 20px 0; font-size: 16px; line-height: 1.6; color: #374151; }
        .cta-button { display: inline-block; background-color: #10B981; color: white; padding: 15px 30px; border-radius: 999px; text-decoration: none; font-weight: 600; font-size: 16px; transition: background-color 0.3s; }
        .cta-button:hover { background-color: #059669; }
        .features { background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 30px 0; }
        .features h3 { margin-top: 0; color: #374151; }
        .features ul { list-style: none; padding: 0; }
        .features li { margin: 10px 0; padding-left: 25px; position: relative; }
        .features li::before { content: "✓"; position: absolute; left: 0; color: #10B981; font-weight: bold; }
        .footer { text-align: center; padding: 20px; border-top: 1px solid #e5e7eb; color: #6b7280; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>¡Bienvenido a MapGenius!</h1>
        </div>
        <div class="content">
          <div class="welcome-message">
            <p>Hola <strong>${name}</strong>,</p>
            <p>Gracias por registrarte en nuestra plataforma. Estamos emocionados de que formes parte de nuestra comunidad.</p>
            ${company ? `<p><strong>Tu empresa:</strong> ${company}</p>` : ''}
            <p>Nuestra misión es ayudarte a crear webs profesionales con animaciones de scroll que impulsen tu negocio.</p>
          </div>

          <a href="https://mapgenius.com/dashboard" class="cta-button">
            Acceder a tu cuenta
          </a>

          <div class="features">
            <h3>Lo que te ofrecemos:</h3>
            <ul>
              <li>Diseños modernos y profesionales</li>
              <li>Animaciones de scroll impresionantes</li>
              <li>Optimización SEO integrada</li>
              <li>Soporte prioritario 24/7</li>
            </ul>
          </div>

          <p style="text-align: center; margin: 30px 0;">
            Si tienes alguna pregunta, responde a este correo o contáctanos en <a href="mailto:info@mapgenius.com">info@mapgenius.com</a>.
          </p>
        </div>
        <div class="footer">
          <p>&copy; 2026 MapGenius Solutions. Todos los derechos reservados.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  try {
    await transporter.sendMail({
      from: process.env.WELCOME_FROM || 'welcome@mapgenius.com',
      to: toEmail,
      subject: '¡Bienvenido a MapGenius! Tu cuenta está lista',
      html: welcomeTemplate,
    });
    console.log('Welcome email sent successfully');
  } catch (error) {
    console.error('Error sending welcome email:', error);
  }
}

/**
 * Main contact endpoint
 */
app.post('/api/contact', async (req, res) => {
  const { name, email, service = 'No especificado', budget = 'No especificado', message } = req.body;

  // Basic spam check
  const spamKeywords = ['http://', 'https://', 'www.', ' spam ', ' viagra ', 'cialis', 'xxx', 'porn'];
  if (spamKeywords.some(keyword => (name + ' ' + email + ' ' + service + ' ' + budget + ' ' + message).toLowerCase().includes(keyword.toLowerCase()))) {
    return res.status(400).json({ error: 'Contenido no válido detectado' });
  }

  // Basic validation
  if (!name || !email || !message) {
    return res.status(400).json({ error: 'Faltan campos obligatorios (nombre, email, mensaje)' });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Formato de email inválido' });
  }

  try {
    // Persist submission to database
    await db.run(
      'INSERT INTO submissions (name, email, service, budget, message, date) VALUES (?,?,?,?,?,?)',
      [name, email, service, budget, message, new Date().toISOString()]
    );

    // Send contact email to business owner
    await sendContactEmail({ name, email, service, budget, message, date: new Date().toISOString() });

    // If registration data is provided, send welcome email
    if (req.body.company) {
      await sendWelcomeEmail(email, name, req.body.company);
    }

    res.json({ success: true, message: '¡Mensaje enviado correctamente! Hemos recibido tu mensaje y te responderemos en menos de 24 horas.' });
  } catch (err) {
    console.error('Error processing contact form:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

/**
 * Optional: endpoint to fetch all submissions (useful for admin debugging)
 */
app.get('/api/submissions', async (req, res) => {
  try {
    const result = await db.exec('SELECT * FROM submissions ORDER BY date DESC');
    if (!result.length) return res.json([]);
    const cols = result[0].columns;
    const rows = result[0].values.map(row => {
      return cols.reduce((obj, col, i) => { obj[col] = row[i]; return obj; }, {});
    });
    res.json(rows);
  } catch (err) {
    console.error('Error fetching submissions:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

/**
 * Registration endpoint for new users
 */
app.post('/api/register', async (req, res) => {
  const { name, email, company, password } = req.body;

  // Basic validation
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Faltan campos obligatorios (nombre, email, contraseña)' });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Formato de email inválido' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });
  }

  try {
    // Here you would typically save to a users table
    // For now, just send welcome email
    await sendWelcomeEmail(email, name, company);

    res.json({ success: true, message: '¡Registro exitoso! Hemos enviado un correo de bienvenida a tu email.' });
  } catch (err) {
    console.error('Error processing registration:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

/**
 * Serve static files (HTML, CSS, JS) from the project root
 */
app.use(express.static(path.join(__dirname)));

app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
});