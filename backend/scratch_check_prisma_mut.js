const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const leads = await prisma.lead.findMany({ take: 1 });
    leads[0].testProperty = "HELLO WORLD";
    
    const mappedLeads = leads.map(l => {
        return {
            ...l,
            additional: "TEST"
        };
    });
    console.log(mappedLeads[0].testProperty);
}
main().finally(() => prisma.$disconnect());
