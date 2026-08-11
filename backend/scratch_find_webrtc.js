const fs = require('fs');
const readline = require('readline');

async function processLineByLine() {
  const fileStream = fs.createReadStream('/root/.pm2/logs/ima-backend-out.log');

  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });
  
  let buffer = [];
  let found = false;

  for await (const line of rl) {
    buffer.push(line);
    if (buffer.length > 30) buffer.shift();
    if (line.includes('"webrtc"') && line.includes('"offer"')) {
      console.log(buffer.join('\n'));
      found = true;
      break;
    }
  }
}

processLineByLine();
