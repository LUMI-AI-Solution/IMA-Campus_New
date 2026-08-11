const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function runReport() {
    try {
        const rawPayments = await prisma.payment.findMany({
            include: {
                actionedUser: {
                    select: { firstName: true, lastName: true }
                }
            }
        });

        const statusMap = {};
        const aiCount = {};
        const manualCount = {};
        const staffTotals = {};

        for (const p of rawPayments) {
            let currentStatus = 'Pending';
            
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

            if (!statusMap[currentStatus]) statusMap[currentStatus] = 0;
            statusMap[currentStatus]++;

            // We only care about actioned items
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
                    
                    if (!staffTotals[userName]) staffTotals[userName] = 0;
                    staffTotals[userName]++;
                }
            }
        }

        console.log(`\n=== ALL TIME Pure Report (Okkoma Slips) ===\n`);
        
        console.log(`\n--- AI Verified Breakdown ---`);
        let totalAi = 0;
        for (const [status, count] of Object.entries(aiCount)) {
            console.log(`${status.padEnd(15)} : ${count}`);
            totalAi += count;
        }
        console.log(`Total AI Actioned : ${totalAi}\n`);

        console.log(`--- Manual (Staff) Breakdown ---`);
        let totalManualAll = 0;
        
        const sortedStaff = Object.entries(staffTotals).sort((a, b) => b[1] - a[1]);
        
        for (const [staff, staffTotal] of sortedStaff) {
            const statuses = manualCount[staff];
            let statusStrings = [];
            for (const [status, count] of Object.entries(statuses)) {
                statusStrings.push(`${status}: ${count}`);
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
