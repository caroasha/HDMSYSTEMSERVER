const express = require('express');
const router = express.Router();
const certificateController = require('../../controllers/school/certificateController');
const { authSchool, adminOnly } = require('../../middleware/authSchool');

router.get('/next-number/:studentId', authSchool, adminOnly, certificateController.getNextCertificateNumber);

module.exports = router;