const express = require('express');
const cors = require('cors');
const session = require('express-session');
const MongoStore = require('connect-mongo');
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
const PORT = process.env.PORT || 10000; // ← Render usa 10000 por defecto

// ========== CONFIGURACIÓN CRÍTICA ==========

const isProd = process.env.NODE_ENV === 'production';
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/supervitec-sgd';

console.log(`🌍 Entorno: ${isProd ? 'PRODUCCIÓN' : 'DESARROLLO'}`);

// IMPORTANTE: Confiar en el proxy de Render ANTES de todo
app.set('trust proxy', 1);

// ========== MIDDLEWARES ==========

const allowedOrigins = [
  'http://localhost:5173',
  'https://supervitec-sgd-clean.vercel.app'
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    
    console.warn(`⚠️ Origen no permitido: ${origin}`);
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['set-cookie']
}));

app.use(express.json({ limit: '150mb' }));
app.use(express.urlencoded({ limit: '150mb', extended: true }));
app.use(cookieParser());

// ========== SESIÓN CON MONGOSTORE ==========

app.use(session({
  secret: process.env.SESSION_SECRET || '5up3r_v1t3c',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({  // ← Usa .create() para connect-mongo v5+
    mongoUrl: MONGODB_URI,
    touchAfter: 24 * 3600,
    crypto: {
      secret: process.env.SESSION_SECRET || '5up3r_v1t3c'
    }
  }),
  cookie: {
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
    path: '/'
  },
  name: 'connect.sid',
  proxy: true
}));

console.log(`🍪 Cookies secure: ${isProd}`);
console.log(`🔒 SameSite: ${isProd ? 'none' : 'lax'}`);

// attachUser SIEMPRE después de session
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
    timestamp: new Date().toISOString(),
    environment: isProd ? 'production' : 'development',
    session: req.session ? 'active' : 'none'
  });
});

app.get('/api/protected',
  require('./middleware/authMiddleware').requireAuth,
  (req, res) => {
    res.json({
      message: '¡Ruta protegida! Solo usuarios autenticados pueden ver esto',
      user: req.user
    });
  }
);

// ========== MANEJO DE ERRORES ==========

app.use((err, req, res, next) => {
  console.error('❌ Error del servidor:', err);
  res.status(500).json({
    error: 'Error interno del servidor',
    message: isProd ? 'Error interno del servidor' : err.message
  });
});

// ========== CONEXIÓN A MONGODB E INICIO DEL SERVIDOR ==========

mongoose.connect(MONGODB_URI)
  .then(() => {
    console.log('✅ Conectado a MongoDB');
    
    // Iniciar scheduler DESPUÉS de conectar a DB
    preoperationalScheduler.start(null);
    
    // Iniciar servidor
    app.listen(PORT, '0.0.0.0', () => {  // ← IMPORTANTE: bind a 0.0.0.0
      console.log(`\n${'='.repeat(50)}`);
      console.log(`🚀 Servidor Supervitec Dashboard iniciado`);
      console.log(`🌐 URL: https://supervitecsgd.onrender.com`);
      console.log(`🔐 OAuth Callback: ${process.env.REDIRECT_URI}`);
      console.log(`💻 Frontend: ${process.env.FRONTEND_URL}`);
      console.log(`📦 Entorno: ${isProd ? 'PRODUCCIÓN' : 'DESARROLLO'}`);
      console.log(`${'='.repeat(50)}\n`);
    });
  })
  .catch((error) => {
    console.error('❌ Error conectando a MongoDB:', error);
    process.exit(1);
  });

process.on('SIGTERM', () => {
  console.log('SIGTERM recibido, cerrando scheduler...');
  preoperationalScheduler.stop();
  mongoose.connection.close();
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT recibido, cerrando scheduler...');
  preoperationalScheduler.stop();
  mongoose.connection.close();
  process.exit(0);
});
