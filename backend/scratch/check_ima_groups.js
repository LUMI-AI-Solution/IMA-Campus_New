const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const imaBusiness = await prisma.business.findFirst({
        where: { name: { contains: 'Online School' } },
        include: { batches: { include: { groups: true } } }
    });
    if (!imaBusiness) {
        console.log("No IMA Online School found");
        return;
    }
    console.log("Business:", imaBusiness.name);
    for (const batch of imaBusiness.batches) {
        console.log(`\nBatch: ${batch.name} (ID: ${batch.id})`);
        for (const group of batch.groups) {
            console.log(`- Group: ${group.name} (ID: ${group.id}, Type: ${group.type})`);
        }
    }
}
main().catch(console.error).finally(() => prisma.$disconnect());
