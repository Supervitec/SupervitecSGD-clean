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
 * Con refresco automático de token si expiró
 */
exports.requireAuth = async (req, res, next) => {
  console.log(`[AuthMiddleware] Verificando: ${req.method} ${req.originalUrl}`);
  
  if (!req.session?.isAuthenticated || !req.session?.tokens) {
    return res.status(401).json({
      error: 'No autenticado',
      message: 'Debes iniciar sesión con Google'
    });
  }

  const now = Date.now();
  const expiryDate = req.session.tokens.expiry_date;

  if (now >= expiryDate) {
    console.log(' Token expirado, intentando refrescar...');
    
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
      console.log(' Token refrescado');
    } catch (error) {
      console.error(' Error refrescando token:', error);
      return res.status(401).json({
        error: 'Token expirado',
        message: 'No se pudo refrescar el token'
      });
    }
  }

  next();
};
