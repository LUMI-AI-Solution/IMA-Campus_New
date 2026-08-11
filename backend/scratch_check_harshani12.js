const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const leads = await prisma.lead.count({
        where: { assignedTo: 49, campaignType: 'AFTER_SEMINAR', batchId: 26, inquiryType: { in: ['OPEN_SEMINAR', 'NORMAL'] } }
    });
    console.log(`Leads for Harshani in batch 26 (AFTER_SEMINAR, OPEN_SEM/NORMAL): ${leads}`);
    
    // Also check what phase/status they are in, in case they are filtered out on the frontend
    const leadDetails = await prisma.lead.findMany({
        where: { assignedTo: 49, campaignType: 'AFTER_SEMINAR', batchId: 26, inquiryType: { in: ['OPEN_SEMINAR', 'NORMAL'] } },
        take: 5
    });
    console.log("Sample leads:");
    leadDetails.forEach(l => {
        console.log(`ID: ${l.id}, Status: ${l.status}, CallStatus: ${l.callStatus}, Enrollment: ${l.enrollmentStatus}, Round: ${l.coordinationRound}, OpenSemRound: ${l.openSemRound}, OpenSemCallStatus: ${l.openSemCallStatus}`);
    });
}

main().catch(console.error).finally(() => prisma.$disconnect());
