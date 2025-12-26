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
    
    // Guardar tokens en tokenManager (para admin)
    tokenManager.setAdminTokens(tokens);
    console.log('✅ Tokens de admin guardados en tokenManager');
    
    // Guardar en sesión
    req.session.userId = data.id;
    req.session.userEmail = data.email;
    req.session.userName = data.name;
    req.session.tokens = tokens;
    req.session.isAdmin = true;
    
    console.log('✅ Usuario ADMIN autenticado');
    
    // ========== CRÍTICO: Guardar sesión y enviar HTML ==========
    req.session.save((err) => {
      if (err) {
        console.error('❌ Error guardando sesión:', err);
        return res.redirect(`${process.env.FRONTEND_URL}?error=session_save_failed`);
      }
      
      console.log('✅ Sesión guardada. Redirigiendo al dashboard...');
      console.log('Session ID:', req.sessionID);
      
      // En lugar de redirect, enviar HTML que haga el redirect
      res.send(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Autenticando...</title>
            <style>
              body {
                display: flex;
                align-items: center;
                justify-content: center;
                height: 100vh;
                margin: 0;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
              }
              .loader {
                text-align: center;
              }
              .spinner {
                border: 4px solid rgba(255,255,255,0.3);
                border-radius: 50%;
                border-top: 4px solid white;
                width: 40px;
                height: 40px;
                animation: spin 1s linear infinite;
                margin: 0 auto 20px;
              }
              @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
              }
            </style>
          </head>
          <body>
            <div class="loader">
              <div class="spinner"></div>
              <h2>Autenticación exitosa</h2>
              <p>Redirigiendo al dashboard...</p>
            </div>
            <script>
              // Esperar un momento para que la cookie se establezca
              setTimeout(() => {
                window.location.href = '${process.env.FRONTEND_URL}/dashboard?auth=success';
              }, 1000);
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
