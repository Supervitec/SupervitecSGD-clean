const express = require('express');
const router = express.Router();
const preoperationalController = require('../controllers/preoperationalController');

// 🔥 RUTAS ESTÁTICAS PRIMERO (sin parámetros dinámicos)
router.get('/check-availability', preoperationalController.checkCanFillToday);
router.get('/sanctions', preoperationalController.getUserSanctions);
router.get('/history', preoperationalController.getUserHistory);
router.get('/users-list', preoperationalController.getUsersList);
router.get('/daily-status', preoperationalController.getDailyStatus); // 👈 ANTES de /form/:type
router.get('/user-calendar', preoperationalController.getUserCalendar);

// 🔥 RUTAS CON PARÁMETROS DESPUÉS
router.get('/form/:type', preoperationalController.getForm);
router.post('/submit/:type', preoperationalController.submitPreop);

// 🔥 POST ROUTES
router.post('/sync-review', preoperationalController.syncReview);
router.post('/check-missed', preoperationalController.checkMissedPreoperationals);

router.post('/test-scheduler', async (req, res) => {
  try {
    const preoperationalScheduler = require('../services/preoperationalScheduler');

    console.log('⏰ Ejecutando verificación manual del scheduler...');

    await preoperationalScheduler.runManualCheck(null);

    res.json({
      success: true,
      message: 'Verificación manual completada. Revisa los logs del servidor.',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error(' Error en test scheduler:', error);
    res.status(500).json({
      error: 'Error ejecutando scheduler',
      message: error.message,
    });
  }
});

module.exports = router;
