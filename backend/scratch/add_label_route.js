const fs = require('fs');
const path = './backend/routes/deliveryRoutes.js';
let content = fs.readFileSync(path, 'utf8');

if (!content.includes('/admin/delivery/:id/label')) {
    content = content.replace(
        "router.post('/admin/delivery/pack', auth, authorizeRole(['Super Admin', 'Delivery Manager']), packDelivery);",
        "router.put('/admin/delivery/:id/label', auth, authorizeRole(['Super Admin', 'Delivery Manager']), updateDeliveryLabel);\nrouter.post('/admin/delivery/pack', auth, authorizeRole(['Super Admin', 'Delivery Manager']), packDelivery);"
    );
    
    if (content.includes('packDelivery,')) {
        content = content.replace('packDelivery,', 'updateDeliveryLabel, packDelivery,');
    } else {
        content = content.replace('const {', 'const { updateDeliveryLabel,');
    }
    
    fs.writeFileSync(path, content);
    console.log('Added route to deliveryRoutes.js');
} else {
    console.log('Route already exists');
}
