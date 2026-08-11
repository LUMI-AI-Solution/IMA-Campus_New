const fs = require('fs');
const schema = fs.readFileSync('/root/IMA-Campus/backend/prisma/schema.prisma', 'utf8');
const lines = schema.split('\n');
let inChatMessage = false;
for (const line of lines) {
    if (line.includes('model ChatMessage')) inChatMessage = true;
    if (inChatMessage && line.includes('}')) {
        console.log(line);
        break;
    }
    if (inChatMessage) console.log(line);
}
