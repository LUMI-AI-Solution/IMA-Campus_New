const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const args = process.argv.slice(2);
    if (args.length < 2) {
        console.log("Usage: node shift_lead_dates.js <leadId> <days_to_shift_back>");
        console.log("Example: node shift_lead_dates.js 105 7");
        process.exit(1);
    }

    const leadId = parseInt(args[0]);
    const daysToShift = parseInt(args[1]);

    if (isNaN(leadId) || isNaN(daysToShift)) {
        console.log("Invalid arguments. Both must be numbers.");
        process.exit(1);
    }

    const lead = await prisma.lead.findUnique({ where: { id: leadId } });
    if (!lead) {
        console.log(`Lead ${leadId} not found.`);
        process.exit(1);
    }

    const shiftMs = daysToShift * 24 * 60 * 60 * 1000;
    
    // Calculate new dates
    const newAssignedAt = lead.assignedAt ? new Date(lead.assignedAt.getTime() - shiftMs) : null;
    const newUpdatedAt = lead.updatedAt ? new Date(lead.updatedAt.getTime() - shiftMs) : null;
    const newCreatedAt = lead.createdAt ? new Date(lead.createdAt.getTime() - shiftMs) : null;

    await prisma.lead.update({
        where: { id: leadId },
        data: {
            assignedAt: newAssignedAt,
            updatedAt: newUpdatedAt,
            createdAt: newCreatedAt
        }
    });

    console.log(`✅ Successfully shifted dates back by ${daysToShift} days for Lead ${leadId}`);
    console.log(`New assignedAt: ${newAssignedAt}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
