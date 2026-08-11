const fs = require('fs');
const file = '/root/IMA-Campus/backend/controllers/deliveryController.js';
let content = fs.readFileSync(file, 'utf8');

// Update createTuteStock
content = content.replace(
    /let tuteImage = 'default-tute\.png';\s+if \(req\.file\) tuteImage = req\.file\.filename;/,
    `let tuteImage = 'default-tute.png';
        let tuteImage2 = null;
        if (req.files) {
            if (req.files['tuteImage'] && req.files['tuteImage'][0]) tuteImage = req.files['tuteImage'][0].filename;
            if (req.files['tuteImage2'] && req.files['tuteImage2'][0]) tuteImage2 = req.files['tuteImage2'][0].filename;
        }`
);
content = content.replace(
    /tuteImage,\s+itemOrder: parseInt\(itemOrder \|\| 1\)/,
    `tuteImage, tuteImage2, itemOrder: parseInt(itemOrder || 1)`
);

// Update updateTuteStock
content = content.replace(
    /let data = \{ tuteName, itemOrder: parseInt\(itemOrder \|\| 1\) \};\s+if \(req\.file\) data\.tuteImage = req\.file\.filename;/,
    `let data = { tuteName, itemOrder: parseInt(itemOrder || 1) };
        if (req.files) {
            if (req.files['tuteImage'] && req.files['tuteImage'][0]) data.tuteImage = req.files['tuteImage'][0].filename;
            if (req.files['tuteImage2'] && req.files['tuteImage2'][0]) data.tuteImage2 = req.files['tuteImage2'][0].filename;
        }`
);

fs.writeFileSync(file, content);
