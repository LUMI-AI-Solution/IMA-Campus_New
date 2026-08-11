const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function migrateAILogs() {
    try {
        console.log("Starting migration of ALL AI Verified payment logs...");
        
        const aiPayments = await prisma.payment.findMany({
            where: {
                aiVerified: true
            }
        });

        console.log(`Found ${aiPayments.length} AI Verified payments. Migrating...`);

        let migratedCount = 0;

        for (const payment of aiPayments) {
            // Check if log already exists for this payment with AI_APPROVED action
            const existingLog = await prisma.paymentAuditLog.findFirst({
                where: {
                    paymentId: payment.id,
                    action: 'AI_APPROVED'
                }
            });

            if (!existingLog) {
                await prisma.paymentAuditLog.create({
                    data: {
                        paymentId: payment.id,
                        action: 'AI_APPROVED',
                        actionedById: null, // AI verified has no actionedById
                        createdAt: payment.updatedAt
                    }
                });
                migratedCount++;
            }
        }

        console.log(`Successfully migrated ${migratedCount} AI logs!`);
    } catch (e) {
        console.error("Migration failed", e);
    } finally {
        await prisma.$disconnect();
    }
}

migrateAILogs();
