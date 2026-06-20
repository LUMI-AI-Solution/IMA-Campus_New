const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const roundLeads = await prisma.lead.findMany({
        where: {
            OR: [
                { phone: { contains: '_ROUND_' } },
                { phone: { contains: '_HISTORY_ROUND_' } }
            ]
        }
    });

    console.log(`Found ${roundLeads.length} round leads to process.`);
    let mergedCount = 0;
    let renamedCount = 0;
    let failedCount = 0;

    for (const dup of roundLeads) {
        let basePhone = dup.phone.split('_ROUND_')[0];
        basePhone = basePhone.split('_HISTORY_ROUND_')[0];

        let baseLead = await prisma.lead.findUnique({ where: { phone: basePhone } });

        if (!baseLead) {
            try {
                await prisma.lead.update({
                    where: { id: dup.id },
                    data: { phone: basePhone }
                });
                renamedCount++;
            } catch(e) {
                console.error(`Failed to rename lead ${dup.id} to ${basePhone}: ${e.message}`);
                failedCount++;
            }
            continue;
        }

        try {
            await prisma.chatMessage.updateMany({
                where: { leadId: dup.id },
                data: { leadId: baseLead.id }
            });

            const dupProgress = await prisma.leadRoundProgress.findMany({ where: { leadId: dup.id } });
            for (const prog of dupProgress) {
                const existingProg = await prisma.leadRoundProgress.findUnique({
                    where: { leadId_roundNum: { leadId: baseLead.id, roundNum: prog.roundNum } }
                });
                if (!existingProg) {
                    await prisma.leadRoundProgress.update({
                        where: { id: prog.id },
                        data: { leadId: baseLead.id }
                    });
                } else {
                    await prisma.leadRoundProgress.delete({ where: { id: prog.id } });
                }
            }

            await prisma.reminder.updateMany({
                where: { leadId: dup.id },
                data: { leadId: baseLead.id }
            });

            if (dup.coordinationRound > baseLead.coordinationRound) {
                await prisma.lead.update({
                    where: { id: baseLead.id },
                    data: {
                        coordinationRound: dup.coordinationRound,
                        phase: dup.phase,
                        callStatus: dup.callStatus,
                        status: dup.status,
                        assignedTo: dup.assignedTo || baseLead.assignedTo
                    }
                });
            }

            if (dup.unreadCount > 0) {
                await prisma.lead.update({
                    where: { id: baseLead.id },
                    data: { unreadCount: { increment: dup.unreadCount } }
                });
            }

            await prisma.lead.delete({ where: { id: dup.id } });
            mergedCount++;
        } catch(e) {
            console.error(`Failed to merge lead ${dup.id}: ${e.message}`);
            failedCount++;
        }
    }
    
    console.log(`Successfully merged ${mergedCount} leads.`);
    console.log(`Successfully renamed ${renamedCount} leads (base lead didn't exist).`);
    console.log(`Failed to process ${failedCount} leads.`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
