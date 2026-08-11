const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const batches = await prisma.batch.findMany({
        where: {
            name: {
                contains: "2027 AUGUST Intake"
            }
        },
        include: {
            business: true
        }
    });
    console.log(JSON.stringify(batches, null, 2));
}

main().catch(e => console.error(e)).finally(() => prisma.$disconnect());
