const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function runReport() {
    try {
        // Exact date range from user's screenshot
        const dateFrom = new Date("2026-07-08T00:00:00.000Z");
        const dateTo = new Date("2026-07-15T23:59:59.999Z");

        // We fetch ALL payments created in this date range, just like the frontend UI does
        const rawPayments = await prisma.payment.findMany({
            where: {
                created_at: {
                    gte: dateFrom,
                    lte: dateTo
                }
            },
            include: {
                actionedUser: {
                    select: { firstName: true, lastName: true }
                }
            }
        });

        // Mimic frontend status mapping
        const statusMap = {
            'Pending': 0,
            'Trash': 0,
            'Upcoming': 0,
            'Free Card': 0,
            'Discount': 0,
            'Approved': 0,
            'Rejected': 0,
            'Non Paid': 0,
            'Post Pay': 0
        };

        const aiCount = {};
        const manualCount = {};

        for (const p of rawPayments) {
            let currentStatus = 'Pending';
            
            // Replicate the exact logic from paymentController.js
            if (p.status === 5) currentStatus = 'Trash';
            else if (p.status === 0 && p.method === 'Upcoming') currentStatus = 'Upcoming';
            else if (p.status === 0) currentStatus = 'Pending';
            else if (p.status === 1) {
                if (p.amount === 0 && p.remark && p.remark.includes('Free Card')) currentStatus = 'Free Card';
                else if (p.remark && p.remark.includes('Custom Breakdown')) currentStatus = 'Discount';
                else currentStatus = 'Approved';
            }
            else if (p.status === 2) currentStatus = 'Rejected';
            else if (p.status === 3) currentStatus = 'Non Paid';
            else if (p.status === 4) currentStatus = 'Post Pay';

            statusMap[currentStatus]++;

            // We only care about actioned items (not Pending/Upcoming/Non Paid)
            if (['Approved', 'Free Card', 'Discount', 'Rejected', 'Trash', 'Post Pay'].includes(currentStatus)) {
                if (p.aiVerified) {
                    if (!aiCount[currentStatus]) aiCount[currentStatus] = 0;
                    aiCount[currentStatus]++;
                } else {
                    const user = p.actionedUser;
                    const userName = user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Unknown Staff' : 'Unknown';
                    
                    if (!manualCount[userName]) manualCount[userName] = {};
                    if (!manualCount[userName][currentStatus]) manualCount[userName][currentStatus] = 0;
                    manualCount[userName][currentStatus]++;
                }
            }
        }

        console.log(`\n=== 10000% Pure Report (Filtered by Slip Upload Date: 07/08 - 07/15) ===\n`);
        
        console.log(`--- UI Tabs Breakdown ---`);
        for (const [status, count] of Object.entries(statusMap)) {
            if (count > 0) console.log(`${status.padEnd(15)} : ${count}`);
        }

        console.log(`\n--- AI Verified Breakdown ---`);
        let totalAi = 0;
        for (const [status, count] of Object.entries(aiCount)) {
            console.log(`${status.padEnd(15)} : ${count}`);
            totalAi += count;
        }
        console.log(`Total AI Actioned : ${totalAi}\n`);

        console.log(`--- Manual (Staff) Breakdown ---`);
        let totalManualAll = 0;
        for (const [staff, statuses] of Object.entries(manualCount).sort()) {
            let staffTotal = 0;
            let statusStrings = [];
            for (const [status, count] of Object.entries(statuses)) {
                statusStrings.push(`${status}: ${count}`);
                staffTotal += count;
            }
            console.log(`${staff.padEnd(25)} | Total: ${staffTotal.toString().padEnd(4)} | (${statusStrings.join(', ')})`);
            totalManualAll += staffTotal;
        }
        console.log(`Total Manual Actioned : ${totalManualAll}\n`);

    } catch (e) {
        console.error("Error:", e);
    } finally {
        await prisma.$disconnect();
    }
}

runReport();
