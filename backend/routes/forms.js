const express = require('express');
const router = express.Router();
const formsController = require('../controllers/formsController');
const { requireAuth } = require('../middleware/authMiddleware');

router.use(requireAuth);

router.get('/', formsController.getForms);

router.get('/:formId', formsController.getFormById);

router.get('/forms/:formId/responses', requireAuth, formsController.getFormResponses);

router.get('/:formId/responses-by-question', formsController.getFormResponsesByQuestion);

router.delete('/:formId', formsController.deleteFormById);

router.get('/:formId/analytics', formsController.getFormAnalytics);

router.get('/:formId/responses/date', formsController.getFormResponsesByDate);
router.get('/:formId/export-csv', formsController.exportFormResponsesToCSV);

router.get('/forms', requireAuth, formsController.getForms);
router.get('/forms/:formId', requireAuth, formsController.getFormById);

router.get('/forms/:formId/analytics', requireAuth, formsController.getFormAnalytics);
router.get('/forms/:formId/responses/date', requireAuth, formsController.getFormResponsesByDate);

module.exports = router;


