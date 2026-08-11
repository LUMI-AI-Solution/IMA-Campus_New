const fs = require('fs');
let content = fs.readFileSync('/root/IMA-Campus/backend/controllers/afterSeminarInquiryController.js', 'utf8');

content = content.replace(
    'const autoReplies = await prisma.autoReply.findMany({',
    `console.log("DEBUG: existingLead.autoReplyStep =", existingLead.autoReplyStep);
                    const autoReplies = await prisma.autoReply.findMany({`
);

content = content.replace(
    'if (futureReplies.length > 0) {',
    `console.log("DEBUG: futureReplies.length =", futureReplies.length, "targetStep=", futureReplies.length > 0 ? futureReplies[0].stepOrder : 'none');
                        if (futureReplies.length > 0) {`
);

content = content.replace(
    'const delayMs = Math.floor(Math.random() * (8000 - 3000 + 1)) + 3000; // 3 to 8 seconds delay',
    `console.log("DEBUG: SCHEDULING AUTO REPLY step", nextReply.stepOrder);
                            const delayMs = Math.floor(Math.random() * (8000 - 3000 + 1)) + 3000; // 3 to 8 seconds delay`
);

content = content.replace(
    'const sendAutoReply = async () => {',
    `const sendAutoReply = async () => {
                                console.log("DEBUG: EXECUTING sendAutoReply step", nextReply.stepOrder);`
);

fs.writeFileSync('/root/IMA-Campus/backend/controllers/afterSeminarInquiryController.js', content);
