const express = require('express');
const cors = require('cors');

const allowedOrigins = [
  'http://localhost:5173',
  'https://supervitec-sgd-clean.vercel.app'
];
  
const session = require('express-session');
const cookieParser = require('cookie-parser');
const mongoose = require('mongoose');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const gmailRoutes = require('./routes/gmail');
const driveRoutes = require('./routes/drive');
const formsRouter = require('./routes/forms');
const calendarRoutes = require('./routes/calendar');
const { attachUser } = require('./middleware/authMiddleware');
const preoperationalScheduler = require('./services/preoperationalScheduler');
const citationRoutes = require('./routes/citation');

const app = express();
const PORT = process.env.PORT || 3000;

// ========== CONEXIÓN A MONGODB ==========

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/supervitec-sgd';

mongoose.connect(MONGODB_URI)
  .then(() => console.log(' Conectado a MongoDB'))
  .catch((error) => {
    console.error(' Error conectando a MongoDB:', error);
    process.exit(1);
  });

// ========== MIDDLEWARES ==========
app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true
}));

app.use(express.json({limit: '150mb'}));
app.use(express.urlencoded({ limit: '150mb', extended: true }));
app.use(cookieParser());

app.set('trust proxy', 1);

app.use(session({
  secret: process.env.SESSION_SECRET || '5up3r_v1t3c',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: true,        // obligatorio en producción con HTTPS
    httpOnly: true,
    sameSite: 'none',    // permite enviar cookie entre dominios
    maxAge: 24 * 60 * 60 * 1000
  },
})); 

app.use(attachUser);

// ========== RUTAS ==========

app.use('/api/auth', authRoutes);
app.use('/api/gmail', gmailRoutes);
app.use('/api/drive', driveRoutes);
app.use('/api/forms', formsRouter);
app.use('/api/files', require('./routes/files'));
app.use('/api/users-preop', require('./routes/preopUsers'));
app.use('/api/preop', require('./routes/preoperational'));
app.use('/api/debug', require('./routes/debug'));
app.use('/api/review', require('./routes/review'));
app.use('/api/calendar', calendarRoutes); 
app.use('/api/citations', citationRoutes);

app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Backend Supervitec funcionando',
    timestamp: new Date().toISOString()
  });
});

app.get('/api/protected', require('./middleware/authMiddleware').requireAuth, (req, res) => {
  res.json({
    message: '¡Ruta protegida! Solo usuarios autenticados pueden ver esto',
    user: req.user
  });
});

// ========== SCHEDULER DE PREOPERACIONALES ==========

preoperationalScheduler.start(null);

process.on('SIGTERM', () => {
  console.log('SIGTERM recibido, cerrando scheduler...');
  preoperationalScheduler.stop();
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT recibido, cerrando scheduler...');
  preoperationalScheduler.stop();
  process.exit(0);
});

// ========== MANEJO DE ERRORES ========== 

app.use((err, req, res, next) => {
  console.error('Error del servidor:', err);
  res.status(500).json({
    error: 'Error interno del servidor',
    message: err.message
  });
});

// ========== INICIAR SERVIDOR ==========

app.listen(PORT, () => {
  console.log(`\n${'='.repeat(50)}`);
  console.log(` Servidor Supervitec Dashboard iniciado`);
  console.log(` URL: https://supervitecsgd.onrender.com${PORT}`);
  console.log(` OAuth Callback: ${process.env.REDIRECT_URI}`);
  console.log(` Frontend: ${process.env.FRONTEND_URL}`);
  console.log(`${'='.repeat(50)}\n`);
});