const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/authMiddleware');
const ctrl = require('../controllers/preopUsersController');

router.get('/public', ctrl.getPublicList);

router.use(requireAuth);
router.get('/', ctrl.getAllForAdmin);
router.post('/', ctrl.saveAll);

module.exports = router;