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
        where: { 
            businessId: artBusiness?.id, 
            OR: [
                { name: { contains: 'MAY', mode: 'insensitive' } },
                { name: { contains: 'July', mode: 'insensitive' } }
            ]
        }
    });
    const batchIds = batches.map(b => b.id);

    // Find New Inquiries leads for midu in these batches, Round 1 or 2
    const leads = await prisma.lead.findMany({
        where: {
            assignedTo: midu?.id,
            batchId: { in: batchIds },
            campaignType: 'NEW_INQ', // Wait, maybe campaignType is 'AFTER_SEMINAR' but campaignCategory is 'NEW_INQ'?
        },
        include: { roundProgress: true }
    });

    console.log(`Found ${leads.length} leads with campaignType = 'NEW_INQ'`);

    // Check with campaignCategory = NEW_INQ
    const leads2 = await prisma.leadRoundProgress.findMany({
        where: {
            campaignCategory: 'NEW_INQ',
            roundNum: { in: [1, 2] },
            lead: {
                assignedTo: midu?.id,
                batchId: { in: batchIds }
            }
        },
        include: { lead: true }
    });

    console.log(`Found ${leads2.length} roundProgress records with campaignCategory = 'NEW_INQ'`);
    
    // Group them to see how many
    let countPaid = 0;
    let countNonPaid = 0;

    for (const prog of leads2) {
        const lead = prog.lead;
        const student = await prisma.user.findFirst({ where: { phone: lead.phone, role: 'STUDENT' } });
        let hasPaid = false;
        if (student) {
            const payments = await prisma.payment.findMany({
                where: { studentId: student.id, batchId: lead.batchId, status: { in: [1, 4] } }
            });
            if (payments.length > 0) hasPaid = true;
        }

        if (hasPaid) countPaid++;
        else countNonPaid++;
    }

    console.log(`Of these leads, ${countPaid} are PAID, and ${countNonPaid} are NON-PAID.`);

    const sample = leads2[0];
    if (sample) {
        console.log("Sample lead campaignType:", sample.lead.campaignType);
        console.log("Sample lead enrollmentStatus:", sample.lead.enrollmentStatus);
    }
}
main().catch(console.error).finally(() => prisma.$disconnect());
