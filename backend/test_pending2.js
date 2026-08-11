require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const stdIds = ['228']; // Neroza's student ID
    const pastDeliveries = await prisma.delivery.findMany({
        where: {
            studentId: { in: stdIds.map(String) },
            status: { notIn: ['Pending', 'Hold'] }
        },
        orderBy: { packedAt: 'desc' },
        include: { payment: { include: { group: true } } }
    });
    
    console.log('pastDeliveries length:', pastDeliveries.length);
    const lastDel = pastDeliveries.find(pd => pd.studentId === '228');
    if (lastDel) {
        console.log({
            packedAt: lastDel.packedAt,
            trackingNumber: lastDel.trackingNumber,
            packRemark: lastDel.packRemark
        });
    } else {
        console.log("No lastDel found");
    }
}
main();
