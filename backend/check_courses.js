const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
    const biz = await prisma.business.findFirst({ where: { name: { contains: 'Law' } }, include: { batches: { include: { groups: { include: { courses: true } } } } } });
    if (!biz) { console.log('No Law business found'); return; }
    console.log("Business:", biz.name);
    for (const batch of biz.batches) {
        console.log(" Batch:", batch.name);
        for (const group of batch.groups) {
            console.log("  Group:", group.name);
            for (const course of group.courses) {
                console.log("   Course:", course.name);
            }
        }
    }
}
check();
