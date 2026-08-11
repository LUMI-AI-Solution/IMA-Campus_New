const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function checkData() {
    const leads = await prisma.lead.findMany({
        where: { inquiryType: 'OPEN_SEMINAR' },
        take: 5
    });
    console.log(JSON.stringify(leads.map(l => ({
        id: l.id,
        callStatus: l.callStatus,
        openSemCallStatus: l.openSemCallStatus,
        phase: l.phase,
        openSemPhase: l.openSemPhase,
        round: l.coordinationRound,
        openSemRound: l.openSemRound
    })), null, 2));
}
checkData().catch(console.error).finally(() => prisma.$disconnect());
