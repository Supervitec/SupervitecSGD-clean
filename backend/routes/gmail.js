const express = require('express');
const router = express.Router();
const gmailController = require('../controllers/gmailController');
const { requireAuth } = require('../middleware/authMiddleware');

router.use(requireAuth);
router.get('/emails', gmailController.getEmails);

router.get('/search', gmailController.searchEmails);

router.get('/projects', gmailController.getProjectEmails);

router.get('/email/:id', gmailController.getEmailById);

router.get('/email/:id/full', gmailController.getEmailWithAttachments);

router.get('/attachment/:messageId/:attachmentId', gmailController.downloadAttachment);

module.exports = router;
