const express = require('express');
const router = express.Router();
const citationController = require('../controllers/citationController');
const { requireAuth } = require('../middleware/authMiddleware');

router.use(requireAuth);

router.post('/', citationController.createCitation);

router.get('/', citationController.listCitations);

router.patch('/:id/attendance', citationController.markAttendance);

router.post('/unblock/:userId', citationController.unblockUser);

module.exports = router;
