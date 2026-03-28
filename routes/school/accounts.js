const express = require('express');
const router = express.Router();
const accountController = require('../../controllers/school/accountController');
const { authSchool, adminOnly } = require('../../middleware/authSchool');

// Authenticated routes (any logged-in user can view)
router.get('/balance', authSchool, accountController.getBalance);
router.get('/transactions', authSchool, accountController.getTransactions);
router.get('/summary', authSchool, accountController.getSummary);

// Admin only routes
router.post('/income', authSchool, adminOnly, accountController.addIncome);
router.post('/expense', authSchool, adminOnly, accountController.addExpense);

module.exports = router;