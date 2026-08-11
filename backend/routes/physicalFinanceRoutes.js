const express = require('express');
const router = express.Router();
const physicalFinanceController = require('../controllers/physicalFinanceController');

// Transactions
router.get('/transactions', physicalFinanceController.getTransactions);
router.post('/transactions', physicalFinanceController.addTransaction);
router.delete('/transactions/:id', physicalFinanceController.deleteTransaction);

// Global Settings
router.get('/settings/default-reg-fee', physicalFinanceController.getDefaultRegFee);
router.post('/settings/default-reg-fee', physicalFinanceController.setDefaultRegFee);

module.exports = router;
