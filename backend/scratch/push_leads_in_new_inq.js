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

    if (!midu) {
        console.log("Could not find Midu!");
        return;
    }

    const batches = await prisma.batch.findMany({
        where: { businessId: artBusiness?.id }
    });
    
    // We target May and July batches
    const targetBatches = batches.filter(b => b.name.toLowerCase().includes('may') || b.name.toLowerCase().includes('july'));
    const batchIds = targetBatches.map(b => b.id);
    console.log(`Processing for Midu ID: ${midu.id}, Batches:`, targetBatches.map(b => b.name));

    // Get leads for New Inq in these batches assigned to Midu that are in Round 1 or 2
    // i.e., inquiryType = 'NEW_INQ' and coordinationRound in [1, 2] and not enrolled
    const leads = await prisma.lead.findMany({
        where: {
            assignedTo: midu.id,
            batchId: { in: batchIds },
            inquiryType: 'NEW_INQ',
            coordinationRound: { in: [1, 2] },
            enrollmentStatus: { notIn: ['ENROLLED', 'PAID'] }
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

        if (hasPaid) {
            // Move to PAID tab within NEW_INQ
            await prisma.lead.update({
                where: { id: lead.id },
                data: {
                    enrollmentStatus: 'ENROLLED'
                }
            });
            countPaid++;
        } else {
            // Move to NON ENROLLED tab within NEW_INQ
            await prisma.lead.update({
                where: { id: lead.id },
                data: {
                    coordinationRound: 3
                }
            });
            countNonPaid++;
        }
    }

    console.log(`Successfully pushed ${countPaid} leads to PAID and ${countNonPaid} leads to NON ENROLLED within New Inquiries.`);
}
main().catch(console.error).finally(() => prisma.$disconnect());
