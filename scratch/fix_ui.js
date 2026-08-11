const fs = require('fs');
let code = fs.readFileSync('/root/IMA-Campus/MobileApp/src/screens/CourseContentScreen.jsx', 'utf8');

const targetStr = "<Text style={styles.docDownloadText}>{downloadProgress}%</Text>";
const replacementStr = `<Text style={styles.docDownloadText}>
                                    {downloadProgress === '...' 
                                        ? 'Extracting...' 
                                        : downloadProgress === true 
                                            ? 'Starting...' 
                                            : \`\${downloadProgress}%\`}
                                </Text>`;

code = code.replace(targetStr, replacementStr);
fs.writeFileSync('/root/IMA-Campus/MobileApp/src/screens/CourseContentScreen.jsx', code);
console.log('Fixed UI rendering for downloadProgress!');
