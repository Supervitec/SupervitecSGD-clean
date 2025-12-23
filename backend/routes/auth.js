const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { requireAuth } = require('../middleware/authMiddleware');

router.get('/google', authController.initiateGoogleAuth);


router.get('/google/callback', authController.googleCallback);


router.get('/me', requireAuth, authController.getCurrentUser);


router.post('/logout', authController.logout);

module.exports = router;
