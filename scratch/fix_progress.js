const fs = require('fs');
let code = fs.readFileSync('/root/IMA-Campus/MobileApp/src/screens/CourseContentScreen.jsx', 'utf8');

// Replace updateGlobalProgress(item.id, '...');
code = code.replace(/updateGlobalProgress\(item\.id,\s*'([^\']+)'\);/g, "setDownloadingItems(prev => ({ ...prev, [item.id]: '$1' }));");

// Replace updateGlobalProgress(item.id, percentage);
code = code.replace(/updateGlobalProgress\(item\.id,\s*percentage\);/g, "setDownloadingItems(prev => ({ ...prev, [item.id]: percentage }));");

// Replace updateGlobalProgress(item.id, 0);
code = code.replace(/updateGlobalProgress\(item\.id,\s*0\);/g, "setDownloadingItems(prev => ({ ...prev, [item.id]: 0 }));");

// Remove updateGlobalProgress(item.id, null);
code = code.replace(/updateGlobalProgress\(item\.id,\s*null\);/g, "");

fs.writeFileSync('/root/IMA-Campus/MobileApp/src/screens/CourseContentScreen.jsx', code);
console.log('Fixed updateGlobalProgress!');
