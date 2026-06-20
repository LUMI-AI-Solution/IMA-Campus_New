const fs = require('fs');

let routesCode = fs.readFileSync('backend/routes/aiVerificationRoutes.js', 'utf8');

if (!routesCode.includes('/gsheet-config/tree')) {
    routesCode = routesCode.replace("module.exports = router;", `
router.get('/gsheet-config/tree', verifyToken, aiVerificationController.getGsheetConfigTree);
router.post('/gsheet-config/tree', verifyToken, aiVerificationController.saveGsheetConfigTree);

module.exports = router;
`);
    fs.writeFileSync('backend/routes/aiVerificationRoutes.js', routesCode);
}
