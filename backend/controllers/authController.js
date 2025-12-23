const { getAuthUrl, getTokenFromCode, getUserInfo } = require('../config/google-auth');
const { setAdminTokens, clearAdminTokens } = require('../services/tokenManager'); 

const ADMIN_EMAIL = 'supervitecapp@gmail.com';

exports.initiateGoogleAuth = (req, res) => {
  try {
    const authUrl = getAuthUrl();
    console.log('🔐 Redirigiendo a Google OAuth...');
    res.redirect(authUrl);
  } catch (error) {
    console.error(' Error iniciando OAuth:', error);
    res.status(500).json({
      error: 'Error al iniciar autenticación',
      details: error.message
    });
  }
};

exports.googleCallback = async (req, res) => {
  console.log('========== INICIO CALLBACK ==========');
  console.log('Query params:', req.query);

  try {
    const { code, error } = req.query;

    if (error) {
      console.error(' Error de Google:', error);
      return res.redirect(
        `${process.env.FRONTEND_URL}/?auth=error&reason=${error}`
      );
    }

    if (!code) {
      console.error(' No se recibió código de autorización');
      return res.redirect(
        `${process.env.FRONTEND_URL}/?auth=error&reason=no_code`
      );
    }

    console.log(' Código recibido, intercambiando por tokens...');
    const tokens = await getTokenFromCode(code);
    console.log(' Tokens obtenidos');

    const userInfo = await getUserInfo(tokens);
    console.log('👤 Info de usuario obtenida:', userInfo.email);

    // Guardar datos en la sesión
    req.session.tokens = tokens;
    req.session.user = userInfo;
    req.session.isAuthenticated = true;
    req.session.isAdmin = userInfo.email === ADMIN_EMAIL;

    if (req.session.isAdmin) {
      setAdminTokens(tokens);
      console.log(' Usuario ADMIN autenticado, tokens registrados globalmente');
    }

    req.session.save((err) => {
      if (err) {
        console.error(' Error guardando sesión:', err);
        return res.redirect(
          `${process.env.FRONTEND_URL}/?auth=error&reason=session_save_failed`
        );
      }

      console.log(' Sesión guardada. Redirigiendo al dashboard...');
      console.log('Session ID:', req.sessionID);
      res.redirect(`${process.env.FRONTEND_URL}/dashboard?auth=success`);
    });
  } catch (error) {
    console.error(' Error en callback:', error);
    res.redirect(
      `${process.env.FRONTEND_URL}/?auth=error&reason=token_exchange_failed`
    );
  }
};

exports.getCurrentUser = (req, res) => {
  console.log(' GET /api/auth/me');
  console.log('Session ID:', req.sessionID);
  console.log('Session data:', req.session);

  if (!req.session || !req.session.isAuthenticated) {
    console.log(' No autenticado');
    return res.status(401).json({
      error: 'No autenticado',
      isAuthenticated: false
    });
  }

  console.log(' Usuario autenticado:', req.session.user.email);
  res.json({
    isAuthenticated: true,
    user: req.session.user,
    isAdmin: !!req.session.isAdmin,
    tokenExpiry: req.session.tokens.expiry_date
      ? new Date(req.session.tokens.expiry_date)
      : null
  });
};

exports.logout = (req, res) => {
  if (req.session.isAdmin) {
    clearAdminTokens();
    console.log(' Tokens de admin limpiados al cerrar sesión');
  }

  req.session.destroy((err) => {
    if (err) {
      console.error(' Error cerrando sesión:', err);
      return res.status(500).json({ error: 'Error al cerrar sesión' });
    }

    console.log(' Sesión cerrada exitosamente');
    res.json({ message: 'Sesión cerrada exitosamente' });
  });
};
