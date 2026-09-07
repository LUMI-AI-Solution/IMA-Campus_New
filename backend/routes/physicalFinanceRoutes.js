const express = require('express');
const router = express.Router();
const physicalFinanceController = require('../controllers/physicalFinanceController');

// Categories
router.get('/categories', physicalFinanceController.getCategories);
router.post('/categories', physicalFinanceController.addCategory);
router.put('/categories/:id', physicalFinanceController.updateCategory);
router.delete('/categories/:id', physicalFinanceController.deleteCategory);

// Transactions
router.get('/transactions', physicalFinanceController.getTransactions);
router.post('/transactions', physicalFinanceController.addTransaction);
router.delete('/transactions/:id', physicalFinanceController.deleteTransaction);

// Trash & Deleted Audit
router.get('/trash', physicalFinanceController.getTrashTransactions);
router.post('/trash/:id/restore', physicalFinanceController.restoreTransaction);

// Financial Reports & Analytics
router.get('/reports', physicalFinanceController.getReports);

// Global Settings
router.get('/settings/default-reg-fee', physicalFinanceController.getDefaultRegFee);
router.post('/settings/default-reg-fee', physicalFinanceController.setDefaultRegFee);

module.exports = router;
