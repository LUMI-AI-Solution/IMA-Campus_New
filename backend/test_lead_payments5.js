const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
    const leads = ['94766561661', '9477538028'];
    for (const phone of leads) {
        console.log(`\n--- Lead Phone: ${phone} ---`);
        const leadRecords = await prisma.lead.findMany({
            where: { phone: { contains: phone } }
        });
        console.log("Found Leads:");
        leadRecords.forEach(l => console.log(`  - ID: ${l.id}, Phone: ${l.phone}, UserID: ${l.userId}, assignedSubjects: ${l.assignedSubjects}`));
    }
}
check().finally(() => prisma.$disconnect());
