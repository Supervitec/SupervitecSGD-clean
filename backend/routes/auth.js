const express = require('express');
const router = express.Router();
const { google } = require('googleapis');
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
    
    req.session.userId = data.id;
    req.session.userEmail = data.email;
    req.session.userName = data.name;
    req.session.tokens = tokens;
    req.session.isAuthenticated = true;  // ← CRÍTICO
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
      
      console.log('✅ Sesión guardada. Enviando HTML...');
      console.log('Session ID:', req.sessionID);
      
      // ========== RESPONDER CON HTML EN LUGAR DE REDIRECT ==========
      res.send(`
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <title>Autenticando...</title>
            <style>
              * { margin: 0; padding: 0; box-sizing: border-box; }
              body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                height: 100vh;
                display: flex;
                align-items: center;
                justify-content: center;
                color: white;
              }
              .loader {
                text-align: center;
                background: rgba(255,255,255,0.1);
                padding: 3rem;
                border-radius: 16px;
                backdrop-filter: blur(10px);
              }
              .spinner {
                border: 4px solid rgba(255,255,255,0.3);
                border-radius: 50%;
                border-top: 4px solid white;
                width: 50px;
                height: 50px;
                animation: spin 1s linear infinite;
                margin: 0 auto 1.5rem;
              }
              @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
              }
              h2 { margin-bottom: 0.5rem; font-size: 1.5rem; }
              p { opacity: 0.9; font-size: 1rem; }
            </style>
          </head>
          <body>
            <div class="loader">
              <div class="spinner"></div>
              <h2>✅ Autenticación exitosa</h2>
              <p>Redirigiendo al dashboard...</p>
            </div>
            <script>
              setTimeout(() => {
                window.location.href = '${process.env.FRONTEND_URL}/dashboard?auth=success';
              }, 1500);
            </script>
          </body>
        </html>
      `);
    });
    
  } catch (error) {
    console.error('❌ Error en callback:', error);
    res.redirect(`${process.env.FRONTEND_URL}?error=auth_failed&message=${encodeURIComponent(error.message)}`);
  }
});

router.get('/me', requireAuth, authController.getCurrentUser);

router.post('/logout', authController.logout);

module.exports = router;
