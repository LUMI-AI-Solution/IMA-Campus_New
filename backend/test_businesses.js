const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const businesses = await prisma.business.findMany({
        where: { id: 6 },
        include: {
            batches: {
                include: {
                    groups: {
                        where: { id: 50 },
                        include: { courses: true }
                    }
                }
            }
        }
    });
    
    console.log(businesses[0].batches.find(b => b.id===12).groups[0].courses.map(c => c.id));
}

main().catch(console.error).finally(() => prisma.$disconnect());
