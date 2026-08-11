const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function runReport() {
    try {
        const dateFrom = new Date();
        dateFrom.setDate(dateFrom.getDate() - 7);
        dateFrom.setHours(0, 0, 0, 0);

        const payments = await prisma.payment.findMany({
            where: {
                status: 1, // Approved
                aiVerified: false,
                actionedById: { not: null },
                updatedAt: { gte: dateFrom }
            },
            include: {
                actionedUser: {
                    select: { firstName: true, lastName: true }
                }
            }
        });

        const staffCounts = {};
        for (const p of payments) {
            const user = p.actionedUser;
            const name = user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Unknown Staff' : 'Unknown';
            if (!staffCounts[name]) {
                staffCounts[name] = 0;
            }
            staffCounts[name]++;
        }

        console.log(`\n=== Manual Verification Report (Last 7 Days) ===`);
        console.log(`From: ${dateFrom.toISOString().split('T')[0]} to Today\n`);
        
        const sortedStaff = Object.entries(staffCounts).sort((a, b) => b[1] - a[1]);
        
        let total = 0;
        for (const [name, count] of sortedStaff) {
            console.log(`${name.padEnd(30, ' ')} : ${count}`);
            total += count;
        }
        console.log('-'.repeat(40));
        console.log(`Total Manual Verifications: ${total}`);

    } catch (e) {
        console.error("Error:", e);
    } finally {
        await prisma.$disconnect();
    }
}

runReport();
