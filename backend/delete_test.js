const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
    try {
        await prisma.lead.delete({ where: { id: 34629 } });
        console.log("Success");
    } catch(e) {
        console.error("Error:", e);
    } finally {
        await prisma.$disconnect();
    }
}
main();
