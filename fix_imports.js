const fs = require('fs');
let code = fs.readFileSync('/root/IMA-Campus/frontend/src/components/admin/AISlipVerification.jsx', 'utf8');

// Replace all imports from lucide-react with a clean merged one
const allLucides = Array.from(new Set([...code.matchAll(/([A-Za-z0-9]+)\s*[,}]/g)]
    .map(m => m[1])
    .filter(name => [
        'Upload', 'CheckCircle', 'XCircle', 'FileText', 'Activity', 'Loader', 
        'ShieldCheck', 'Database', 'Search', 'Key', 'Lock', 'Plus', 'Calendar', 
        'Folder', 'FolderOpen', 'Trash2', 'Terminal', 'Settings'
    ].includes(name))
));

code = code.replace(/import\s+\{[^}]+\}\s+from\s+['"]lucide-react['"];?/g, '');
code = `import { ${allLucides.join(', ')} } from 'lucide-react';\n` + code;

fs.writeFileSync('/root/IMA-Campus/frontend/src/components/admin/AISlipVerification.jsx', code);
