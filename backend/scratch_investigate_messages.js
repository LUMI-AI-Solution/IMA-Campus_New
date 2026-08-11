const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const messages = await prisma.chatMessage.findMany({
        where: { message: { contains: 'open seminar' } },
        include: { lead: true }
    });
    console.log("Total messages containing 'open seminar':", messages.length);
    if (messages.length > 0) {
        // Group by lead.assignedTo
        const assigned = {};
        for (const m of messages) {
            if (m.lead) {
                const a = m.lead.assignedTo || 'Unassigned';
                assigned[a] = (assigned[a] || 0) + 1;
            }
        }
        console.log("These leads are assigned to:", assigned);
    }
}
main().catch(console.error).finally(() => prisma.$disconnect());
