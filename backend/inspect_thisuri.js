const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const leads = await prisma.lead.findMany({
        where: {
            assignedUser: { firstName: 'Thisuri' },
            batch: { name: { contains: 'AUGUST' } }
        },
        select: {
            id: true,
            inquiryType: true,
            openSemRound: true,
            coordinationRound: true,
            openSemCallStatus: true,
            enrollmentStatus: true,
            callStatus: true,
            roundProgress: true
        }
    });

    const statusCounts = {};
    leads.forEach(l => {
        const hasProgress = l.roundProgress && l.roundProgress.length > 0;
        let pStatus = 'none';
        if (hasProgress) {
            // Check if she updated them recently
            const recent = l.roundProgress.filter(p => new Date(p.updatedAt) > new Date(Date.now() - 48*3600*1000));
            if (recent.length > 0) pStatus = 'recent_progress';
        }

        const key = `inquiry=${l.inquiryType}, openSemRound=${l.openSemRound}, status=${l.openSemCallStatus || 'pending'}, enrolled=${l.enrollmentStatus}, prog=${pStatus}`;
        statusCounts[key] = (statusCounts[key] || 0) + 1;
    });

    console.log("Thisuri's ALL Leads Breakdown (August Intake):");
    console.table(Object.entries(statusCounts).map(([k, v]) => ({ Group: k, Count: v })));
}

main().catch(console.error).finally(() => prisma.$disconnect());
