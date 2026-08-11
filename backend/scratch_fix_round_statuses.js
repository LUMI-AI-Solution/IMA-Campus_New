const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const leads = await prisma.lead.findMany({
        where: {
            OR: [
                { openSemRound: { gt: 1 }, openSemCallStatus: { not: 'pending' } },
                { newInqRound: { gt: 1 }, newInqCallStatus: { not: 'pending' } },
                { paidRound: { gt: 1 }, paidCallStatus: { not: 'pending' } },
                { coordinationRound: { gt: 1 }, callStatus: { not: 'pending' } }
            ]
        },
        include: { roundProgress: true }
    });

    let fixedCount = 0;
    for (const lead of leads) {
        let needsUpdate = false;
        let updateData = {};

        // Helper to check if a valid progress exists for the current round
        const hasProgress = (round, category) => {
            return lead.roundProgress.some(p => p.roundNum === round && (p.campaignCategory === category || p.campaignCategory === 'DEFAULT'));
        };

        if (lead.openSemRound > 1 && lead.openSemCallStatus !== 'pending') {
            if (!hasProgress(lead.openSemRound, 'OPEN_SEM')) {
                updateData.openSemCallStatus = 'pending';
                needsUpdate = true;
            }
        }
        if (lead.newInqRound > 1 && lead.newInqCallStatus !== 'pending') {
            if (!hasProgress(lead.newInqRound, 'NEW_INQ')) {
                updateData.newInqCallStatus = 'pending';
                needsUpdate = true;
            }
        }
        if (lead.paidRound > 1 && lead.paidCallStatus !== 'pending') {
            if (!hasProgress(lead.paidRound, 'PAID')) {
                updateData.paidCallStatus = 'pending';
                needsUpdate = true;
            }
        }
        if (lead.coordinationRound > 1 && lead.callStatus !== 'pending') {
            if (!hasProgress(lead.coordinationRound, 'DEFAULT')) {
                updateData.callStatus = 'pending';
                needsUpdate = true;
            }
        }

        if (needsUpdate) {
            await prisma.lead.update({ where: { id: lead.id }, data: updateData });
            fixedCount++;
        }
    }
    console.log(`Fixed ${fixedCount} leads with stale statuses.`);
}
main().catch(console.error).finally(() => prisma.$disconnect());
