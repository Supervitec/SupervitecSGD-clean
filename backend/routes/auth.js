const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { requireAuth } = require('../middleware/authMiddleware');

router.get('/google', authController.initiateGoogleAuth);


router.get('/google/callback', async (req, res) => {
  try {
    const { code } = req.query;
    
    console.log('========== INICIO CALLBACK ==========');
    console.log('Query params:', req.query);

    if (!code) {
      return res.redirect(`${process.env.FRONTEND_URL}?error=no_code`);
    }

    // Intercambiar código por tokens...
    const { tokens } = await oauth2Client.getToken(code);
    
    console.log('✅ Tokens obtenidos');
    
    oauth2Client.setCredentials(tokens);
    
    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
    const { data } = await oauth2.userinfo.get();
    
    console.log(`👤 Info de usuario obtenida: ${data.email}`);
    
    // Guardar en sesión
    req.session.userId = data.id;
    req.session.userEmail = data.email;
    req.session.tokens = tokens;
    
    // ========== Guardar sesión ANTES de redirect ==========
    req.session.save((err) => {
      if (err) {
        console.error('❌ Error guardando sesión:', err);
        return res.redirect(`${process.env.FRONTEND_URL}?error=session_save_failed`);
      }
      
      console.log('✅ Sesión guardada. Redirigiendo al dashboard...');
      console.log('Session ID:', req.sessionID);
      
      res.redirect(`${process.env.FRONTEND_URL}/dashboard?auth=success`);
    });
    
  } catch (error) {
    console.error('❌ Error en callback:', error);
    res.redirect(`${process.env.FRONTEND_URL}?error=auth_failed`);
  }
});


router.get('/me', requireAuth, authController.getCurrentUser);


router.post('/logout', authController.logout);

module.exports = router;
