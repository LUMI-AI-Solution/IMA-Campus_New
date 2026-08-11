const axios = require('axios');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const contents = await prisma.content.findMany({
        orderBy: { id: 'desc' },
        take: 10
    });
    console.log(JSON.stringify(contents.map(c => ({ id: c.id, contentType: c.contentType, batchId: c.batchId, contentGroupId: c.contentGroupId })), null, 2));
}
main().catch(console.error).finally(() => prisma.$disconnect());
