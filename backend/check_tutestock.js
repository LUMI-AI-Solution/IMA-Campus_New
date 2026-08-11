const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
    const stocks = await prisma.tuteStock.findMany({
        where: { course: { name: { contains: 'ACCOUNTING' } } },
        include: { course: true }
    });
    console.log("Accounting TuteStocks:", stocks.length);
    for (const s of stocks) {
        console.log(s.course.name, s.tuteName);
    }
}
check().finally(()=>prisma.$disconnect());
