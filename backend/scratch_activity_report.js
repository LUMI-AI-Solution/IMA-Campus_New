const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function runReport() {
    try {
        const dateFrom = new Date("2026-07-07T00:00:00.000Z");

        const payments = await prisma.payment.findMany({
            where: {
                updatedAt: { gte: dateFrom }
            },
            include: {
                actionedUser: {
                    select: { firstName: true, lastName: true }
                }
            }
        });

        let aiCount = 0;
        const staffCounts = {};

        for (const p of payments) {
            // Only care about actioned statuses
            if (![1, 2, 4, 5].includes(p.status)) continue;
            
            // Check if it was AI verified
            if (p.aiVerified) {
                aiCount++;
            } else if (p.actionedById) {
                const user = p.actionedUser;
                const name = user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Unknown Staff' : 'Unknown';
                if (!staffCounts[name]) staffCounts[name] = 0;
                staffCounts[name]++;
            }
        }

        console.log(`\n=== Staff vs AI Activity Report (Based on verification/update date since 07/07) ===\n`);
        console.log(`AI Verified Slips : ${aiCount}`);
        
        console.log(`\n--- Staff Manual Verifications ---`);
        const sortedStaff = Object.entries(staffCounts).sort((a, b) => b[1] - a[1]);
        for (const [name, count] of sortedStaff) {
            console.log(`${name.padEnd(25)} : ${count}`);
        }

    } catch (e) {
        console.error("Error:", e);
    } finally {
        await prisma.$disconnect();
    }
}

runReport();
