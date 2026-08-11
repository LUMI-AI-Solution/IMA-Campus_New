const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function run() {
    const lives = await prisma.content.findMany({ where: { contentType: { in: ['live', '1'] } }, select: { id: true, title: true, contentType: true, date: true } });
    console.log(lives);
}
run();
