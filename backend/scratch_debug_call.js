const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
    const leads = await prisma.lead.findMany({
        where: {
            phone: {
                contains: '4941559'
            }
        },
        include: { assignedUser: true, batch: true }
    });
    console.log("Leads matching 4941559:", leads);

    const midu = await prisma.user.findFirst({
        where: {
            name: {
                contains: 'midu',
                mode: 'insensitive'
            }
        }
    });
    console.log("Midu user:", midu);
}
run().catch(console.error).finally(() => prisma.$disconnect());
