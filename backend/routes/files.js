const express = require('express');
const router = express.Router();
const fileProcessorController = require('../controllers/fileProcessorController');
const { requireAuth } = require('../middleware/authMiddleware');

router.use(requireAuth);

router.post('/process-attachment', fileProcessorController.processAttachment);

module.exports = router;
