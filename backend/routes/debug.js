const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/authMiddleware');
const debugController = require('../controllers/debugController');

router.use(requireAuth);

router.get('/consolidated-headers', debugController.getConsolidatedHeaders);

module.exports = router;
