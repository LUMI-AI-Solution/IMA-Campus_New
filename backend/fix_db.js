const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function run() {
  const result = await prisma.autoReply.updateMany({
    where: { attachment: { endsWith: '.mp3' } },
    data: { attachmentType: 'Audio' }
  });
  console.log("Fixed DB records:", result);
}
run();
