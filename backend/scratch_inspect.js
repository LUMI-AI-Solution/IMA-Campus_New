const fs = require('fs');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log("storage/documents exists:", fs.existsSync("./storage/documents"));
    console.log("storage exists:", fs.existsSync("./storage"));
    
    const count = await prisma.tuteStock.count();
    console.log("Total tuteStock records:", count);
    
    const recent = await prisma.tuteStock.findMany({
        take: 10,
        orderBy: { id: 'desc' },
        include: { course: true }
    });
    console.log("Recent tuteStocks:", JSON.stringify(recent, null, 2));
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
