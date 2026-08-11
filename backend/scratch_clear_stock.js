const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function clearStock() {
    try {
        console.log("Clearing TuteStockHistory...");
        await prisma.tuteStockHistory.deleteMany({});
        
        console.log("Clearing TuteStock...");
        await prisma.tuteStock.deleteMany({});
        
        console.log("Successfully cleared TuteStock and TuteStockHistory!");
    } catch (error) {
        console.error("Error clearing stock:", error);
    } finally {
        await prisma.$disconnect();
    }
}

clearStock();
