const jwt = require('jsonwebtoken');
const { refreshAccessToken } = require('../config/google-auth');

/**
 * Middleware opcional: agrega información del usuario a req
 */
exports.attachUser = (req, res, next) => {
  if (req.session?.user) {
    req.user = req.session.user;
    req.tokens = req.session.tokens;
  }
  next();
};

/**
 * Middleware para verificar si el usuario está autenticado
 * Soporta JWT en header Authorization (primera petición) y sesiones (peticiones subsecuentes)
 */
exports.requireAuth = async (req, res, next) => {
  console.log(`[AuthMiddleware] Verificando: ${req.method} ${req.originalUrl}`);
  
  // ========== 1. VERIFICAR JWT EN HEADER (PRIMERA PETICIÓN DESPUÉS DE LOGIN) ==========
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    console.log('🔑 Token JWT detectado en header Authorization');
    console.log('📏 Longitud del token:', token.length);
    
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log('✅ Token JWT válido para:', decoded.email);
      
      // Establecer sesión desde el JWT
      req.session.isAuthenticated = true;
      req.session.user = {
        email: decoded.email,
        name: decoded.name,
        picture: decoded.picture
      };
      req.session.sessionId = decoded.sessionId;
      
      // Buscar los tokens de Google guardados
      const tokenManager = require('../services/tokenManager');
      const adminTokens = tokenManager.getAdminTokens();
      
      if (adminTokens) {
        req.session.tokens = adminTokens;
        console.log('✅ Tokens de Google recuperados desde tokenManager');
      }
      
      // Guardar sesión
      await new Promise((resolve, reject) => {
        req.session.save((err) => {
          if (err) {
            console.error('❌ Error guardando sesión:', err);
            reject(err);
          } else {
            console.log('✅ Sesión establecida desde JWT');
            resolve();
          }
        });
      });
      
      return next();
    } catch (err) {
      console.error('❌ Token JWT inválido:', err.message);
      // Si el JWT es inválido, continuar a verificar sesión
    }
  }
  
  // ========== 2. VERIFICAR SESIÓN EXISTENTE (PETICIONES SUBSECUENTES) ==========
  if (!req.session?.isAuthenticated || !req.session?.tokens) {
    console.log('❌ No hay sesión válida ni token JWT válido');
    return res.status(401).json({
      error: 'No autenticado',
      message: 'Debes iniciar sesión con Google'
    });
  }

  const now = Date.now();
  const expiryDate = req.session.tokens.expiry_date;

  // ========== 3. REFRESCAR TOKEN DE GOOGLE SI EXPIRÓ ==========
  if (now >= expiryDate) {
    console.log('⏰ Token de Google expirado, intentando refrescar...');
    
    if (!req.session.tokens.refresh_token) {
      return res.status(401).json({
        error: 'Token expirado',
        message: 'Tu sesión ha expirado y no hay refresh token'
      });
    }

    try {
      const newTokens = await refreshAccessToken(req.session.tokens.refresh_token);
      req.session.tokens = {
        ...newTokens,
        refresh_token: req.session.tokens.refresh_token
      };
      await new Promise((resolve, reject) => {
        req.session.save((err) => err ? reject(err) : resolve());
      });
      console.log('✅ Token de Google refrescado');
    } catch (error) {
      console.error('❌ Error refrescando token:', error);
      return res.status(401).json({
        error: 'Token expirado',
        message: 'No se pudo refrescar el token'
      });
    }
  }

  console.log('✅ Usuario autenticado:', req.session.user?.email);
  next();
};
