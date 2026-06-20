const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function deleteDuplicateLead() {
    console.log("Searching for duplicate leads for 79294315...");

    const leads = await prisma.lead.findMany({
        where: {
            phone: {
                contains: '79294315'
            }
        }
    });

    console.log(`Found ${leads.length} leads matching the base number.`);

    const lead077 = leads.find(l => l.phone.startsWith('0779294315'));
    const lead9477 = leads.find(l => l.phone.startsWith('94779294315'));

    if (lead077 && lead9477) {
        console.log(`Found 077 format lead: ID ${lead077.id}, Phone: ${lead077.phone}`);
        console.log(`Found 9477 format lead: ID ${lead9477.id}, Phone: ${lead9477.phone}`);

        console.log(`Deleting 077 format lead (ID: ${lead077.id})...`);
        await prisma.lead.delete({
            where: { id: lead077.id }
        });
        console.log("✅ Successfully deleted the 077 format lead.");
    } else {
        console.log("Could not find both formats. Aborting.");
        console.log("Current matching leads:");
        leads.forEach(l => console.log(`ID: ${l.id}, Phone: ${l.phone}`));
    }
}

deleteDuplicateLead()
    .catch(e => console.error(e))
    .finally(() => prisma.$disconnect());
