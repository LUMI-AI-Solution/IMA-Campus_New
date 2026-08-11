const fs = require('fs');
const glob = require('glob');

const files = glob.sync('/root/IMA-Campus/frontend/src/components/**/*.jsx');

let modifiedCount = 0;

for (const file of files) {
    let content = fs.readFileSync(file, 'utf8');
    let original = content;

    // Fix grid cols for lists of cards in CRM
    content = content.replace(/className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4"/g, 'className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4"');
    content = content.replace(/className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6"/g, 'className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"');
    content = content.replace(/className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4"/g, 'className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"');
    
    // Also sometimes they use grid-cols-1 md:grid-cols-2 gap-6, which is fine for small sections.
    // Let's also look at any other wide grids
    
    if (content !== original) {
        fs.writeFileSync(file, content);
        modifiedCount++;
    }
}

console.log(`Updated grid layouts in ${modifiedCount} files!`);

// Let's also update MainLayout to be responsive
const mainLayoutPath = '/root/IMA-Campus/frontend/src/components/layouts/MainLayout.jsx';
let mainLayout = fs.readFileSync(mainLayoutPath, 'utf8');
if (!mainLayout.includes('window.innerWidth >= 1024')) {
    mainLayout = mainLayout.replace(
        'const [isSidebarOpen, setIsSidebarOpen] = useState(true);',
        'const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth >= 1024);\n\n  useEffect(() => {\n    const handleResize = () => {\n      if (window.innerWidth < 1024) setIsSidebarOpen(false);\n      else setIsSidebarOpen(true);\n    };\n    window.addEventListener(\'resize\', handleResize);\n    return () => window.removeEventListener(\'resize\', handleResize);\n  }, []);'
    );
    fs.writeFileSync(mainLayoutPath, mainLayout);
    console.log("Updated MainLayout to auto-collapse sidebar on smaller screens!");
}

