const express = require('express');
const router = express.Router();
const transactionController = require('../../controllers/cyber/transactionController');
const { authCyber } = require('../../middleware/authCyber');

router.get('/', authCyber, transactionController.getAllTransactions);
router.post('/expenses', authCyber, transactionController.addExpense);
router.get('/expenses/last', authCyber, transactionController.getLastExpense);

module.exports = router;