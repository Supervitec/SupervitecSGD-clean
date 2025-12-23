const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/authMiddleware');
const reviewController = require('../controllers/reviewController');

router.use(requireAuth);

router.get('/months', reviewController.getMonths);
router.get('/', reviewController.getReview);
router.put('/observacion', reviewController.updateObservacionEndpoint);
router.put('/mantenimientos', reviewController.updateMantenimientosEndpoint);
router.put('/recibos', reviewController.updateRecibosEndpoint);
router.post('/citar-automatico', reviewController.citarAutomatico);


module.exports = router;
