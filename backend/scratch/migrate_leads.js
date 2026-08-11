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
                { firstName: { contains: 'midu', mode: 'insensitive' } },
                { lastName: { contains: 'midu', mode: 'insensitive' } }
            ]
        }
    });

    if (!midu) {
        console.log("Could not find Midu!");
        return;
    }

    const batches = await prisma.batch.findMany({
        where: { 
            businessId: artBusiness?.id, 
            OR: [
                { name: { contains: 'MAY' } },
                { name: { contains: 'July' } }
            ]
        }
    });

    const batchIds = batches.map(b => b.id);
    console.log(`Processing for Midu ID: ${midu.id}, Batches: ${batchIds}`);

    // Get leads for New Inq in these batches assigned to Midu
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
        
        // Find user by phone to check payments
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

        // We update the lead inquiryType to NORMAL and enrollmentStatus accordingly
        if (hasPaid) {
            await prisma.lead.update({
                where: { id: lead.id },
                data: {
                    inquiryType: 'NORMAL',
                    enrollmentStatus: 'ENROLLED'
                }
            });

            // Update LeadRoundProgress if it exists for NEW_INQ to PAID
            await prisma.leadRoundProgress.updateMany({
                where: { leadId: lead.id, campaignCategory: 'NEW_INQ' },
                data: { campaignCategory: 'PAID' }
            });

            countPaid++;
        } else {
            await prisma.lead.update({
                where: { id: lead.id },
                data: {
                    inquiryType: 'NORMAL',
                    enrollmentStatus: 'NON_ENROLLED'
                }
            });

            // Update LeadRoundProgress if it exists for NEW_INQ to DEFAULT
            await prisma.leadRoundProgress.updateMany({
                where: { leadId: lead.id, campaignCategory: 'NEW_INQ' },
                data: { campaignCategory: 'DEFAULT' }
            });

            countNonPaid++;
        }
    }

    console.log(`Successfully moved ${countPaid} to Paid, and ${countNonPaid} to Non-Paid.`);
}
main().catch(console.error).finally(() => prisma.$disconnect());
