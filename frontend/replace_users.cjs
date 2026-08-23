const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
    fs.readdirSync(dir).forEach(f => {
        let dirPath = path.join(dir, f);
        let isDirectory = fs.statSync(dirPath).isDirectory();
        isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
    });
}

let modified = 0;
walkDir('/root/IMA-Campus/frontend/src', function(filePath) {
    if (filePath.endsWith('.jsx') || filePath.endsWith('.js')) {
        let content = fs.readFileSync(filePath, 'utf8');
        let newContent = content;
        
        // Replace JSON.parse(localStorage.getItem('user') || '{}');
        // with JSON.parse(localStorage.getItem('user') || '{}') || {};
        newContent = newContent.replace(/JSON\.parse\(localStorage\.getItem\('user'\) \|\| '\{\}'\)\s*;/g, "JSON.parse(localStorage.getItem('user') || '{}') || {};");
        
        // Replace JSON.parse(localStorage.getItem('user'));
        // with JSON.parse(localStorage.getItem('user')) || {};
        newContent = newContent.replace(/JSON\.parse\(localStorage\.getItem\('user'\)\)\s*;/g, "JSON.parse(localStorage.getItem('user')) || {};");

        // Same for let user = JSON.parse... 
        
        if (content !== newContent) {
            fs.writeFileSync(filePath, newContent, 'utf8');
            console.log('Updated', filePath);
            modified++;
        }
    }
});
console.log('Modified', modified, 'files');
