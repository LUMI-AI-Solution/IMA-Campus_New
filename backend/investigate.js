const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function investigate() {
    try {
        console.log("--- INVESTIGATION START ---");

        // 1. Check ID 1062840 (Payment or Student)
        const payment = await prisma.payment.findUnique({
            where: { id: 1062840 },
            include: { student: true, actionedUser: true }
        });
        if (payment) {
            console.log("Found Payment 1062840:", JSON.stringify(payment, null, 2));
        } else {
            console.log("Payment 1062840 NOT FOUND. Checking if it's a student ID...");
            const student = await prisma.user.findFirst({
                where: { OR: [{ id: 1062840 }, { phone: { contains: '1062840' } }] },
                include: { payments: { orderBy: { created_at: 'desc' }, take: 5 } }
            });
            if (student) {
                console.log("Found Student matching 1062840:", JSON.stringify(student, null, 2));
            } else {
                console.log("No Payment or Student found for 1062840.");
            }
        }

        // 2. Investigate Rejected Payments (status = 2)
        const rejectedPayments = await prisma.payment.findMany({
            where: { status: 2 },
            orderBy: { id: 'desc' },
            take: 200,
            include: { actionedUser: true, student: true }
        });
        
        console.log(`\n--- TOTAL REJECTED PAYMENTS: ${rejectedPayments.length} ---`);
        
        // Group by remark to see if there's an auto-reject reason
        const remarksCount = {};
        const actionedByCount = {};
        let nullActionedUserCount = 0;
        let aiVerifiedCount = 0;

        rejectedPayments.forEach(p => {
            const remark = p.remark || 'NO_REMARK';
            remarksCount[remark] = (remarksCount[remark] || 0) + 1;

            if (p.actionedUser) {
                const name = `${p.actionedUser.firstName} ${p.actionedUser.lastName} (ID: ${p.actionedUser.id})`;
                actionedByCount[name] = (actionedByCount[name] || 0) + 1;
            } else {
                nullActionedUserCount++;
            }

            if (p.aiVerified) {
                aiVerifiedCount++;
            }
        });

        console.log("\nREMARKS BREAKDOWN:");
        console.table(remarksCount);

        console.log("\nACTIONED BY BREAKDOWN:");
        console.table(actionedByCount);
        console.log(`Null Actioned User Count (System/AI): ${nullActionedUserCount}`);
        console.log(`AI Verified Flag Count: ${aiVerifiedCount}`);

        // Get the latest 5 rejected payments to see the pattern
        console.log("\nLATEST 5 REJECTED PAYMENTS:");
        console.log(JSON.stringify(rejectedPayments.slice(0, 5).map(p => ({
            id: p.id,
            status: p.status,
            remark: p.remark,
            actionedBy: p.actionedUser ? p.actionedUser.firstName : 'NULL',
            created_at: p.created_at,
            aiVerified: p.aiVerified
        })), null, 2));

    } catch (e) {
        console.error("Error during investigation:", e);
    } finally {
        await prisma.$disconnect();
    }
}

investigate();
