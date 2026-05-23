const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware');

// 1. Module 1 & 2 walata adalawa dataExportController eka gannawa
const dataExportController = require('../controllers/dataExportController'); 

// 2. 🔴 MEKA THAMAI HADA GANNA ONI THAN: 
// Finance matrix ekata adalawa oyage finance controller file eka hariyatama point karanna.
// (File eke nama 'financeController.js' kiyala hithala meka damme, eka wenas nam hari nama danna)
const financeController = require('../controllers/financeController'); 


// Route: GET /api/admin/data-export/matrix
router.get('/matrix', authMiddleware, dataExportController.getModuleOneMatrix);

// Route: GET /api/admin/data-export/module-two
router.get('/module-two', authMiddleware, dataExportController.getModuleTwoAnalytics);

// Route: GET /api/admin/data-export/finance-matrix
// Dan hari financeController eken function eka gannawa
router.get('/finance-matrix', authMiddleware, financeController.getFinanceMatrix);

module.exports = router;