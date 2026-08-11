const fs = require('fs');
const content = fs.readFileSync('/root/IMA-Campus/frontend/src/pages/LumiCaller/LumiCallerMain.jsx', 'utf-8');
const match = content.match(/let realBusinesses = bizRes\.data\.map\([\s\S]*?setBusinesses\(realBusinesses\);/);
if (match) console.log("Found mapping block");
else console.log("Not found mapping block");
