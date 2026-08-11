const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const artBusiness = await prisma.business.findFirst({
        where: { name: { contains: 'Art' } }
    });

    const midu = await prisma.user.findFirst({
        where: { 
            role: { in: ['COORDINATOR', 'ADMIN', 'SUPER_ADMIN'] },
            OR: [
                { firstName: { contains: 'midu' } },
                { lastName: { contains: 'midu' } }
            ]
        }
    });

    const batches = await prisma.batch.findMany({
        where: { businessId: artBusiness?.id }
    });
    
    const targetBatches = batches.filter(b => b.name.toLowerCase().includes('may') || b.name.toLowerCase().includes('july'));
    const batchIds = targetBatches.map(b => b.id);
    console.log(`Processing for Midu ID: ${midu.id}, Batches:`, targetBatches.map(b => b.name));

    const leads = await prisma.lead.findMany({
        where: {
            assignedTo: midu.id,
            batchId: { in: batchIds },
            inquiryType: 'NEW_INQ',
            newInqRound: { in: [1, 2] }
        }
    });

    console.log(`Found ${leads.length} leads in New Inquiries (Rounds 1 & 2) for Midu.`);

    let countPaid = 0;
    let countNonPaid = 0;

    for (const lead of leads) {
        let hasPaid = false;
        
        const student = await prisma.user.findFirst({
            where: { phone: lead.phone, role: 'STUDENT' }
        });

        if (student && lead.batchId) {
            const payments = await prisma.payment.findMany({
                where: { 
                    studentId: student.id, 
                    batchId: lead.batchId, 
                    status: { in: [1, 4] } 
                }
            });
            if (payments.length > 0) hasPaid = true;
        }

        const targetCategory = hasPaid ? 'PAID' : 'DEFAULT';

        await prisma.lead.update({
            where: { id: lead.id },
            data: {
                inquiryType: 'NORMAL',
                enrollmentStatus: hasPaid ? 'ENROLLED' : 'NON_ENROLLED'
            }
        });

        const newInqProgresses = await prisma.leadRoundProgress.findMany({
            where: { leadId: lead.id, campaignCategory: 'NEW_INQ' }
        });

        for (const prog of newInqProgresses) {
            const existingTarget = await prisma.leadRoundProgress.findFirst({
                where: { leadId: lead.id, roundNum: prog.roundNum, campaignCategory: targetCategory }
            });

            if (existingTarget) {
                // Keep the target, delete the NEW_INQ progress
                await prisma.leadRoundProgress.delete({ where: { id: prog.id } });
            } else {
                // Update NEW_INQ to the target
                await prisma.leadRoundProgress.update({
                    where: { id: prog.id },
                    data: { campaignCategory: targetCategory }
                });
            }
        }

        if (hasPaid) countPaid++;
        else countNonPaid++;
    }

    console.log(`Successfully moved ${countPaid} to Paid, and ${countNonPaid} to Non-Paid.`);
}
main().catch(console.error).finally(() => prisma.$disconnect());
