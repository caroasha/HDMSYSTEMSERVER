const express = require('express');
const router = express.Router();
const reportController = require('../../controllers/cyber/reportController');
const { authCyber } = require('../../middleware/authCyber');

router.post('/generate', authCyber, reportController.generateReport);

module.exports = router;