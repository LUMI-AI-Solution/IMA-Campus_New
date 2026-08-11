const fs = require('fs');
try {
  const content = fs.readFileSync('/var/log/nginx/access.log', 'utf8');
  const lines = content.split('\n');
  const webhookLines = lines.filter(l => l.includes('/webhook')).slice(-20);
  console.log(webhookLines.join('\n'));
} catch (e) {
  console.error("Could not read nginx logs:", e);
}
