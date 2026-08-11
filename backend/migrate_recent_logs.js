const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function migrateRecentLogs() {
    try {
        console.log("Starting migration of recent payment logs...");
        
        // Get start of 3 days ago just to be safe with timezones
        const startOfRecent = new Date();
        startOfRecent.setDate(startOfRecent.getDate() - 3);
        startOfRecent.setHours(0, 0, 0, 0);

        const payments = await prisma.payment.findMany({
            where: {
                status: { in: [1, 4] },
                updatedAt: { gte: startOfRecent }
            }
        });

        console.log(`Found ${payments.length} recent payments verified. Migrating...`);

        let migratedCount = 0;

        for (const payment of payments) {
            // Check if log already exists
            const existingLog = await prisma.paymentAuditLog.findFirst({
                where: {
                    paymentId: payment.id,
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

migrateRecentLogs();
