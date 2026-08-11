const fs = require('fs');
let code = fs.readFileSync('/root/IMA-Campus/MobileApp/src/screens/HomeScreen.jsx', 'utf8');

if (!code.includes('<GlobalDownloadWidget />')) {
    if (!code.includes("import GlobalDownloadWidget")) {
        code = code.replace("import CustomAlert from '../components/CustomAlert';", "import CustomAlert from '../components/CustomAlert';\nimport GlobalDownloadWidget from '../components/GlobalDownloadWidget';");
    }
    
    // Add right before final </View> or similar
    // HomeScreen has a main <View style={styles.container}> ... </View>
    const endViewStr = '    </View>\n  );\n};\n';
    if (code.includes(endViewStr)) {
        code = code.replace(endViewStr, '      <GlobalDownloadWidget />\n    </View>\n  );\n};\n');
    } else {
        // Fallback replacement if exact endViewStr is not found
        const fallbackStr = '    </View>\n  );';
        code = code.replace(fallbackStr, '      <GlobalDownloadWidget />\n    </View>\n  );');
    }
}

fs.writeFileSync('/root/IMA-Campus/MobileApp/src/screens/HomeScreen.jsx', code);
console.log('Modified HomeScreen!');
