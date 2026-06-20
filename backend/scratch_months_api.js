const fs = require('fs');
const path = require('path');

const controllerPath = '/root/IMA-Campus/backend/controllers/aiVerificationController.js';
const routesPath = '/root/IMA-Campus/backend/routes/aiVerificationRoutes.js';

// Add new createMonth and deleteMonth logic
let controllerContent = fs.readFileSync(controllerPath, 'utf8');
const newEndpoints = `
exports.createMonth = async (req, res) => {
    try {
        const { month } = req.body;
        if (!month) return res.status(400).json({ error: "Month is required" });

        const configSetting = await prisma.appSetting.findUnique({ where: { key: 'GSHEET_CONFIGS' } });
        let configs = {};
        if (configSetting && configSetting.value) {
            configs = JSON.parse(configSetting.value);
        }
        
        if (!configs[month]) {
            configs[month] = {};
            await prisma.appSetting.upsert({
                where: { key: 'GSHEET_CONFIGS' },
                update: { value: JSON.stringify(configs) },
                create: { key: 'GSHEET_CONFIGS', value: JSON.stringify(configs) }
            });
        }
        
        res.status(200).json({ message: "Month created successfully" });
    } catch(err) {
        res.status(500).json({ error: "Failed to create month" });
    }
};

exports.deleteMonth = async (req, res) => {
    try {
        const { month } = req.params;
        if (!month) return res.status(400).json({ error: "Month is required" });

        const configSetting = await prisma.appSetting.findUnique({ where: { key: 'GSHEET_CONFIGS' } });
        let configs = {};
        if (configSetting && configSetting.value) {
            configs = JSON.parse(configSetting.value);
        }
        
        if (configs[month]) {
            delete configs[month];
            await prisma.appSetting.upsert({
                where: { key: 'GSHEET_CONFIGS' },
                update: { value: JSON.stringify(configs) },
                create: { key: 'GSHEET_CONFIGS', value: JSON.stringify(configs) }
            });
        }
        
        res.status(200).json({ message: "Month deleted successfully" });
    } catch(err) {
        res.status(500).json({ error: "Failed to delete month" });
    }
};
`;

const exportIndex = controllerContent.lastIndexOf('exports.');
if (exportIndex !== -1) {
    controllerContent = controllerContent + '\n' + newEndpoints;
    fs.writeFileSync(controllerPath, controllerContent);
}

// Add routes
let routesContent = fs.readFileSync(routesPath, 'utf8');
const routeInsertPoint = routesContent.lastIndexOf('module.exports = router;');
if (routeInsertPoint !== -1) {
    const routesAdd = `
router.post('/months', verifyToken, aiVerificationController.createMonth);
router.delete('/months/:month', verifyToken, aiVerificationController.deleteMonth);
`;
    routesContent = routesContent.slice(0, routeInsertPoint) + routesAdd + '\n' + routesContent.slice(routeInsertPoint);
    fs.writeFileSync(routesPath, routesContent);
}
console.log('Backend routes and controllers updated.');
