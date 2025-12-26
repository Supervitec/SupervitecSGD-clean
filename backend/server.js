const express = require('express');
const cors = require('cors');
const session = require('express-session');
const MongoStore = require('connect-mongo'); // ← Asegúrate de tenerlo instalado
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
  .then(() => console.log('✅ Conectado a MongoDB'))
  .catch((error) => {
    console.error('❌ Error conectando a MongoDB:', error);
    process.exit(1);
  });

// ========== CONFIGURACIÓN CRÍTICA ==========

// IMPORTANTE: Confiar en el proxy de Render ANTES de todo
app.set('trust proxy', 1);

const isProd = process.env.NODE_ENV === 'production';

console.log(`🌍 Entorno: ${isProd ? 'PRODUCCIÓN' : 'DESARROLLO'}`);

// ========== MIDDLEWARES ==========

const allowedOrigins = [
  'http://localhost:5173',
  'https://supervitec-sgd-clean.vercel.app'
];

// CORS ANTES de session
app.use(cors({
  origin: function (origin, callback) {
    // Permitir requests sin origin (Postman, mobile apps, etc)
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
  exposedHeaders: ['set-cookie'] // ← AÑADIR ESTO
}));

// Parsers
app.use(express.json({ limit: '150mb' }));
app.use(express.urlencoded({ limit: '150mb', extended: true }));
app.use(cookieParser());

// ========== SESIÓN CON MONGOSTORE ==========

const sessionStore = new MongoStore({
  mongoUrl: MONGODB_URI,
  touchAfter: 24 * 3600,
  crypto: {
    secret: process.env.SESSION_SECRET || '5up3r_v1t3c'
  }
});

app.use(session({
  secret: process.env.SESSION_SECRET || '5up3r_v1t3c',
  resave: false,
  saveUninitialized: false,
  store: sessionStore, 
  cookie: {
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 24 horas
    secure: isProd,  // true en producción
    sameSite: isProd ? 'none' : 'lax', // 'none' para cross-site en prod
    path: '/'
    // NO poner domain para permitir cross-domain
  },
  name: 'connect.sid',
  proxy: true  // ← CRÍTICO: habilita x-forwarded-proto
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
    session: req.session ? 'active' : 'none' // ← Debug
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

// ========== SCHEDULER ==========

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
  console.error('❌ Error del servidor:', err);
  res.status(500).json({
    error: 'Error interno del servidor',
    message: isProd ? 'Error interno del servidor' : err.message
  });
});

// ========== INICIAR SERVIDOR ==========

app.listen(PORT, () => {
  console.log(`\n${'='.repeat(50)}`);
  console.log(`🚀 Servidor Supervitec Dashboard iniciado`);
  console.log(`🌐 URL: https://supervitecsgd.onrender.com`);
  console.log(`🔐 OAuth Callback: ${process.env.REDIRECT_URI}`);
  console.log(`💻 Frontend: ${process.env.FRONTEND_URL}`);
  console.log(`📦 Entorno: ${isProd ? 'PRODUCCIÓN' : 'DESARROLLO'}`);
  console.log(`${'='.repeat(50)}\n`);
});
