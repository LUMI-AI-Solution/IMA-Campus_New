const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware');

const dataExportController = require('../controllers/dataExportController'); 
const financeController = require('../controllers/financeController'); 

// Route: GET /api/admin/data-export/module-one
router.get('/module-one', authMiddleware, dataExportController.getModuleOneAnalytics);

// Route: GET /api/admin/data-export/compare-batches
router.get('/compare-batches', authMiddleware, dataExportController.getBatchComparison);

// Route: GET /api/admin/data-export/coordinator-kpi
router.get('/coordinator-kpi', authMiddleware, dataExportController.getCoordinatorKPI);

// Route: GET /api/admin/data-export/finance-matrix
router.get('/finance-matrix', authMiddleware, financeController.getFinanceMatrix);

// Route: GET /api/admin/data-export/paid-campaign
router.get('/paid-campaign', authMiddleware, financeController.getPaidCampaignDropMatrix);

module.exports = router;