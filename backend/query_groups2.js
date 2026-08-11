const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const batch = await prisma.batch.findFirst({
        where: { name: { contains: "2027 MAY INTAKE" } },
        include: { groups: true }
    });
    if (!batch) {
        console.log("Batch not found");
        return;
    }
    console.log("Batch:", batch.name, "Start:", batch.startMonth, "End:", batch.endMonth);
    batch.groups.forEach(g => {
        console.log("Group:", g.name, "Type:", g.type, "ItemOrder:", g.itemOrder);
    });
}
main().catch(console.error).finally(() => prisma.$disconnect());
