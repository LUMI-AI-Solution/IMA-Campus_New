const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const lead = await prisma.lead.findUnique({
        where: { id: 22913 },
        include: { roundProgress: true }
    });
    console.log(lead.roundProgress);
}
main().catch(console.error).finally(() => prisma.$disconnect());
