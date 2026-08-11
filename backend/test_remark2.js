const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
    const past = await prisma.delivery.findMany({where: {studentId: '228', status: {notIn: ['Pending', 'Hold']}}, orderBy: {packedAt: 'desc'}});
    console.log(past.map(p => ({id: p.id, packRemark: p.packRemark, tracking: p.trackingNumber, packedAt: p.packedAt})));
}
main();
