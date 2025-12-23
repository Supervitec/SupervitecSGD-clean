const express = require('express');
const router = express.Router();
const driveController = require('../controllers/driveController');
const { requireAuth } = require('../middleware/authMiddleware');

router.use(requireAuth);

router.get('/files', driveController.getFiles);

router.get('/search', driveController.searchFiles);

router.get('/folders', driveController.getFolders);

router.get('/folder/:folderId', driveController.getFilesInFolder);

router.get('/file/:fileId', driveController.getFileMetadata);

router.get('/projects', driveController.getProjectFiles);

module.exports = router;
