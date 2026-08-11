const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log("Deleting TuteStockHistory...");
    await prisma.tuteStockHistory.deleteMany({});
    
    console.log("Deleting TuteStock...");
    const result = await prisma.tuteStock.deleteMany({});
    console.log(`Deleted ${result.count} TuteStock records.`);
    
    console.log("Done! You can now refresh the delivery page to auto-sync.");
}

main().catch(e => console.error(e)).finally(() => prisma.$disconnect());
