const express = require('express');
const router = express.Router();
const feeController = require('../../controllers/school/feeController');
const { authSchool, adminOnly } = require('../../middleware/authSchool');

// Admin routes
router.get('/', authSchool, feeController.getAllFees);
router.post('/', authSchool, adminOnly, feeController.recordPayment);

// Student-specific routes (with auth)
router.get('/student/:regNumber', authSchool, feeController.getFeesByStudent);
router.get('/summary/:regNumber', authSchool, feeController.getFeeSummary);

module.exports = router;