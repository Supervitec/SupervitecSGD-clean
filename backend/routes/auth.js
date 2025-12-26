const express = require('express');
const router = express.Router();
const { google } = require('googleapis');
const jwt = require('jsonwebtoken');
const authController = require('../controllers/authController');
const { requireAuth } = require('../middleware/authMiddleware');
const tokenManager = require('../services/tokenManager');

// ========== IMPORTAR OAUTH2CLIENT DESDE CONFIG ==========
const { oauth2Client } = require('../config/google-auth');

router.get('/google', authController.initiateGoogleAuth);

router.get('/google/callback', async (req, res) => {
  try {
    const { code } = req.query;
    
    console.log('========== INICIO CALLBACK ==========');
    console.log('Query params:', req.query);

    if (!code) {
      return res.redirect(`${process.env.FRONTEND_URL}?error=no_code`);
    }

    console.log('✅ Código recibido, intercambiando por tokens...');

    const { tokens } = await oauth2Client.getToken(code);
    
    console.log('✅ Tokens obtenidos');
    
    oauth2Client.setCredentials(tokens);
    
    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
    const { data } = await oauth2.userinfo.get();
    
    console.log(`👤 Info de usuario obtenida: ${data.email}`);
    
    tokenManager.setAdminTokens(tokens);
    console.log('✅ Tokens de admin guardados en tokenManager');
    
    // Guardar en sesión
    req.session.userId = data.id;
    req.session.userEmail = data.email;
    req.session.userName = data.name;
    req.session.tokens = tokens;
    req.session.isAuthenticated = true;
    req.session.user = {
      email: data.email,
      name: data.name,
      picture: data.picture
    };
    req.session.isAdmin = data.email === 'supervitecapp@gmail.com';
    
    console.log('✅ Usuario ADMIN autenticado');
    
    req.session.save((err) => {
      if (err) {
        console.error('❌ Error guardando sesión:', err);
        return res.redirect(`${process.env.FRONTEND_URL}?error=session_save_failed`);
      }
      
      // ========== GENERAR JWT TEMPORAL ==========
      const authToken = jwt.sign(
        {
          sessionId: req.sessionID,
          email: data.email,
          userId: data.id
        },
        process.env.SESSION_SECRET || '5up3r_v1t3c',
        { expiresIn: '5m' } // Token válido solo 5 minutos
      );
      
      console.log('✅ Sesión guardada. Generando token temporal...');
      console.log('Session ID:', req.sessionID);
      console.log('🔑 Token JWT generado');
      
      // Redirigir con token en URL
      res.redirect(`${process.env.FRONTEND_URL}/dashboard?token=${authToken}`);
    });
    
  } catch (error) {
    console.error('❌ Error en callback:', error);
    res.redirect(`${process.env.FRONTEND_URL}?error=auth_failed&message=${encodeURIComponent(error.message)}`);
  }
});

router.get('/me', requireAuth, authController.getCurrentUser);

router.post('/logout', authController.logout);

module.exports = router;
