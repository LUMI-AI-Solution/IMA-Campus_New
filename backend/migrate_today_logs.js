const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function migrateTodayLogs() {
    try {
        console.log("Starting migration of today's payment logs...");
        
        // Get start of today
        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);

        const payments = await prisma.payment.findMany({
            where: {
                status: { in: [1, 4] },
                updatedAt: { gte: startOfToday }
            }
        });

        console.log(`Found ${payments.length} payments verified today. Migrating...`);

        let migratedCount = 0;

        for (const payment of payments) {
            // Check if log already exists
            const existingLog = await prisma.paymentAuditLog.findFirst({
                where: {
                    paymentId: payment.id,
                    createdAt: { gte: new Date(payment.updatedAt.getTime() - 1000), lte: new Date(payment.updatedAt.getTime() + 1000) }
                }
            });

            if (!existingLog) {
                let action = 'APPROVE';
                if (payment.status === 4) {
                    action = 'REJECT';
                } else if (payment.aiVerified) {
                    action = 'AI_APPROVED';
                }

                await prisma.paymentAuditLog.create({
                    data: {
                        paymentId: payment.id,
                        action: action,
                        actionedById: payment.aiVerified ? null : payment.actionedById,
                        createdAt: payment.updatedAt
                    }
                });
                migratedCount++;
            }
        }

        console.log(`Successfully migrated ${migratedCount} logs!`);
    } catch (e) {
        console.error("Migration failed", e);
    } finally {
        await prisma.$disconnect();
    }
}

migrateTodayLogs();
