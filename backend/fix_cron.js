const fs = require('fs');
let content = fs.readFileSync('services/liveClassCronService.js', 'utf8');

const target = /const startDateTime = new Date\(`\$\{dateStr\}T\$\{cls\.startTime\}:00\+05:30`\);/g;
const replacement = `const [hours, minutes] = cls.startTime.split(':');
                const formattedStartTime = \`\${hours.padStart(2, '0')}:\${minutes || '00'}\`;
                const startDateTime = new Date(\`\${dateStr}T\${formattedStartTime}:00+05:30\`);`;

content = content.replace(target, replacement);
fs.writeFileSync('services/liveClassCronService.js', content);
console.log("Fixed liveClassCronService.js date parsing");
